import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/suppliers.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async getSuppliers(tenantId: string) {
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

  async getSupplier(tenantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        ingredients: {
          where: { isActive: true },
          select: { id: true, name: true, unit: true, costPerUnit: true, currentStock: true, minStock: true },
        },
      },
    });

    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    return supplier;
  }

  async createSupplier(tenantId: string, dto: CreateSupplierDto) {
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

  async updateSupplier(tenantId: string, id: string, dto: UpdateSupplierDto) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');

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

  async deleteSupplier(tenantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');

    // Soft delete
    await this.prisma.supplier.update({ where: { id }, data: { isActive: false } });

    // Unlink ingredients
    await this.prisma.ingredient.updateMany({
      where: { supplierId: id, tenantId },
      data: { supplierId: null },
    });

    return { success: true };
  }

  async linkIngredient(tenantId: string, supplierId: string, ingredientId: string) {
    await this.prisma.ingredient.update({
      where: { id: ingredientId },
      data: { supplierId },
    });
    return { success: true };
  }

  async unlinkIngredient(tenantId: string, ingredientId: string) {
    await this.prisma.ingredient.update({
      where: { id: ingredientId },
      data: { supplierId: null },
    });
    return { success: true };
  }
}
