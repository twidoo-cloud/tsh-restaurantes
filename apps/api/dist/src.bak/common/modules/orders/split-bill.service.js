"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SplitBillService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const pos_events_gateway_1 = require("../../ws/pos-events.gateway");
const library_1 = require("@prisma/client/runtime/library");
let SplitBillService = class SplitBillService {
    constructor(prisma, wsGateway) {
        this.prisma = prisma;
        this.wsGateway = wsGateway;
    }
    async getSplits(tenantId, orderId) {
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
                remaining: parseFloat(new library_1.Decimal(s.total.toString()).sub(new library_1.Decimal(s.paidAmount.toString())).toString()),
            })),
        };
    }
    async splitEqual(tenantId, orderId, dto) {
        const order = await this.getOrderOrFail(tenantId, orderId);
        this.validateOrderForSplit(order);
        await this.removeSplits(tenantId, orderId);
        const total = new library_1.Decimal(order.total.toString());
        const tax = new library_1.Decimal(order.taxAmount.toString());
        const subtotal = new library_1.Decimal(order.subtotal.toString());
        const n = dto.numberOfGuests;
        const perPersonTotal = total.div(n).toDecimalPlaces(2, library_1.Decimal.ROUND_DOWN);
        const perPersonTax = tax.div(n).toDecimalPlaces(2, library_1.Decimal.ROUND_DOWN);
        const perPersonSubtotal = subtotal.div(n).toDecimalPlaces(2, library_1.Decimal.ROUND_DOWN);
        const splits = [];
        for (let i = 0; i < n; i++) {
            const isLast = i === n - 1;
            const splitTotal = isLast ? total.sub(perPersonTotal.mul(n - 1)) : perPersonTotal;
            const splitTax = isLast ? tax.sub(perPersonTax.mul(n - 1)) : perPersonTax;
            const splitAmount = isLast ? subtotal.sub(perPersonSubtotal.mul(n - 1)) : perPersonSubtotal;
            const label = dto.guestNames?.[i] || `Persona ${i + 1}`;
            splits.push(this.prisma.orderSplit.create({
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
            }));
        }
        const created = await this.prisma.$transaction(splits);
        this.wsGateway.emitToTenant(tenantId, 'order:split-created', {
            orderId,
            orderNumber: order.orderNumber,
            splitType: 'equal',
            splitCount: n,
        });
        return this.getSplits(tenantId, orderId);
    }
    async splitByItems(tenantId, orderId, dto) {
        const order = await this.getOrderOrFail(tenantId, orderId);
        this.validateOrderForSplit(order);
        const orderItems = order.items.filter((i) => !i.isVoid);
        const validItemIds = new Set(orderItems.map((i) => i.id));
        for (const assignment of dto.assignments) {
            for (const itemId of assignment.itemIds) {
                if (!validItemIds.has(itemId)) {
                    throw new common_1.BadRequestException(`Item ${itemId} no pertenece a esta orden`);
                }
            }
        }
        const allAssigned = dto.assignments.flatMap(a => a.itemIds);
        const uniqueAssigned = new Set(allAssigned);
        if (allAssigned.length !== uniqueAssigned.size) {
            throw new common_1.BadRequestException('Un item no puede asignarse a más de una persona');
        }
        await this.removeSplits(tenantId, orderId);
        const n = dto.numberOfGuests;
        const itemMap = new Map(orderItems.map((i) => [i.id, i]));
        const assignedItemIds = new Set(allAssigned);
        const sharedItems = orderItems.filter((i) => !assignedItemIds.has(i.id));
        const sharedTotal = sharedItems.reduce((sum, i) => sum.add(new library_1.Decimal(i.subtotal.toString())).add(new library_1.Decimal(i.taxAmount.toString())), new library_1.Decimal(0));
        const sharedPerPerson = n > 0 ? sharedTotal.div(n).toDecimalPlaces(2, library_1.Decimal.ROUND_DOWN) : new library_1.Decimal(0);
        const splits = [];
        for (let i = 0; i < n; i++) {
            const isLast = i === n - 1;
            const assignment = dto.assignments.find(a => a.guestIndex === i);
            const guestItemIds = assignment?.itemIds || [];
            const guestItems = guestItemIds.map(id => itemMap.get(id)).filter(Boolean);
            let guestSubtotal = new library_1.Decimal(0);
            let guestTax = new library_1.Decimal(0);
            for (const item of guestItems) {
                guestSubtotal = guestSubtotal.add(new library_1.Decimal(item.subtotal.toString()));
                guestTax = guestTax.add(new library_1.Decimal(item.taxAmount.toString()));
            }
            const sharedPortion = isLast
                ? sharedTotal.sub(sharedPerPerson.mul(n - 1))
                : sharedPerPerson;
            const splitTotal = guestSubtotal.add(guestTax).add(sharedPortion);
            const label = dto.guestNames?.[i] || `Persona ${i + 1}`;
            splits.push(this.prisma.orderSplit.create({
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
            }));
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
    async splitCustom(tenantId, orderId, dto) {
        const order = await this.getOrderOrFail(tenantId, orderId);
        this.validateOrderForSplit(order);
        const orderTotal = new library_1.Decimal(order.total.toString());
        const guestTotal = dto.guests.reduce((sum, g) => sum.add(new library_1.Decimal(g.amount.toString())), new library_1.Decimal(0));
        if (guestTotal.sub(orderTotal).abs().gt(new library_1.Decimal('0.02'))) {
            throw new common_1.BadRequestException(`La suma de los montos (${guestTotal}) no coincide con el total de la orden (${orderTotal})`);
        }
        await this.removeSplits(tenantId, orderId);
        const n = dto.guests.length;
        const taxRatio = new library_1.Decimal(order.taxAmount.toString()).div(orderTotal);
        const splits = dto.guests.map((guest, i) => {
            const splitTotal = new library_1.Decimal(guest.amount.toString());
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
    async processSplitPayment(tenantId, orderId, splitId, userId, dto) {
        const split = await this.prisma.orderSplit.findFirst({
            where: { id: splitId, orderId, tenantId },
            include: { payments: true },
        });
        if (!split)
            throw new common_1.NotFoundException('Split no encontrado');
        if (split.status === 'paid')
            throw new common_1.BadRequestException('Este split ya está pagado');
        const remaining = new library_1.Decimal(split.total.toString()).sub(new library_1.Decimal(split.paidAmount.toString()));
        const paymentAmount = new library_1.Decimal(dto.amount.toString());
        if (paymentAmount.gt(remaining.add(new library_1.Decimal('0.01')))) {
            throw new common_1.BadRequestException(`Monto excede el saldo pendiente del split (${remaining})`);
        }
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
                cashReceived: dto.cashReceived ? new library_1.Decimal(dto.cashReceived.toString()) : null,
                changeGiven: dto.cashReceived
                    ? new library_1.Decimal(dto.cashReceived.toString()).sub(paymentAmount).greaterThan(0)
                        ? new library_1.Decimal(dto.cashReceived.toString()).sub(paymentAmount)
                        : new library_1.Decimal(0)
                    : null,
            },
        });
        const newPaidAmount = new library_1.Decimal(split.paidAmount.toString()).add(paymentAmount);
        const splitTotal = new library_1.Decimal(split.total.toString());
        const newStatus = newPaidAmount.gte(splitTotal) ? 'paid' : 'partial';
        await this.prisma.orderSplit.update({
            where: { id: splitId },
            data: {
                paidAmount: newPaidAmount,
                status: newStatus,
            },
        });
        const allSplits = await this.prisma.orderSplit.findMany({
            where: { orderId, tenantId },
        });
        const allPaid = allSplits.every(s => s.id === splitId
            ? newStatus === 'paid'
            : s.status === 'paid');
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
    async removeSplits(tenantId, orderId) {
        const existingSplits = await this.prisma.orderSplit.findMany({
            where: { orderId, tenantId },
            include: { payments: true },
        });
        const hasPaidSplits = existingSplits.some(s => s.payments.length > 0);
        if (hasPaidSplits) {
            throw new common_1.BadRequestException('No se puede eliminar la división: ya hay pagos realizados');
        }
        await this.prisma.orderSplit.deleteMany({
            where: { orderId, tenantId },
        });
        this.wsGateway.emitToTenant(tenantId, 'order:split-removed', { orderId });
        return { success: true, message: 'División eliminada' };
    }
    async getOrderOrFail(tenantId, orderId) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, tenantId },
            include: {
                items: true,
                payments: true,
                splits: { include: { payments: true } },
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Orden no encontrada');
        return order;
    }
    validateOrderForSplit(order) {
        if (order.status === 'completed') {
            throw new common_1.BadRequestException('No se puede dividir una orden completada');
        }
        if (order.status === 'cancelled') {
            throw new common_1.BadRequestException('No se puede dividir una orden cancelada');
        }
        if (parseFloat(order.total.toString()) <= 0) {
            throw new common_1.BadRequestException('La orden no tiene un total para dividir');
        }
    }
};
exports.SplitBillService = SplitBillService;
exports.SplitBillService = SplitBillService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pos_events_gateway_1.PosEventsGateway])
], SplitBillService);
//# sourceMappingURL=split-bill.service.js.map