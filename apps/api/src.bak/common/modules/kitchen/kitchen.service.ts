import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';

@Injectable()
export class KitchenService {
  constructor(
    private prisma: PrismaService,
    private wsGateway: PosEventsGateway,
  ) {}

  /**
   * Get all active kitchen orders grouped by station.
   * This is the main KDS query — called frequently.
   */
  async getKitchenOrders(tenantId: string, station?: string) {
    const whereStation = station ? `AND ko.kitchen_station = '${station}'` : '';

    const orders: any[] = await this.prisma.$queryRaw`
      SELECT 
        ko.id,
        ko.order_item_id,
        ko.order_id,
        ko.kitchen_station,
        ko.status,
        ko.priority,
        ko.seat_number,
        ko.notes as kitchen_notes,
        ko.fired_at,
        ko.ready_at,
        ko.created_at,
        oi.quantity,
        oi.notes as item_notes,
        oi.modifiers,
        p.name as product_name,
        p.attributes as product_attributes,
        o.order_number,
        o.type as order_type,
        o.metadata as order_metadata,
        EXTRACT(EPOCH FROM (NOW() - ko.created_at))::int as elapsed_seconds
      FROM kitchen_orders ko
      JOIN order_items oi ON oi.id = ko.order_item_id
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = ko.order_id
      WHERE ko.tenant_id = ${tenantId}::uuid
        AND ko.status IN ('pending', 'preparing')
      ORDER BY ko.priority DESC, ko.created_at ASC
    `;

    // Group by order
    const grouped = new Map<string, any>();
    for (const row of orders) {
      const key = row.order_id;
      if (!grouped.has(key)) {
        grouped.set(key, {
          orderId: row.order_id,
          orderNumber: row.order_number,
          orderType: row.order_type,
          tableNumber: row.order_metadata?.table_id ? await this.getTableNumber(tenantId, row.order_metadata.table_id) : null,
          guestCount: row.order_metadata?.guest_count || null,
          items: [],
          oldestItemSeconds: Infinity,
        });
      }
      const group = grouped.get(key);
      group.items.push({
        id: row.id,
        orderItemId: row.order_item_id,
        productName: row.product_name,
        quantity: parseFloat(row.quantity),
        station: row.kitchen_station,
        status: row.status,
        priority: row.priority,
        seatNumber: row.seat_number,
        kitchenNotes: row.kitchen_notes,
        itemNotes: row.item_notes,
        modifiers: row.modifiers,
        prepTime: row.product_attributes?.prep_time_minutes || null,
        elapsedSeconds: row.elapsed_seconds,
        firedAt: row.fired_at,
        createdAt: row.created_at,
      });
      if (row.elapsed_seconds < group.oldestItemSeconds) {
        group.oldestItemSeconds = row.elapsed_seconds;
      }
    }

    return Array.from(grouped.values());
  }

  /**
   * Send order items to kitchen (called when waiter fires the order)
   */
  async fireOrderToKitchen(tenantId: string, orderId: string) {
    // Get all order items that don't have kitchen_orders yet
    const items: any[] = await this.prisma.$queryRaw`
      SELECT oi.id, oi.product_id, oi.notes, p.attributes
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ${orderId}::uuid
        AND oi.tenant_id = ${tenantId}::uuid
        AND oi.is_void = false
        AND NOT EXISTS (
          SELECT 1 FROM kitchen_orders ko 
          WHERE ko.order_item_id = oi.id AND ko.tenant_id = ${tenantId}::uuid
        )
    `;

    if (items.length === 0) return { sent: 0 };

    const kitchenOrders = items.map((item) => ({
      tenantId,
      orderItemId: item.id,
      orderId,
      kitchenStation: item.attributes?.kitchen_station || 'general',
      status: 'pending',
      priority: 0,
      notes: item.notes || null,
      firedAt: new Date(),
    }));

    // Insert kitchen orders
    for (const ko of kitchenOrders) {
      await this.prisma.$executeRaw`
        INSERT INTO kitchen_orders (tenant_id, order_item_id, order_id, kitchen_station, status, priority, notes, fired_at, created_at)
        VALUES (${ko.tenantId}::uuid, ${ko.orderItemId}::uuid, ${ko.orderId}::uuid, ${ko.kitchenStation}, ${ko.status}, ${ko.priority}, ${ko.notes}, ${ko.firedAt}, NOW())
      `;
    }

    return { sent: kitchenOrders.length, stations: [...new Set(kitchenOrders.map(k => k.kitchenStation))] };
  }

