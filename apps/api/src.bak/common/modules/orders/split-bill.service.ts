import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
import { Decimal } from '@prisma/client/runtime/library';
import {
  CreateEqualSplitDto,
  CreateItemSplitDto,
  CreateCustomSplitDto,
  ProcessSplitPaymentDto,
} from './dto/split-bill.dto';

@Injectable()
export class SplitBillService {
  constructor(
    private prisma: PrismaService,
    private wsGateway: PosEventsGateway,
  ) {}

  // ═══════════════════════════════════════
  // GET SPLITS FOR AN ORDER
  // ═══════════════════════════════════════

  async getSplits(tenantId: string, orderId: string) {
    const order = await this.getOrderOrFail(tenantId, orderId);

    const splits = await this.prisma.orderSplit.findMany({
      where: { orderId, tenantId },
      include: {
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderTotal: order.total,
      splitCount: splits.length,
      allPaid: splits.length > 0 && splits.every(s => s.status === 'paid'),
      splits: splits.map(s => ({
        ...s,
        amount: parseFloat(s.amount.toString()),
        taxAmount: parseFloat(s.taxAmount.toString()),
        total: parseFloat(s.total.toString()),
        paidAmount: parseFloat(s.paidAmount.toString()),
        remaining: parseFloat(new Decimal(s.total.toString()).sub(new Decimal(s.paidAmount.toString())).toString()),
      })),
    };
  }

  // ═══════════════════════════════════════
  // SPLIT EQUALLY
  // ═══════════════════════════════════════

  async splitEqual(tenantId: string, orderId: string, dto: CreateEqualSplitDto) {
    const order = await this.getOrderOrFail(tenantId, orderId);
    this.validateOrderForSplit(order);

    // Remove existing splits first
    await this.removeSplits(tenantId, orderId);

    const total = new Decimal(order.total.toString());
    const tax = new Decimal(order.taxAmount.toString());
    const subtotal = new Decimal(order.subtotal.toString());
    const n = dto.numberOfGuests;

    // Calculate per-person amounts (last person gets the rounding remainder)
    const perPersonTotal = total.div(n).toDecimalPlaces(2, Decimal.ROUND_DOWN);
    const perPersonTax = tax.div(n).toDecimalPlaces(2, Decimal.ROUND_DOWN);
    const perPersonSubtotal = subtotal.div(n).toDecimalPlaces(2, Decimal.ROUND_DOWN);

    const splits = [];
    for (let i = 0; i < n; i++) {
      const isLast = i === n - 1;
      const splitTotal = isLast ? total.sub(perPersonTotal.mul(n - 1)) : perPersonTotal;
      const splitTax = isLast ? tax.sub(perPersonTax.mul(n - 1)) : perPersonTax;
      const splitAmount = isLast ? subtotal.sub(perPersonSubtotal.mul(n - 1)) : perPersonSubtotal;

      const label = dto.guestNames?.[i] || `Persona ${i + 1}`;

      splits.push(
        this.prisma.orderSplit.create({
          data: {
            tenantId,
            orderId,
            label,
            splitType: 'equal',
            amount: splitAmount,
            taxAmount: splitTax,
            total: splitTotal,
            status: 'pending',
            paidAmount: 0,
            metadata: { guestIndex: i },
          },
        }),
      );
    }

    const created = await this.prisma.$transaction(splits);

    // Emit WebSocket event
    this.wsGateway.emitToTenant(tenantId, 'order:split-created', {
      orderId,
      orderNumber: order.orderNumber,
      splitType: 'equal',
      splitCount: n,
    });

    return this.getSplits(tenantId, orderId);
  }

  // ═══════════════════════════════════════
  // SPLIT BY ITEMS
  // ═══════════════════════════════════════

  async splitByItems(tenantId: string, orderId: string, dto: CreateItemSplitDto) {
    const order = await this.getOrderOrFail(tenantId, orderId);
    this.validateOrderForSplit(order);

    // Validate all item IDs exist in order
    const orderItems = order.items.filter((i: any) => !i.isVoid);
    const validItemIds = new Set(orderItems.map((i: any) => i.id));

    for (const assignment of dto.assignments) {
      for (const itemId of assignment.itemIds) {
        if (!validItemIds.has(itemId)) {
          throw new BadRequestException(`Item ${itemId} no pertenece a esta orden`);
        }
      }
    }

    // Check no item is assigned twice
    const allAssigned = dto.assignments.flatMap(a => a.itemIds);
    const uniqueAssigned = new Set(allAssigned);
    if (allAssigned.length !== uniqueAssigned.size) {
      throw new BadRequestException('Un item no puede asignarse a más de una persona');
    }

    // Remove existing splits
    await this.removeSplits(tenantId, orderId);

    const n = dto.numberOfGuests;
    const itemMap = new Map(orderItems.map((i: any) => [i.id, i]));

    // Calculate shared items (not assigned to anyone) — split equally
    const assignedItemIds = new Set(allAssigned);
    const sharedItems = orderItems.filter((i: any) => !assignedItemIds.has(i.id));
    const sharedTotal = sharedItems.reduce(
      (sum: Decimal, i: any) => sum.add(new Decimal(i.subtotal.toString())).add(new Decimal(i.taxAmount.toString())),
      new Decimal(0),
    );
    const sharedPerPerson = n > 0 ? sharedTotal.div(n).toDecimalPlaces(2, Decimal.ROUND_DOWN) : new Decimal(0);

    const splits = [];
    for (let i = 0; i < n; i++) {
      const isLast = i === n - 1;
      const assignment = dto.assignments.find(a => a.guestIndex === i);
      const guestItemIds = assignment?.itemIds || [];
      const guestItems = guestItemIds.map(id => itemMap.get(id)).filter(Boolean);

      // Sum up this guest's items
      let guestSubtotal = new Decimal(0);
      let guestTax = new Decimal(0);

      for (const item of guestItems) {
        guestSubtotal = guestSubtotal.add(new Decimal(item.subtotal.toString()));
        guestTax = guestTax.add(new Decimal(item.taxAmount.toString()));
      }

      // Add shared portion
      const sharedPortion = isLast
        ? sharedTotal.sub(sharedPerPerson.mul(n - 1))
        : sharedPerPerson;

      const splitTotal = guestSubtotal.add(guestTax).add(sharedPortion);
      const label = dto.guestNames?.[i] || `Persona ${i + 1}`;

      splits.push(
        this.prisma.orderSplit.create({
          data: {
            tenantId,
            orderId,
            label,
            splitType: 'by_items',
            amount: guestSubtotal,
            taxAmount: guestTax,
            total: splitTotal,
            status: 'pending',
            paidAmount: 0,
            metadata: {
              guestIndex: i,
              itemIds: guestItemIds,
              sharedPortion: sharedPortion.toNumber(),
            },
          },
        }),
      );
    }

    await this.prisma.$transaction(splits);

    this.wsGateway.emitToTenant(tenantId, 'order:split-created', {
      orderId,
      orderNumber: order.orderNumber,
      splitType: 'by_items',
      splitCount: n,
    });

    return this.getSplits(tenantId, orderId);
  }

  // ═══════════════════════════════════════
  // SPLIT CUSTOM AMOUNTS
  // ═══════════════════════════════════════

  async splitCustom(tenantId: string, orderId: string, dto: CreateCustomSplitDto) {
    const order = await this.getOrderOrFail(tenantId, orderId);
    this.validateOrderForSplit(order);

    // Validate total matches
    const orderTotal = new Decimal(order.total.toString());
    const guestTotal = dto.guests.reduce(
      (sum, g) => sum.add(new Decimal(g.amount.toString())),
      new Decimal(0),
    );

    // Allow small rounding tolerance
    if (guestTotal.sub(orderTotal).abs().gt(new Decimal('0.02'))) {
      throw new BadRequestException(
        `La suma de los montos (${guestTotal}) no coincide con el total de la orden (${orderTotal})`,
      );
    }

    // Remove existing splits
    await this.removeSplits(tenantId, orderId);

    const n = dto.guests.length;
    const taxRatio = new Decimal(order.taxAmount.toString()).div(orderTotal);

    const splits = dto.guests.map((guest, i) => {
      const splitTotal = new Decimal(guest.amount.toString());
      const splitTax = splitTotal.mul(taxRatio).toDecimalPlaces(2);
      const splitAmount = splitTotal.sub(splitTax);
      const label = guest.name || `Persona ${i + 1}`;

      return this.prisma.orderSplit.create({
        data: {
          tenantId,
          orderId,
          label,
          splitType: 'custom_amount',
          amount: splitAmount,
          taxAmount: splitTax,
          total: splitTotal,
          status: 'pending',
          paidAmount: 0,
          metadata: { guestIndex: i },
        },
      });
    });

    await this.prisma.$transaction(splits);

    this.wsGateway.emitToTenant(tenantId, 'order:split-created', {
      orderId,
      orderNumber: order.orderNumber,
      splitType: 'custom_amount',
      splitCount: n,
    });

    return this.getSplits(tenantId, orderId);
  }

  // ═══════════════════════════════════════
  // PROCESS PAYMENT FOR A SPLIT
  // ═══════════════════════════════════════

  async processSplitPayment(
    tenantId: string,
    orderId: string,
    splitId: string,
    userId: string,
    dto: ProcessSplitPaymentDto,
  ) {
    const split = await this.prisma.orderSplit.findFirst({
      where: { id: splitId, orderId, tenantId },
      include: { payments: true },
    });

    if (!split) throw new NotFoundException('Split no encontrado');
    if (split.status === 'paid') throw new BadRequestException('Este split ya está pagado');

    const remaining = new Decimal(split.total.toString()).sub(new Decimal(split.paidAmount.toString()));
    const paymentAmount = new Decimal(dto.amount.toString());

    if (paymentAmount.gt(remaining.add(new Decimal('0.01')))) {
      throw new BadRequestException(`Monto excede el saldo pendiente del split (${remaining})`);
    }

    // Create payment linked to split
    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        orderId,
        splitId,
        method: dto.method,
        amount: paymentAmount,
        currencyCode: dto.currencyCode || 'USD',
        reference: dto.reference || null,
        processedBy: userId,
        cashReceived: dto.cashReceived ? new Decimal(dto.cashReceived.toString()) : null,
        changeGiven: dto.cashReceived
          ? new Decimal(dto.cashReceived.toString()).sub(paymentAmount).greaterThan(0)
            ? new Decimal(dto.cashReceived.toString()).sub(paymentAmount)
            : new Decimal(0)
          : null,
      },
    });

