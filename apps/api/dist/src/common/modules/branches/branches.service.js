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
exports.BranchesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let BranchesService = class BranchesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId) {
        return this.prisma.branch.findMany({
            where: { tenantId },
            orderBy: [{ isMain: 'desc' }, { code: 'asc' }],
        });
    }
    async findOne(tenantId, id) {
        const branch = await this.prisma.branch.findFirst({ where: { id, tenantId } });
        if (!branch)
            throw new common_1.NotFoundException('Sucursal no encontrada');
        return branch;
    }
    async create(tenantId, data) {
        if (!data.code) {
            const count = await this.prisma.branch.count({ where: { tenantId } });
            data.code = String(count + 1).padStart(3, '0');
        }
        const existing = await this.prisma.branch.findFirst({
            where: { tenantId, code: data.code },
        });
        if (existing)
            throw new common_1.BadRequestException(`Ya existe una sucursal con código ${data.code}`);
        const isFirst = (await this.prisma.branch.count({ where: { tenantId } })) === 0;
        return this.prisma.branch.create({
            data: {
                tenantId,
                name: data.name,
                code: data.code,
                address: data.address || {},
                phone: data.phone,
                email: data.email,
                establecimientoSri: data.establecimientoSri || data.code,
                puntoEmisionSri: data.puntoEmisionSri || '001',
                isMain: isFirst,
                settings: data.settings || {},
            },
        });
    }
    async update(tenantId, id, data) {
        const branch = await this.prisma.branch.findFirst({ where: { id, tenantId } });
        if (!branch)
            throw new common_1.NotFoundException('Sucursal no encontrada');
        if (data.code && data.code !== branch.code) {
            const dup = await this.prisma.branch.findFirst({
                where: { tenantId, code: data.code, id: { not: id } },
            });
            if (dup)
                throw new common_1.BadRequestException(`Ya existe una sucursal con código ${data.code}`);
        }
        return this.prisma.branch.update({
            where: { id },
            data: {
                name: data.name,
                code: data.code,
                address: data.address,
                phone: data.phone,
                email: data.email,
                establecimientoSri: data.establecimientoSri,
                puntoEmisionSri: data.puntoEmisionSri,
                isActive: data.isActive,
                settings: data.settings,
            },
        });
    }
    async setMain(tenantId, id) {
        const branch = await this.prisma.branch.findFirst({ where: { id, tenantId } });
        if (!branch)
            throw new common_1.NotFoundException('Sucursal no encontrada');
        await this.prisma.branch.updateMany({ where: { tenantId }, data: { isMain: false } });
        return this.prisma.branch.update({ where: { id }, data: { isMain: true } });
    }
    async delete(tenantId, id) {
        const branch = await this.prisma.branch.findFirst({ where: { id, tenantId } });
        if (!branch)
            throw new common_1.NotFoundException('Sucursal no encontrada');
        if (branch.isMain)
            throw new common_1.BadRequestException('No se puede eliminar la sucursal principal');
        const ordersCount = await this.prisma.order.count({ where: { branchId: id } });
        if (ordersCount > 0) {
            return this.prisma.branch.update({ where: { id }, data: { isActive: false } });
        }
        return this.prisma.branch.delete({ where: { id } });
    }
    async getStats(tenantId, branchId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [ordersToday, salesTotal, openOrders, activeStaff] = await Promise.all([
            this.prisma.order.count({ where: { branchId, createdAt: { gte: today } } }),
            this.prisma.order.aggregate({
                where: { branchId, status: 'completed', createdAt: { gte: today } },
                _sum: { total: true },
            }),
            this.prisma.order.count({ where: { branchId, status: 'open' } }),
            this.prisma.user.count({ where: { tenantId, defaultBranchId: branchId, isActive: true } }),
        ]);
        return {
            ordersToday,
            salesToday: salesTotal._sum.total || 0,
            openOrders,
            activeStaff,
        };
    }
};
exports.BranchesService = BranchesService;
exports.BranchesService = BranchesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BranchesService);
//# sourceMappingURL=branches.service.js.map