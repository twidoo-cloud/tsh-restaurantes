import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async getMenuBySlug(slug: string) {
    // Get tenant by slug
    const tenants = await this.prisma.tenant.findMany({ where: { slug } });
    if (!tenants.length) throw new NotFoundException('Restaurante no encontrado');
    const tenant = tenants[0];

    const branding = null;

    // Get categories with products
    const categories = await this.prisma.productCategory.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    const products = await this.prisma.product.findMany({
      where: { tenantId: tenant.id, isActive: true, isAvailable: true },
      orderBy: { displayOrder: 'asc' },
    });

    // Group products by category
    const menu = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      imageUrl: cat.imageUrl,
      products: products
        .filter(p => p.categoryId === cat.id)
        .map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          imageUrl: p.imageUrl,
          tags: p.tags,
          attributes: p.attributes,
        })),
    })).filter(c => c.products.length > 0);

    // Uncategorized
    const uncategorized = products.filter(p => !p.categoryId);
    if (uncategorized.length > 0) {
      menu.push({
        id: 'other',
        name: 'Otros',
        description: null,
        imageUrl: null,
        products: uncategorized.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          imageUrl: p.imageUrl,
          tags: p.tags,
          attributes: p.attributes,
        })),
      });
    }

    return {
      restaurant: {
        name: tenant.name,
        slug: tenant.slug,
        currencyCode: tenant.currencyCode,
      },
      branding,
      menu,
      updatedAt: new Date().toISOString(),
    };
  }

  async getQrConfig(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const tables: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT t.id, t.number, t.capacity, z.name as zone_name
      FROM tables t JOIN zones z ON z.id = t.zone_id
      WHERE t.tenant_id = '${tenantId}'::uuid AND t.is_active = true
      ORDER BY t.number
    `);

    return {
      slug: tenant.slug,
      menuUrl: `/menu/${tenant.slug}`,
      tables: tables.map(t => ({
        ...t,
        qrUrl: `/menu/${tenant.slug}?table=${t.number}`,
      })),
    };
  }
}