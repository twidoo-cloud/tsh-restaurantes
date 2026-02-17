import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/products.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: ProductQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    // Only filter by category if it's a valid UUID
    if (query.categoryId && query.categoryId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      where.categoryId = query.categoryId;
    }

    if (query.isActive === 'true') where.isActive = true;
    if (query.isActive === 'false') where.isActive = false;

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

  async findById(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
        variants: true,
      },
    });

    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async findByBarcode(tenantId: string, barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { tenantId, barcode, isActive: true },
      include: { category: { select: { id: true, name: true } } },
    });

    if (!product) throw new NotFoundException('Producto no encontrado con ese código');
    return product;
  }

  async create(tenantId: string, dto: CreateProductDto) {
    const data: any = { tenantId, ...dto };
    if (!data.categoryId) data.categoryId = null;
    return this.prisma.product.create({
      data,
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    await this.findById(tenantId, id);
    const data: any = { ...dto };
    if (data.categoryId === '' || data.categoryId === null) data.categoryId = null;
    return this.prisma.product.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async toggleAvailability(tenantId: string, id: string) {
    const product = await this.findById(tenantId, id);
    return this.prisma.product.update({
      where: { id },
      data: { isAvailable: !product.isAvailable },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    // Soft delete
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ── Categories ──
  async findCategories(tenantId: string) {
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

  async createCategory(tenantId: string, data: { name: string; description?: string; displayOrder?: number; imageUrl?: string }) {
    return this.prisma.productCategory.create({
      data: { tenantId, ...data },
    });
  }

  async updateCategory(tenantId: string, id: string, data: { name?: string; description?: string; displayOrder?: number; imageUrl?: string }) {
    const cat = await this.prisma.productCategory.findFirst({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    return this.prisma.productCategory.update({ where: { id }, data });
  }

  async deleteCategory(tenantId: string, id: string) {
    const cat = await this.prisma.productCategory.findFirst({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    // Move products to uncategorized, then soft-delete
    await this.prisma.product.updateMany({ where: { categoryId: id, tenantId }, data: { categoryId: null } });
    return this.prisma.productCategory.update({ where: { id }, data: { isActive: false } });
  }
}
