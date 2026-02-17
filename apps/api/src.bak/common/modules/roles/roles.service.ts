import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

// ── Permissions catalog organized by module ──
const PERMISSIONS_CATALOG = [
  {
    module: 'dashboard',
    label: 'Dashboard',
    icon: 'BarChart3',
    permissions: [
      { key: 'dashboard.view', label: 'Ver dashboard' },
      { key: 'dashboard.export', label: 'Exportar datos' },
    ],
  },
  {
    module: 'pos',
    label: 'Punto de Venta',
    icon: 'ShoppingCart',
    permissions: [
      { key: 'pos.view', label: 'Ver POS' },
      { key: 'pos.create', label: 'Crear órdenes' },
      { key: 'pos.edit', label: 'Editar órdenes' },
      { key: 'pos.void', label: 'Anular ítems' },
      { key: 'pos.cancel', label: 'Cancelar órdenes' },
      { key: 'pos.discount', label: 'Aplicar descuentos' },
      { key: 'pos.payment', label: 'Procesar pagos' },
    ],
  },
  {
    module: 'tables',
    label: 'Mesas',
    icon: 'Utensils',
    permissions: [
      { key: 'tables.view', label: 'Ver mesas' },
      { key: 'tables.update', label: 'Cambiar estado' },
      { key: 'tables.transfer', label: 'Transferir mesas' },
      { key: 'tables.merge', label: 'Unir mesas' },
    ],
  },
  {
    module: 'kitchen',
    label: 'Cocina',
    icon: 'ChefHat',
    permissions: [
      { key: 'kitchen.view', label: 'Ver pantalla cocina' },
      { key: 'kitchen.update', label: 'Actualizar estados' },
      { key: 'kitchen.bump', label: 'Completar órdenes' },
    ],
  },
  {
    module: 'shifts',
    label: 'Caja / Turnos',
    icon: 'CreditCard',
    permissions: [
      { key: 'shifts.view', label: 'Ver turnos' },
      { key: 'shifts.open', label: 'Abrir caja' },
      { key: 'shifts.close', label: 'Cerrar caja' },
    ],
  },
  {
    module: 'inventory',
    label: 'Inventario',
    icon: 'Package',
    permissions: [
      { key: 'inventory.view', label: 'Ver inventario' },
      { key: 'inventory.adjust', label: 'Ajustar stock' },
      { key: 'inventory.create', label: 'Crear productos' },
      { key: 'inventory.edit', label: 'Editar productos' },
      { key: 'inventory.delete', label: 'Eliminar productos' },
    ],
  },
  {
    module: 'invoices',
    label: 'Facturas',
    icon: 'FileText',
    permissions: [
      { key: 'invoices.view', label: 'Ver facturas' },
      { key: 'invoices.create', label: 'Crear facturas' },
      { key: 'invoices.void', label: 'Anular facturas' },
    ],
  },
  {
    module: 'customers',
    label: 'Clientes',
    icon: 'User',
    permissions: [
      { key: 'customers.view', label: 'Ver clientes' },
      { key: 'customers.create', label: 'Crear clientes' },
      { key: 'customers.edit', label: 'Editar clientes' },
      { key: 'customers.delete', label: 'Eliminar clientes' },
    ],
  },
  {
    module: 'recipes',
    label: 'Recetas',
    icon: 'ChefHat',
    permissions: [
      { key: 'recipes.view', label: 'Ver recetas' },
      { key: 'recipes.manage', label: 'Gestionar recetas' },
    ],
  },
  {
    module: 'suppliers',
    label: 'Proveedores',
    icon: 'Truck',
    permissions: [
      { key: 'suppliers.view', label: 'Ver proveedores' },
      { key: 'suppliers.manage', label: 'Gestionar proveedores' },
    ],
  },
  {
    module: 'promotions',
    label: 'Promociones',
    icon: 'Tag',
    permissions: [
      { key: 'promotions.view', label: 'Ver promociones' },
      { key: 'promotions.manage', label: 'Gestionar promociones' },
    ],
  },
  {
    module: 'reservations',
    label: 'Reservas',
    icon: 'Calendar',
    permissions: [
      { key: 'reservations.view', label: 'Ver reservas' },
      { key: 'reservations.manage', label: 'Gestionar reservas' },
    ],
  },
  {
    module: 'delivery',
    label: 'Delivery',
    icon: 'Truck',
    permissions: [
      { key: 'delivery.view', label: 'Ver pedidos' },
      { key: 'delivery.manage', label: 'Gestionar delivery' },
    ],
  },
  {
    module: 'loyalty',
    label: 'Fidelidad',
    icon: 'Star',
    permissions: [
      { key: 'loyalty.view', label: 'Ver programa' },
      { key: 'loyalty.manage', label: 'Gestionar fidelidad' },
    ],
  },
  {
    module: 'credit',
    label: 'Crédito',
    icon: 'Wallet',
    permissions: [
      { key: 'credit.view', label: 'Ver cuentas' },
      { key: 'credit.manage', label: 'Gestionar crédito' },
      { key: 'credit.payment', label: 'Registrar abonos' },
    ],
  },
  {
    module: 'staff',
    label: 'Personal',
    icon: 'Users',
    permissions: [
      { key: 'staff.view', label: 'Ver personal' },
      { key: 'staff.manage', label: 'Gestionar personal' },
    ],
  },
  {
    module: 'reports',
    label: 'Reportes',
    icon: 'BarChart3',
    permissions: [
      { key: 'reports.view', label: 'Ver reportes' },
      { key: 'reports.export', label: 'Exportar reportes' },
    ],
  },
  {
    module: 'sri',
    label: 'SRI',
    icon: 'Zap',
    permissions: [
      { key: 'sri.view', label: 'Ver configuración SRI' },
      { key: 'sri.manage', label: 'Gestionar SRI' },
      { key: 'sri.send', label: 'Enviar documentos' },
    ],
  },
  {
    module: 'audit',
    label: 'Auditoría',
    icon: 'Shield',
    permissions: [
      { key: 'audit.view', label: 'Ver logs' },
    ],
  },
  {
    module: 'settings',
    label: 'Configuración',
    icon: 'Settings',
    permissions: [
      { key: 'settings.view', label: 'Ver configuración' },
      { key: 'settings.manage', label: 'Cambiar configuración' },
      { key: 'settings.roles', label: 'Gestionar roles' },
    ],
  },
];

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  getPermissionsCatalog() {
    return PERMISSIONS_CATALOG;
  }

  async list(tenantId: string) {
    const roles = await this.prisma.$queryRaw<any[]>`
      SELECT r.*,
        (SELECT COUNT(*)::int FROM users u WHERE u.role_id = r.id AND u.is_active = true) as user_count
      FROM roles r
      WHERE r.tenant_id = ${tenantId}::uuid
      ORDER BY r.is_system DESC, r.name ASC
    `;
    return roles;
  }

  async getById(tenantId: string, id: string) {
    const roles = await this.prisma.$queryRaw<any[]>`
      SELECT r.* FROM roles r
      WHERE r.id = ${id}::uuid AND r.tenant_id = ${tenantId}::uuid
    `;
    if (!roles.length) throw new NotFoundException('Rol no encontrado');

    const users = await this.prisma.$queryRaw<any[]>`
      SELECT id, first_name, last_name, email, is_active, last_login_at
      FROM users WHERE role_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      ORDER BY first_name
    `;

    return { ...roles[0], users };
  }

  async create(tenantId: string, dto: { name: string; description?: string; color?: string; permissions: string[] }) {
    // Generate slug
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check for duplicate
    const existing = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM roles WHERE tenant_id = ${tenantId}::uuid AND slug = ${slug}
    `;
    if (existing.length) throw new BadRequestException('Ya existe un rol con ese nombre');

    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO roles (tenant_id, name, slug, description, color, permissions, is_system)
      VALUES (${tenantId}::uuid, ${dto.name}, ${slug}, ${dto.description || null}, ${dto.color || '#6b7280'}, ${JSON.stringify(dto.permissions)}::jsonb, false)
      RETURNING *
    `;

    return result[0];
  }

  async update(tenantId: string, id: string, dto: { name?: string; description?: string; color?: string; permissions?: string[] }) {
    // Check exists
    const roles = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM roles WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    if (!roles.length) throw new NotFoundException('Rol no encontrado');

    // Cannot rename system owner role
    if (roles[0].slug === 'owner' && dto.name) {
      throw new BadRequestException('No se puede renombrar el rol de Dueño');
    }

    const sets: string[] = [`updated_at = now()`];
    if (dto.name) sets.push(`name = '${dto.name.replace(/'/g, "''")}'`);
    if (dto.description !== undefined) sets.push(`description = '${(dto.description || '').replace(/'/g, "''")}'`);
    if (dto.color) sets.push(`color = '${dto.color}'`);
    if (dto.permissions) sets.push(`permissions = '${JSON.stringify(dto.permissions)}'::jsonb`);

    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      UPDATE roles SET ${sets.join(', ')}
      WHERE id = '${id}' AND tenant_id = '${tenantId}'
      RETURNING *
    `);

    return result[0];
  }

  async delete(tenantId: string, id: string) {
    const roles = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM roles WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    if (!roles.length) throw new NotFoundException('Rol no encontrado');
    if (roles[0].is_system) throw new BadRequestException('No se pueden eliminar roles del sistema');

    // Check if users are assigned
    const users = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int as count FROM users WHERE role_id = ${id}::uuid
    `;
    if (users[0].count > 0) {
      throw new BadRequestException(`No se puede eliminar: ${users[0].count} usuario(s) tienen este rol asignado`);
    }

    await this.prisma.$queryRaw`DELETE FROM roles WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
    return { deleted: true };
  }

  async duplicate(tenantId: string, id: string) {
    const roles = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM roles WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    if (!roles.length) throw new NotFoundException('Rol no encontrado');

    const original = roles[0];
    return this.create(tenantId, {
      name: `${original.name} (copia)`,
      description: original.description,
      color: original.color,
      permissions: original.permissions,
    });
  }
}
