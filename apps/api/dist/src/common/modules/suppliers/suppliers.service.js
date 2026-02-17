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
exports.SuppliersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let SuppliersService = class SuppliersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSuppliers(tenantId) {
        const suppliers = await this.prisma.supplier.findMany({
            where: { tenantId },
            include: {
                ingredients: {
                    where: { isActive: true },
                    select: { id: true, name: true, unit: true, costPerUnit: true },
                },
            },
            orderBy: { name: 'asc' },
        });
        return suppliers.map(s => ({
            ...s,
            ingredientCount: s.ingredients.length,
            totalValue: s.ingredients.reduce((sum, i) => sum + parseFloat(i.costPerUnit.toString()), 0),
        }));
    }
    async getSupplier(tenantId, id) {
        const supplier = await this.prisma.supplier.findFirst({
            where: { id, tenantId },
            include: {
                ingredients: {
                    where: { isActive: true },
                    select: { id: true, name: true, unit: true, costPerUnit: true, currentStock: true, minStock: true },
                },
            },
        });
        if (!supplier)
            throw new common_1.NotFoundException('Proveedor no encontrado');
        return supplier;
    }
    async createSupplier(tenantId, dto) {
        return this.prisma.supplier.create({
            data: {
                tenantId,
                name: dto.name,
                contactName: dto.contactName,
                phone: dto.phone,
                email: dto.email,
                taxId: dto.taxId,
                address: dto.address,
            },
        });
    }
    async updateSupplier(tenantId, id, dto) {
        const supplier = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
        if (!supplier)
            throw new common_1.NotFoundException('Proveedor no encontrado');
        return this.prisma.supplier.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.contactName !== undefined && { contactName: dto.contactName }),
                ...(dto.phone !== undefined && { phone: dto.phone }),
                ...(dto.email !== undefined && { email: dto.email }),
                ...(dto.taxId !== undefined && { taxId: dto.taxId }),
                ...(dto.address !== undefined && { address: dto.address }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
        });
    }
    async deleteSupplier(tenantId, id) {
        const supplier = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
        if (!supplier)
            throw new common_1.NotFoundException('Proveedor no encontrado');
        await this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
        await this.prisma.ingredient.updateMany({
            where: { supplierId: id, tenantId },
            data: { supplierId: null },
        });
        return { success: true };
    }
    async linkIngredient(tenantId, supplierId, ingredientId) {
        await this.prisma.ingredient.update({
            where: { id: ingredientId },
            data: { supplierId },
        });
        return { success: true };
    }
    async unlinkIngredient(tenantId, ingredientId) {
        await this.prisma.ingredient.update({
            where: { id: ingredientId },
            data: { supplierId: null },
        });
        return { success: true };
    }
};
exports.SuppliersService = SuppliersService;
exports.SuppliersService = SuppliersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SuppliersService);
//# sourceMappingURL=suppliers.service.js.map