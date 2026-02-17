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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let ProductsService = class ProductsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId, query) {
        const page = query.page || 1;
        const limit = query.limit || 50;
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (query.categoryId && query.categoryId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            where.categoryId = query.categoryId;
        }
        if (query.isActive === 'true')
            where.isActive = true;
        if (query.isActive === 'false')
            where.isActive = false;
        if (query.search && query.search.trim()) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { sku: { contains: query.search, mode: 'insensitive' } },
                { barcode: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        const [data, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                include: {
                    category: { select: { id: true, name: true } },
                    variants: { where: { isActive: true } },
                },
                orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
                skip,
                take: limit,
            }),
            this.prisma.product.count({ where }),
        ]);
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findById(tenantId, id) {
        const product = await this.prisma.product.findFirst({
            where: { id, tenantId },
            include: {
                category: true,
                variants: true,
            },
        });
        if (!product)
            throw new common_1.NotFoundException('Producto no encontrado');
        return product;
    }
    async findByBarcode(tenantId, barcode) {
        const product = await this.prisma.product.findFirst({
            where: { tenantId, barcode, isActive: true },
            include: { category: { select: { id: true, name: true } } },
        });
        if (!product)
            throw new common_1.NotFoundException('Producto no encontrado con ese código');
        return product;
    }
    async create(tenantId, dto) {
        return this.prisma.product.create({
            data: {
                tenantId,
                ...dto,
            },
            include: { category: { select: { id: true, name: true } } },
        });
    }
    async update(tenantId, id, dto) {
        await this.findById(tenantId, id);
        return this.prisma.product.update({
            where: { id },
            data: dto,
            include: { category: { select: { id: true, name: true } } },
        });
    }
    async toggleAvailability(tenantId, id) {
        const product = await this.findById(tenantId, id);
        return this.prisma.product.update({
            where: { id },
            data: { isAvailable: !product.isAvailable },
        });
    }
    async delete(tenantId, id) {
        await this.findById(tenantId, id);
        return this.prisma.product.update({
            where: { id },
            data: { isActive: false },
        });
    }
    async findCategories(tenantId) {
        return this.prisma.productCategory.findMany({
            where: { tenantId, isActive: true },
            include: {
                products: {
                    where: { isActive: true },
                    select: { id: true },
                },
            },
            orderBy: { displayOrder: 'asc' },
        });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map