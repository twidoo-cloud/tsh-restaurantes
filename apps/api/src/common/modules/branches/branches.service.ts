import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.branch.findMany({
      where: { tenantId },
      orderBy: [{ isMain: 'desc' }, { code: 'asc' }],
    });
  }

  async findOne(tenantId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({ where: { id, tenantId } });
    if (!branch) throw new NotFoundException('Sucursal no encontrada');
    return branch;
  }

  async create(tenantId: string, data: {
    name: string; code?: string; address?: any; phone?: string; email?: string;
    establecimientoSri?: string; puntoEmisionSri?: string; settings?: any;
  }) {
    // Auto-generate code if not provided
    if (!data.code) {
      const count = await this.prisma.branch.count({ where: { tenantId } });
      data.code = String(count + 1).padStart(3, '0');
    }

    // Check unique code
    const existing = await this.prisma.branch.findFirst({
      where: { tenantId, code: data.code },
    });
    if (existing) throw new BadRequestException(`Ya existe una sucursal con código ${data.code}`);

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

  async update(tenantId: string, id: string, data: {
    name?: string; code?: string; address?: any; phone?: string; email?: string;
    establecimientoSri?: string; puntoEmisionSri?: string; isActive?: boolean; settings?: any;
  }) {
    const branch = await this.prisma.branch.findFirst({ where: { id, tenantId } });
    if (!branch) throw new NotFoundException('Sucursal no encontrada');

    if (data.code && data.code !== branch.code) {
      const dup = await this.prisma.branch.findFirst({
        where: { tenantId, code: data.code, id: { not: id } },
      });
      if (dup) throw new BadRequestException(`Ya existe una sucursal con código ${data.code}`);
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

  async setMain(tenantId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({ where: { id, tenantId } });
    if (!branch) throw new NotFoundException('Sucursal no encontrada');

    // Unset all, then set this one
    await this.prisma.branch.updateMany({ where: { tenantId }, data: { isMain: false } });
    return this.prisma.branch.update({ where: { id }, data: { isMain: true } });
  }

  async delete(tenantId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({ where: { id, tenantId } });
    if (!branch) throw new NotFoundException('Sucursal no encontrada');
    if (branch.isMain) throw new BadRequestException('No se puede eliminar la sucursal principal');

    // Check if branch has orders
    const ordersCount = await this.prisma.order.count({ where: { branchId: id } });
    if (ordersCount > 0) {
      // Soft delete: just deactivate
      return this.prisma.branch.update({ where: { id }, data: { isActive: false } });
    }

    return this.prisma.branch.delete({ where: { id } });
  }

  async getStats(tenantId: string, branchId: string) {
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
}
