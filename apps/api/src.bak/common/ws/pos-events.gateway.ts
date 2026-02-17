import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Central WebSocket Gateway for real-time POS events.
 * 
 * Clients join a room based on their tenant ID (extracted from JWT).
 * All events are scoped to the tenant room, ensuring multi-tenant isolation.
 * 
 * Events emitted:
 * - kitchen:new-order      → New order fired to kitchen
 * - kitchen:item-updated   → Kitchen item status changed
 * - kitchen:order-bumped   → Entire order bumped (all items ready)
 * - table:status-changed   → Table status changed (opened/closed/reserved)
 * - order:created          → New order created
 * - order:updated          → Order updated (item added, voided, etc.)
 * - order:paid             → Order payment processed
 * - order:cancelled        → Order cancelled
 * - shift:opened           → Shift/cash register opened
 * - shift:closed           → Shift/cash register closed
 */
@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict to specific origins
  },
  namespace: '/pos',
  transports: ['websocket', 'polling'],
})
export class PosEventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('PosEventsGateway');
  private connectedClients = new Map<string, { tenantId: string; userId: string; role: string }>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('🔌 WebSocket Gateway initialized on /pos namespace');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract JWT from handshake auth or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        (client.handshake.query?.token as string);

      if (!token) {
        this.logger.warn(`Client ${client.id} rejected: no token`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET', 'pos-jwt-secret-dev'),
      });

      const tenantId = payload.tenantId;
      const userId = payload.sub;
      const role = payload.role;

      // Store client info
      this.connectedClients.set(client.id, { tenantId, userId, role });

      // Join tenant room for scoped broadcasts
      client.join(`tenant:${tenantId}`);

      // Join role-specific rooms for targeted events
      client.join(`tenant:${tenantId}:role:${role}`);

      this.logger.log(
        `✅ Client ${client.id} connected — tenant: ${tenantId}, user: ${userId}, role: ${role}`,
      );

      // Send connection confirmation
      client.emit('connected', {
        clientId: client.id,
        tenantId,
        userId,
        role,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(`Client ${client.id} rejected: invalid token`);
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const info = this.connectedClients.get(client.id);
    this.connectedClients.delete(client.id);
    this.logger.log(
      `❌ Client ${client.id} disconnected${info ? ` — tenant: ${info.tenantId}` : ''}`,
    );
  }

  /**
   * Allow clients to join additional rooms (e.g., a specific kitchen station)
   */
  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    const info = this.connectedClients.get(client.id);
    if (!info) return;
    // Scope room to tenant
    const scopedRoom = `tenant:${info.tenantId}:${data.room}`;
    client.join(scopedRoom);
    this.logger.debug(`Client ${client.id} joined room: ${scopedRoom}`);
  }

  /**
   * Allow clients to leave custom rooms
   */
  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    const info = this.connectedClients.get(client.id);
    if (!info) return;
    const scopedRoom = `tenant:${info.tenantId}:${data.room}`;
    client.leave(scopedRoom);
  }

  // ═══════════════════════════════════════════════════════
  // PUBLIC METHODS — Called by services to emit events
  // ═══════════════════════════════════════════════════════

  /**
   * Emit event to all clients in a tenant
   */
  emitToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, {
      ...data,
      _ts: new Date().toISOString(),
    });
  }

  /**
   * Emit event to clients with a specific role in a tenant
   */
  emitToRole(tenantId: string, role: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}:role:${role}`).emit(event, {
      ...data,
      _ts: new Date().toISOString(),
    });
  }

  /**
   * Emit event to a specific custom room within a tenant
   */
  emitToRoom(tenantId: string, room: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}:${room}`).emit(event, {
      ...data,
      _ts: new Date().toISOString(),
    });
  }

  // ═══════════════════════════════════════════════════════
  // CONVENIENCE METHODS — Typed event emitters
  // ═══════════════════════════════════════════════════════

  /** Kitchen: new order fired */
  emitKitchenNewOrder(tenantId: string, data: { orderId: string; orderNumber: string; items: any[]; tableNumber?: string }) {
    this.emitToTenant(tenantId, 'kitchen:new-order', data);
  }

  /** Kitchen: item status updated */
  emitKitchenItemUpdated(tenantId: string, data: { kitchenOrderId: string; orderId: string; status: string; productName?: string }) {
    this.emitToTenant(tenantId, 'kitchen:item-updated', data);
  }

  /** Kitchen: entire order bumped */
  emitKitchenOrderBumped(tenantId: string, data: { orderId: string; orderNumber?: string }) {
    this.emitToTenant(tenantId, 'kitchen:order-bumped', data);
  }

  /** Table: status changed */
  emitTableStatusChanged(tenantId: string, data: { tableId: string; tableNumber: string; status: string; orderId?: string }) {
    this.emitToTenant(tenantId, 'table:status-changed', data);
  }

  /** Order: created */
  emitOrderCreated(tenantId: string, data: { orderId: string; orderNumber: string; type: string; tableId?: string }) {
    this.emitToTenant(tenantId, 'order:created', data);
  }

  /** Order: updated (items changed) */
  emitOrderUpdated(tenantId: string, data: { orderId: string; orderNumber?: string; action: string }) {
    this.emitToTenant(tenantId, 'order:updated', data);
  }

  /** Order: paid */
  emitOrderPaid(tenantId: string, data: { orderId: string; orderNumber?: string; total: number; method: string }) {
    this.emitToTenant(tenantId, 'order:paid', data);
  }

  /** Order: cancelled */
  emitOrderCancelled(tenantId: string, data: { orderId: string; orderNumber?: string }) {
    this.emitToTenant(tenantId, 'order:cancelled', data);
  }

  /** Shift: opened */
  emitShiftOpened(tenantId: string, data: { shiftId: string; cashRegisterName: string; openedBy: string; openingAmount: number }) {
    this.emitToTenant(tenantId, 'shift:opened', data);
  }

  /** Shift: closed */
  emitShiftClosed(tenantId: string, data: { shiftId: string; closingAmount: number; difference: number }) {
    this.emitToTenant(tenantId, 'shift:closed', data);
  }

  /**
   * Get count of connected clients for a tenant
   */
  getConnectedCount(tenantId: string): number {
    let count = 0;
    for (const [, info] of this.connectedClients) {
      if (info.tenantId === tenantId) count++;
    }
    return count;
  }
}