  // NOTE: The controller calls fireOrderToKitchen, and we emit WS from there.
  // For WS emission after fire, we add a wrapper method:
  async fireOrderToKitchenWithNotify(tenantId: string, orderId: string) {
    const result = await this.fireOrderToKitchen(tenantId, orderId);

    if (result.sent > 0) {
      // Get order info for the notification
      const orderInfo: any[] = await this.prisma.$queryRaw`
        SELECT order_number, metadata FROM orders WHERE id = ${orderId}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const order = orderInfo[0];
      const tableNumber = order?.metadata?.table_id
        ? await this.getTableNumber(tenantId, order.metadata.table_id)
        : undefined;

      this.wsGateway.emitKitchenNewOrder(tenantId, {
        orderId,
        orderNumber: order?.order_number || '',
        items: [], // Items are already available from getKitchenOrders
        tableNumber: tableNumber || undefined,
      });
    }

    return result;
  }

  /**
   * Update kitchen order status (preparing, ready, delivered)
   */
  async updateItemStatus(tenantId: string, kitchenOrderId: string, status: string) {
    const readyAt = status === 'ready' ? new Date() : null;
    const deliveredAt = status === 'delivered' ? new Date() : null;

    await this.prisma.$executeRaw`
      UPDATE kitchen_orders 
      SET status = ${status},
          ready_at = COALESCE(${readyAt}, ready_at),
          delivered_at = COALESCE(${deliveredAt}, delivered_at)
      WHERE id = ${kitchenOrderId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    // Emit WS event
    this.wsGateway.emitKitchenItemUpdated(tenantId, {
      kitchenOrderId,
      orderId: '', // Could fetch if needed
      status,
    });

    return { id: kitchenOrderId, status };
  }

  /**
   * Bump entire order (mark all items as ready)
   */
  async bumpOrder(tenantId: string, orderId: string) {
    await this.prisma.$executeRaw`
      UPDATE kitchen_orders 
      SET status = 'ready', ready_at = NOW()
      WHERE order_id = ${orderId}::uuid 
        AND tenant_id = ${tenantId}::uuid
        AND status IN ('pending', 'preparing')
    `;

    // Emit WS event
    this.wsGateway.emitKitchenOrderBumped(tenantId, { orderId });

    return { orderId, status: 'ready' };
  }

  /**
   * Get ready orders (for expeditor/runner view)
   */
  async getReadyOrders(tenantId: string) {
    const orders: any[] = await this.prisma.$queryRaw`
      SELECT 
        ko.id, ko.order_id, ko.order_item_id, ko.kitchen_station,
        ko.ready_at, ko.notes as kitchen_notes,
        oi.quantity, p.name as product_name,
        o.order_number, o.metadata as order_metadata,
        EXTRACT(EPOCH FROM (NOW() - ko.ready_at))::int as waiting_seconds
      FROM kitchen_orders ko
      JOIN order_items oi ON oi.id = ko.order_item_id
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = ko.order_id
      WHERE ko.tenant_id = ${tenantId}::uuid
        AND ko.status = 'ready'
      ORDER BY ko.ready_at ASC
    `;

    // Group by order
    const grouped = new Map<string, any>();
    for (const row of orders) {
      if (!grouped.has(row.order_id)) {
        grouped.set(row.order_id, {
          orderId: row.order_id,
          orderNumber: row.order_number,
          tableNumber: row.order_metadata?.table_id ? await this.getTableNumber(tenantId, row.order_metadata.table_id) : null,
          items: [],
          waitingSeconds: 0,
        });
      }
      const g = grouped.get(row.order_id);
      g.items.push({
        id: row.id,
        productName: row.product_name,
        quantity: parseFloat(row.quantity),
        station: row.kitchen_station,
      });
      g.waitingSeconds = Math.max(g.waitingSeconds, row.waiting_seconds || 0);
    }

    return Array.from(grouped.values());
  }

  /**
   * Get KDS stats
   */
  async getStats(tenantId: string) {
    const stats: any[] = await this.prisma.$queryRaw`
      SELECT 
        kitchen_station,
        status,
        COUNT(*)::int as count
      FROM kitchen_orders
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at > NOW() - INTERVAL '24 hours'
      GROUP BY kitchen_station, status
    `;

    return stats;
  }

  private async getTableNumber(tenantId: string, tableId: string): Promise<string | null> {
    try {
      const tables: any[] = await this.prisma.$queryRaw`
        SELECT number FROM tables WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      return tables[0]?.number || null;
    } catch {
      return null;
    }
  }
}