    // Update split paid amount & status
    const newPaidAmount = new Decimal(split.paidAmount.toString()).add(paymentAmount);
    const splitTotal = new Decimal(split.total.toString());
    const newStatus = newPaidAmount.gte(splitTotal) ? 'paid' : 'partial';

    await this.prisma.orderSplit.update({
      where: { id: splitId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    // Check if ALL splits are now paid → complete the order
    const allSplits = await this.prisma.orderSplit.findMany({
      where: { orderId, tenantId },
    });

    const allPaid = allSplits.every(s =>
      s.id === splitId
        ? newStatus === 'paid'
        : s.status === 'paid',
    );

    if (allPaid) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'completed', closedAt: new Date() },
      });

      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      this.wsGateway.emitOrderPaid(tenantId, {
        orderId,
        orderNumber: order?.orderNumber,
        total: parseFloat(order?.total.toString() || '0'),
        method: 'split',
      });
    }

    // Emit split payment event
    this.wsGateway.emitToTenant(tenantId, 'order:split-paid', {
      orderId,
      splitId,
      splitLabel: split.label,
      amount: paymentAmount.toNumber(),
      method: dto.method,
      splitStatus: newStatus,
      allPaid,
    });

    return {
      payment,
      splitStatus: newStatus,
      splitPaidAmount: newPaidAmount.toNumber(),
      splitRemaining: splitTotal.sub(newPaidAmount).toNumber(),
      allSplitsPaid: allPaid,
      change: payment.changeGiven ? parseFloat(payment.changeGiven.toString()) : 0,
    };
  }

  // ═══════════════════════════════════════
  // REMOVE SPLITS (UNSPLIT)
  // ═══════════════════════════════════════

  async removeSplits(tenantId: string, orderId: string) {
    // Check no split has payments
    const existingSplits = await this.prisma.orderSplit.findMany({
      where: { orderId, tenantId },
      include: { payments: true },
    });

    const hasPaidSplits = existingSplits.some(s => s.payments.length > 0);
    if (hasPaidSplits) {
      throw new BadRequestException('No se puede eliminar la división: ya hay pagos realizados');
    }

    await this.prisma.orderSplit.deleteMany({
      where: { orderId, tenantId },
    });

    this.wsGateway.emitToTenant(tenantId, 'order:split-removed', { orderId });

    return { success: true, message: 'División eliminada' };
  }

  // ═══════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════

  private async getOrderOrFail(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: true,
        payments: true,
        splits: { include: { payments: true } },
      },
    });
    if (!order) throw new NotFoundException('Orden no encontrada');
    return order;
  }

  private validateOrderForSplit(order: any) {
    if (order.status === 'completed') {
      throw new BadRequestException('No se puede dividir una orden completada');
    }
    if (order.status === 'cancelled') {
      throw new BadRequestException('No se puede dividir una orden cancelada');
    }
    if (parseFloat(order.total.toString()) <= 0) {
      throw new BadRequestException('La orden no tiene un total para dividir');
    }
  }
}
