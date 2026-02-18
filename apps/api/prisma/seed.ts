/**
 * TSH Restaurantes — Seed Script v2.7.0
 * ══════════════════════════════════════
 * Populates the demo tenant "Cevichería La Costa" with realistic data.
 * 
 * Usage:
 *   npx ts-node prisma/seed.ts
 * 
 * Or add to package.json:
 *   "prisma": { "seed": "ts-node prisma/seed.ts" }
 *   Then: npx prisma db seed
 * 
 * IMPORTANT: This script is IDEMPOTENT — it checks for existing data
 * and only creates what's missing. Safe to run multiple times.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ══════════════════════════════════════
// KNOWN IDs (from existing production data)
// ══════════════════════════════════════
const TENANT_ID = '019c69d0-bb0a-7476-8a8e-6379f8aecada';
const ROLE_OWNER_ID = '019c69d5-b87d-7b4f-b7ba-e93cb48ea552';

// ══════════════════════════════════════
// HELPER
// ══════════════════════════════════════
const log = (emoji: string, msg: string) => console.log(`${emoji}  ${msg}`);

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

// ══════════════════════════════════════
// BOOTSTRAP — Create base data if missing
// ══════════════════════════════════════
async function bootstrap() {
  // Ensure uuid_generate_v7 extension exists
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
  try {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION uuid_generate_v7() RETURNS uuid AS $$
      DECLARE
        unix_ts_ms bytea;
        uuid_bytes bytea;
      BEGIN
        unix_ts_ms = substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
        uuid_bytes = unix_ts_ms || gen_random_bytes(10);
        uuid_bytes = set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
        uuid_bytes = set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
        RETURN encode(uuid_bytes, 'hex')::uuid;
      END
      $$ LANGUAGE plpgsql VOLATILE;
    `);
    log('✅', 'uuid_generate_v7() function ready');
  } catch (e) {
    log('⏭️', 'uuid_generate_v7() already exists');
  }

  // ── Reseller ──
  let reseller = await prisma.reseller.findFirst({ where: { slug: 'twidoo-cloud' } });
  if (!reseller) {
    reseller = await prisma.reseller.create({
      data: {
        name: 'Twidoo Cloud',
        slug: 'twidoo-cloud',
        domain: 'twidoo.cloud',
        countryCode: 'EC',
        contactEmail: 'ventas@twidoo.cloud',
        isActive: true,
        themeConfig: {},
      },
    });
    log('✅', `Reseller creado: ${reseller.name}`);
  } else {
    log('⏭️', `Reseller ya existe: ${reseller.name}`);
  }

  // ── Tenant ──
  let tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    // Maybe exists with different ID (e.g. slug already taken)
    tenant = await prisma.tenant.findFirst({ where: { slug: 'cevicheria-la-costa' } });
  }
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: TENANT_ID,
        resellerId: reseller.id,
        name: 'Cevichería La Costa',
        slug: 'cevicheria-la-costa',
        verticalType: 'restaurant',
        enabledModules: ['core', 'pos', 'kitchen', 'inventory', 'customers', 'reports', 'delivery', 'promotions', 'credit', 'sri', 'reservations', 'loyalty'],
        taxId: '0990000000001',
        countryCode: 'EC',
        currencyCode: 'USD',
        timezone: 'America/Guayaquil',
        address: { street: 'Av. Francisco de Orellana', city: 'Guayaquil', province: 'Guayas' },
        phone: '0982290175',
        settings: {},
        subscriptionPlan: 'premium',
        subscriptionStatus: 'active',
        isActive: true,
      },
    });
    log('✅', `Tenant creado: ${tenant.name}`);
  } else {
    log('⏭️', `Tenant ya existe: ${tenant.name}`);
  }

  // ── Owner Role ──
  let ownerRole = await prisma.role.findFirst({ where: { tenantId: tenant.id, slug: 'owner' } });
  if (!ownerRole) {
    ownerRole = await prisma.role.create({
      data: {
        id: ROLE_OWNER_ID,
        tenantId: tenant.id,
        name: 'Owner',
        slug: 'owner',
        permissions: ['*'],
        isSystem: true,
      },
    });
    log('✅', `Rol Owner creado`);
  } else {
    log('⏭️', `Rol Owner ya existe`);
  }

  // ── Admin User ──
  let adminUser = await prisma.user.findFirst({ where: { tenantId: tenant.id, email: 'admin@cevicheria.com' } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        roleId: ownerRole.id,
        email: 'admin@cevicheria.com',
        passwordHash: await hashPassword('Admin123!'),
        pinHash: await hashPin('1234'),
        firstName: 'Carlos',
        lastName: 'Admin',
        isActive: true,
      },
    });
    log('✅', `Admin creado: admin@cevicheria.com / Admin123!`);
  } else {
    log('⏭️', `Admin ya existe: admin@cevicheria.com`);
  }

  return tenant;
}

// ══════════════════════════════════════
// MAIN SEED
// ══════════════════════════════════════
async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  TSH Restaurantes — Seed Script v2.7.0   ║');
  console.log('║  Tenant: Cevichería La Costa              ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // ── Bootstrap: create base data if missing ──
  const tenant = await bootstrap();
  const T = tenant.id; // actual tenant ID (may differ from hardcoded)
  log('✅', `Tenant: ${tenant.name} (${T})`);

  // ── 1. BRANCH ──
  const branch = await seedBranch(T);

  // ── 2. ROLES ──
  const roles = await seedRoles(T);

  // ── 3. USERS ──
  await seedUsers(T, branch.id, roles);

  // ── 4. CATEGORIES ──
  const categories = await seedCategories(T);

  // ── 5. PRODUCTS ──
  const products = await seedProducts(T, categories);

  // ── 6. ZONES & TABLES ──
  await seedZonesAndTables(T, branch.id);

  // ── 7. CUSTOMERS ──
  await seedCustomers(T);

  // ── 8. SUPPLIERS ──
  const suppliers = await seedSuppliers(T);

  // ── 9. INGREDIENTS ──
  const ingredients = await seedIngredients(T, branch.id, suppliers);

  // ── 10. CASH REGISTER ──
  await seedCashRegister(T, branch.id);

  // ── 11. DELIVERY ZONES ──
  await seedDeliveryZones(T, branch.id);

  // ── 12. PROMOTIONS ──
  await seedPromotions(T, products, categories);

  // ── 13. SRI CONFIG ──
  await seedSriConfig(T);

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  ✅ Seed completado exitosamente          ║');
  console.log('╚══════════════════════════════════════════╝\n');
}

// ══════════════════════════════════════
// 1. BRANCH
// ══════════════════════════════════════
async function seedBranch(T: string) {
  const existing = await prisma.branch.findFirst({ where: { tenantId: T, isMain: true } });
  if (existing) {
    log('⏭️', `Branch ya existe: ${existing.name}`);
    return existing;
  }

  const branch = await prisma.branch.create({
    data: {
      tenantId: T,
      name: 'Sucursal Principal',
      code: '001',
      address: { street: 'Av. Francisco de Orellana', city: 'Guayaquil', province: 'Guayas', reference: 'Frente al Malecón 2000' },
      phone: '0982290175',
      email: 'sucursal1@cevicheria.com',
      establecimientoSri: '001',
      puntoEmisionSri: '001',
      isMain: true,
      isActive: true,
      settings: { kitchenStations: ['cocina-fría', 'cocina-caliente', 'bebidas', 'postres'] },
    },
  });
  log('✅', `Branch creada: ${branch.name}`);
  return branch;
}

// ══════════════════════════════════════
// 2. ROLES
// ══════════════════════════════════════
async function seedRoles(T: string) {
  const roleDefs = [
    {
      slug: 'manager',
      name: 'Gerente',
      permissions: [
        'pos:access', 'pos:discount', 'pos:void',
        'orders:view', 'orders:edit', 'orders:cancel',
        'products:view', 'products:create', 'products:edit',
        'inventory:view', 'inventory:manage',
        'reports:view', 'reports:export',
        'customers:view', 'customers:create', 'customers:edit',
        'staff:view',
        'tables:manage',
        'kitchen:view',
        'shifts:open', 'shifts:close', 'shifts:view',
        'promotions:view', 'promotions:manage',
        'sri:view', 'sri:generate',
        'settings:view',
      ],
    },
    {
      slug: 'cashier',
      name: 'Cajero/a',
      permissions: [
        'pos:access', 'pos:discount',
        'orders:view',
        'products:view',
        'customers:view', 'customers:create',
        'shifts:open', 'shifts:close',
        'sri:generate',
        'tables:view',
      ],
    },
    {
      slug: 'waiter',
      name: 'Mesero/a',
      permissions: [
        'pos:access',
        'orders:view',
        'products:view',
        'customers:view',
        'tables:view',
        'kitchen:view',
      ],
    },
    {
      slug: 'kitchen',
      name: 'Cocina',
      permissions: [
        'kitchen:view', 'kitchen:manage',
        'orders:view',
      ],
    },
  ];

  const roles: Record<string, { id: string }> = {};

  for (const def of roleDefs) {
    const existing = await prisma.role.findFirst({
      where: { tenantId: T, slug: def.slug },
    });
    if (existing) {
      roles[def.slug] = existing;
      continue;
    }
    const role = await prisma.role.create({
      data: {
        tenantId: T,
        name: def.name,
        slug: def.slug,
        permissions: def.permissions,
        isSystem: false,
      },
    });
    roles[def.slug] = role;
    log('✅', `Rol creado: ${def.name}`);
  }

  log('⏭️', `Roles verificados (${Object.keys(roles).length} roles)`);
  return roles;
}

// ══════════════════════════════════════
// 3. USERS
// ══════════════════════════════════════
async function seedUsers(T: string, branchId: string, roles: Record<string, { id: string }>) {
  const userDefs = [
    { email: 'gerente@cevicheria.com', password: 'Gerente123!', pin: '2345', firstName: 'María', lastName: 'González', roleSlug: 'manager' },
    { email: 'cajero@cevicheria.com', password: 'Cajero123!', pin: '3456', firstName: 'Pedro', lastName: 'Ramírez', roleSlug: 'cashier' },
    { email: 'mesero1@cevicheria.com', password: 'Mesero123!', pin: '4567', firstName: 'Luis', lastName: 'Morales', roleSlug: 'waiter' },
    { email: 'mesero2@cevicheria.com', password: 'Mesero123!', pin: '5678', firstName: 'Ana', lastName: 'Suárez', roleSlug: 'waiter' },
    { email: 'cocina@cevicheria.com', password: 'Cocina123!', pin: '6789', firstName: 'José', lastName: 'Cevallos', roleSlug: 'kitchen' },
  ];

  let created = 0;
  for (const u of userDefs) {
    const existing = await prisma.user.findFirst({
      where: { tenantId: T, email: u.email },
    });
    if (existing) continue;

    await prisma.user.create({
      data: {
        tenantId: T,
        roleId: roles[u.roleSlug]?.id || (await prisma.role.findFirst({ where: { tenantId: T, slug: 'owner' } }))?.id || '',
        email: u.email,
        passwordHash: await hashPassword(u.password),
        pinHash: await hashPin(u.pin),
        firstName: u.firstName,
        lastName: u.lastName,
        isActive: true,
        defaultBranchId: branchId,
      },
    });
    created++;
  }
  log(created > 0 ? '✅' : '⏭️', `Usuarios: ${created} creados (${userDefs.length} total)`);
}

// ══════════════════════════════════════
// 4. CATEGORIES
// ══════════════════════════════════════
async function seedCategories(T: string) {
  const catDefs = [
    { name: 'Ceviches', order: 1, icon: '🦐' },
    { name: 'Sopas & Caldos', order: 2, icon: '🍲' },
    { name: 'Arroces & Menestras', order: 3, icon: '🍚' },
    { name: 'Mariscos al Ajillo', order: 4, icon: '🦞' },
    { name: 'Platos Fuertes', order: 5, icon: '🍽️' },
    { name: 'Entradas & Picadas', order: 6, icon: '🥑' },
    { name: 'Bebidas', order: 7, icon: '🥤' },
    { name: 'Cervezas & Licores', order: 8, icon: '🍺' },
    { name: 'Postres', order: 9, icon: '🍮' },
    { name: 'Extras', order: 10, icon: '➕' },
  ];

  const categories: Record<string, string> = {};

  for (const c of catDefs) {
    const existing = await prisma.productCategory.findFirst({
      where: { tenantId: T, name: c.name },
    });
    if (existing) {
      categories[c.name] = existing.id;
      continue;
    }
    const cat = await prisma.productCategory.create({
      data: {
        tenantId: T,
        name: c.name,
        description: c.icon,
        displayOrder: c.order,
        isActive: true,
      },
    });
    categories[c.name] = cat.id;
  }

  log('✅', `Categorías: ${Object.keys(categories).length} verificadas`);
  return categories;
}

// ══════════════════════════════════════
// 5. PRODUCTS
// ══════════════════════════════════════
async function seedProducts(T: string, categories: Record<string, string>) {
  // taxRate: 0.15 = 15% IVA Ecuador (vigente)
  const productDefs: Array<{
    name: string; category: string; price: number; cost?: number;
    taxRate?: number; sku: string; description?: string; tags?: string[];
  }> = [
    // ── Ceviches ──
    { name: 'Ceviche de Camarón', category: 'Ceviches', price: 8.50, cost: 3.20, sku: 'CEV-001', description: 'Ceviche clásico de camarón con canguil y chifles', tags: ['popular', 'mariscos'] },
    { name: 'Ceviche de Pescado', category: 'Ceviches', price: 7.00, cost: 2.50, sku: 'CEV-002', description: 'Ceviche de corvina fresca', tags: ['mariscos'] },
    { name: 'Ceviche de Concha', category: 'Ceviches', price: 12.00, cost: 5.50, sku: 'CEV-003', description: 'Ceviche de concha prieta del manglar', tags: ['premium', 'mariscos'] },
    { name: 'Ceviche Mixto', category: 'Ceviches', price: 10.00, cost: 4.00, sku: 'CEV-004', description: 'Camarón, pescado, concha y calamar', tags: ['popular', 'mariscos'] },
    { name: 'Ceviche de Calamar', category: 'Ceviches', price: 7.50, cost: 2.80, sku: 'CEV-005', description: 'Ceviche de calamar tierno', tags: ['mariscos'] },
    { name: 'Ceviche de Pulpo', category: 'Ceviches', price: 12.50, cost: 6.00, sku: 'CEV-006', description: 'Ceviche de pulpo al estilo costeño', tags: ['premium', 'mariscos'] },

    // ── Sopas & Caldos ──
    { name: 'Encebollado', category: 'Sopas & Caldos', price: 6.50, cost: 2.00, sku: 'SOP-001', description: 'Encebollado de albacora con yuca y cebolla encurtida', tags: ['popular', 'tradicional'] },
    { name: 'Sopa Marinera', category: 'Sopas & Caldos', price: 8.00, cost: 3.50, sku: 'SOP-002', description: 'Sopa con variedad de mariscos', tags: ['mariscos'] },
    { name: 'Caldo de Bolas de Verde', category: 'Sopas & Caldos', price: 5.50, cost: 1.80, sku: 'SOP-003', description: 'Caldo tradicional con bolas de verde rellenas', tags: ['tradicional'] },
    { name: 'Viche de Pescado', category: 'Sopas & Caldos', price: 7.00, cost: 2.50, sku: 'SOP-004', description: 'Sopa espesa esmeraldeña de pescado con maní', tags: ['tradicional'] },
    { name: 'Cazuela de Camarón', category: 'Sopas & Caldos', price: 9.00, cost: 3.80, sku: 'SOP-005', description: 'Cazuela de camarón con verde y maní', tags: ['premium'] },

    // ── Arroces & Menestras ──
    { name: 'Arroz con Camarón', category: 'Arroces & Menestras', price: 9.50, cost: 3.50, sku: 'ARR-001', description: 'Arroz marinero con camarones', tags: ['popular'] },
    { name: 'Arroz con Concha', category: 'Arroces & Menestras', price: 13.00, cost: 6.00, sku: 'ARR-002', description: 'Arroz con conchas al ajillo', tags: ['premium'] },
    { name: 'Arroz Marinero', category: 'Arroces & Menestras', price: 12.00, cost: 5.00, sku: 'ARR-003', description: 'Arroz con variedad de mariscos', tags: ['popular'] },
    { name: 'Seco de Pollo', category: 'Arroces & Menestras', price: 5.50, cost: 2.00, sku: 'ARR-004', description: 'Seco de pollo con arroz y menestra', tags: ['tradicional', 'almuerzo'] },
    { name: 'Seco de Carne', category: 'Arroces & Menestras', price: 6.50, cost: 2.80, sku: 'ARR-005', description: 'Seco de carne con arroz, menestra y patacones', tags: ['tradicional', 'almuerzo'] },
    { name: 'Menestra con Carne Asada', category: 'Arroces & Menestras', price: 7.00, cost: 3.00, sku: 'ARR-006', description: 'Menestra de lentejas, arroz y carne asada', tags: ['tradicional'] },

    // ── Mariscos al Ajillo ──
    { name: 'Camarones al Ajillo', category: 'Mariscos al Ajillo', price: 12.00, cost: 5.00, sku: 'AJI-001', description: 'Camarones salteados al ajillo con arroz', tags: ['popular', 'mariscos'] },
    { name: 'Conchas al Ajillo', category: 'Mariscos al Ajillo', price: 15.00, cost: 7.00, sku: 'AJI-002', description: 'Conchas negras al ajillo', tags: ['premium'] },
    { name: 'Langostinos al Ajillo', category: 'Mariscos al Ajillo', price: 18.00, cost: 9.00, sku: 'AJI-003', description: 'Langostinos jumbo al ajillo', tags: ['premium'] },
    { name: 'Calamares al Ajillo', category: 'Mariscos al Ajillo', price: 10.00, cost: 4.00, sku: 'AJI-004', description: 'Anillos de calamar al ajillo', tags: ['mariscos'] },

    // ── Platos Fuertes ──
    { name: 'Corvina Apanada', category: 'Platos Fuertes', price: 9.00, cost: 3.50, sku: 'PLA-001', description: 'Filete de corvina apanada con patacones', tags: ['popular'] },
    { name: 'Corvina a la Plancha', category: 'Platos Fuertes', price: 10.00, cost: 4.00, sku: 'PLA-002', description: 'Filete de corvina a la plancha con ensalada', tags: ['saludable'] },
    { name: 'Bandeja Marinera', category: 'Platos Fuertes', price: 16.00, cost: 7.50, sku: 'PLA-003', description: 'Arroz, camarón, concha, calamar, patacones y ensalada', tags: ['premium', 'para-compartir'] },
    { name: 'Pescado Frito Entero', category: 'Platos Fuertes', price: 8.00, cost: 3.00, sku: 'PLA-004', description: 'Pescado entero frito con arroz, menestra y ensalada', tags: ['tradicional'] },
    { name: 'Encocado de Pescado', category: 'Platos Fuertes', price: 9.50, cost: 3.50, sku: 'PLA-005', description: 'Pescado en salsa de coco esmeraldeña', tags: ['tradicional'] },

    // ── Entradas & Picadas ──
    { name: 'Patacones con Queso', category: 'Entradas & Picadas', price: 4.00, cost: 1.20, sku: 'ENT-001', description: 'Patacones crujientes con queso derretido', tags: ['entrada'] },
    { name: 'Empanada de Verde', category: 'Entradas & Picadas', price: 2.50, cost: 0.80, sku: 'ENT-002', description: 'Empanada de verde rellena de queso', tags: ['entrada'] },
    { name: 'Canguil', category: 'Entradas & Picadas', price: 1.50, cost: 0.30, sku: 'ENT-003', description: 'Porción de canguil (maíz tostado)', tags: ['acompañamiento'] },
    { name: 'Chifles', category: 'Entradas & Picadas', price: 1.50, cost: 0.30, sku: 'ENT-004', description: 'Porción de chifles de plátano', tags: ['acompañamiento'] },
    { name: 'Bolón de Verde', category: 'Entradas & Picadas', price: 3.00, cost: 0.90, sku: 'ENT-005', description: 'Bolón de verde con queso o chicharrón', tags: ['tradicional', 'desayuno'] },
    { name: 'Tigrillo', category: 'Entradas & Picadas', price: 4.50, cost: 1.50, sku: 'ENT-006', description: 'Verde machacado con queso y huevo', tags: ['tradicional', 'desayuno'] },

    // ── Bebidas ──
    { name: 'Jugo de Naranja', category: 'Bebidas', price: 2.50, cost: 0.80, sku: 'BEB-001', taxRate: 0, description: 'Jugo natural de naranja', tags: ['natural'] },
    { name: 'Jugo de Maracuyá', category: 'Bebidas', price: 2.50, cost: 0.70, sku: 'BEB-002', taxRate: 0, description: 'Jugo natural de maracuyá', tags: ['natural'] },
    { name: 'Jugo de Mora', category: 'Bebidas', price: 2.50, cost: 0.70, sku: 'BEB-003', taxRate: 0, description: 'Jugo natural de mora', tags: ['natural'] },
    { name: 'Limonada', category: 'Bebidas', price: 2.00, cost: 0.50, sku: 'BEB-004', taxRate: 0, description: 'Limonada fresca', tags: ['natural'] },
    { name: 'Coca-Cola', category: 'Bebidas', price: 1.50, cost: 0.60, sku: 'BEB-005', description: 'Coca-Cola personal', tags: ['gaseosa'] },
    { name: 'Sprite', category: 'Bebidas', price: 1.50, cost: 0.60, sku: 'BEB-006', description: 'Sprite personal', tags: ['gaseosa'] },
    { name: 'Agua sin Gas', category: 'Bebidas', price: 1.00, cost: 0.30, sku: 'BEB-007', taxRate: 0, description: 'Botella de agua 500ml', tags: [] },
    { name: 'Agua con Gas', category: 'Bebidas', price: 1.25, cost: 0.40, sku: 'BEB-008', taxRate: 0, description: 'Agua mineral con gas', tags: [] },
    { name: 'Café', category: 'Bebidas', price: 1.50, cost: 0.30, sku: 'BEB-009', taxRate: 0, description: 'Café pasado', tags: [] },

    // ── Cervezas & Licores ──
    { name: 'Pilsener', category: 'Cervezas & Licores', price: 2.50, cost: 1.10, sku: 'CER-001', description: 'Cerveza Pilsener 600ml', tags: ['cerveza'] },
    { name: 'Club Verde', category: 'Cervezas & Licores', price: 2.50, cost: 1.10, sku: 'CER-002', description: 'Cerveza Club Premium 600ml', tags: ['cerveza'] },
    { name: 'Corona', category: 'Cervezas & Licores', price: 3.50, cost: 1.80, sku: 'CER-003', description: 'Corona Extra 355ml', tags: ['cerveza', 'importada'] },
    { name: 'Michelada', category: 'Cervezas & Licores', price: 4.50, cost: 1.50, sku: 'CER-004', description: 'Michelada preparada con Pilsener', tags: ['cocteles'] },
    { name: 'Jarra de Sangría', category: 'Cervezas & Licores', price: 12.00, cost: 4.00, sku: 'CER-005', description: 'Jarra de sangría para compartir', tags: ['cocteles', 'para-compartir'] },

    // ── Postres ──
    { name: 'Tres Leches', category: 'Postres', price: 4.00, cost: 1.20, sku: 'POS-001', description: 'Pastel de tres leches', tags: ['dulce'] },
    { name: 'Cocada', category: 'Postres', price: 2.50, cost: 0.60, sku: 'POS-002', description: 'Cocada esmeraldeña tradicional', tags: ['tradicional'] },
    { name: 'Helado de Paila', category: 'Postres', price: 3.50, cost: 1.00, sku: 'POS-003', description: 'Helado artesanal de paila (mora, guanábana o taxo)', tags: ['artesanal'] },
    { name: 'Humita', category: 'Postres', price: 2.00, cost: 0.50, sku: 'POS-004', description: 'Humita dulce de maíz', tags: ['tradicional'] },

    // ── Extras ──
    { name: 'Porción Extra de Arroz', category: 'Extras', price: 1.50, cost: 0.30, sku: 'EXT-001', taxRate: 0, tags: ['extra'] },
    { name: 'Porción Extra de Patacones', category: 'Extras', price: 2.00, cost: 0.50, sku: 'EXT-002', taxRate: 0, tags: ['extra'] },
    { name: 'Porción Extra de Menestra', category: 'Extras', price: 1.50, cost: 0.40, sku: 'EXT-003', taxRate: 0, tags: ['extra'] },
    { name: 'Ají Casero', category: 'Extras', price: 0.50, cost: 0.10, sku: 'EXT-004', taxRate: 0, tags: ['salsa'] },
  ];

  let created = 0;
  const productMap: Record<string, string> = {};

  for (let i = 0; i < productDefs.length; i++) {
    const p = productDefs[i];
    const existing = await prisma.product.findFirst({
      where: { tenantId: T, sku: p.sku },
    });
    if (existing) {
      productMap[p.sku] = existing.id;
      continue;
    }

    const product = await prisma.product.create({
      data: {
        tenantId: T,
        categoryId: categories[p.category] || null,
        name: p.name,
        description: p.description || '',
        sku: p.sku,
        price: p.price,
        cost: p.cost || 0,
        taxRate: p.taxRate !== undefined ? p.taxRate : 0.15,
        unit: 'unit',
        trackInventory: false,
        currentStock: 999,
        displayOrder: i,
        isActive: true,
        isAvailable: true,
        tags: p.tags || [],
        attributes: {},
      },
    });
    productMap[p.sku] = product.id;
    created++;
  }

  log('✅', `Productos: ${created} creados (${productDefs.length} total)`);
  return productMap;
}

// ══════════════════════════════════════
// 6. ZONES & TABLES
// ══════════════════════════════════════
async function seedZonesAndTables(T: string, branchId: string) {
  const zoneDefs = [
    { name: 'Salón Principal', color: '#3B82F6', tables: [
      { number: 1, capacity: 4, x: 80, y: 80, shape: 'square' },
      { number: 2, capacity: 4, x: 200, y: 80, shape: 'square' },
      { number: 3, capacity: 2, x: 320, y: 80, shape: 'round' },
      { number: 4, capacity: 6, x: 80, y: 220, shape: 'rectangle', w: 120, h: 80 },
      { number: 5, capacity: 4, x: 240, y: 220, shape: 'square' },
      { number: 6, capacity: 4, x: 360, y: 220, shape: 'square' },
      { number: 7, capacity: 2, x: 80, y: 360, shape: 'round' },
      { number: 8, capacity: 2, x: 200, y: 360, shape: 'round' },
    ]},
    { name: 'Terraza', color: '#10B981', tables: [
      { number: 9, capacity: 4, x: 80, y: 80, shape: 'square' },
      { number: 10, capacity: 4, x: 200, y: 80, shape: 'square' },
      { number: 11, capacity: 6, x: 80, y: 220, shape: 'rectangle', w: 120, h: 80 },
      { number: 12, capacity: 8, x: 240, y: 220, shape: 'rectangle', w: 160, h: 80 },
    ]},
    { name: 'Barra', color: '#F59E0B', tables: [
      { number: 13, capacity: 1, x: 80, y: 80, shape: 'round' },
      { number: 14, capacity: 1, x: 160, y: 80, shape: 'round' },
      { number: 15, capacity: 1, x: 240, y: 80, shape: 'round' },
      { number: 16, capacity: 1, x: 320, y: 80, shape: 'round' },
    ]},
  ];

  let zonesCreated = 0;
  let tablesCreated = 0;

  // Create a default floor plan (table exists in DB but not in Prisma schema)
  let floorPlanResult = await prisma.$queryRaw<Array<{id: string}>>`
    SELECT id FROM floor_plans WHERE tenant_id = ${T}::uuid AND name = 'Planta Principal' LIMIT 1
  `;
  let floorPlanId: string;
  if (floorPlanResult.length > 0) {
    floorPlanId = floorPlanResult[0].id;
  } else {
    const created = await prisma.$queryRaw<Array<{id: string}>>`
      INSERT INTO floor_plans (id, tenant_id, name, display_order, is_active, created_at)
      VALUES (uuid_generate_v7(), ${T}::uuid, 'Planta Principal', 0, true, now())
      RETURNING id
    `;
    floorPlanId = created[0].id;
    log('✅', 'Floor plan creado: Planta Principal');
  }

  for (let zi = 0; zi < zoneDefs.length; zi++) {
    const zd = zoneDefs[zi];
    let zone = await prisma.zone.findFirst({
      where: { tenantId: T, name: zd.name },
    });

    if (!zone) {
      const zoneResult = await prisma.$queryRaw<Array<{id: string}>>`
        INSERT INTO zones (id, tenant_id, branch_id, name, color, display_order, is_active, floor_plan_id)
        VALUES (uuid_generate_v7(), ${T}::uuid, ${branchId}::uuid, ${zd.name}, ${zd.color}, ${zi}, true, ${floorPlanId}::uuid)
        RETURNING id
      `;
      zone = await prisma.zone.findUnique({ where: { id: zoneResult[0].id } });
      zonesCreated++;
    }

    for (const td of zd.tables) {
      const existing = await prisma.restaurantTable.findFirst({
        where: { tenantId: T, number: td.number },
      });
      if (existing) continue;

      const w = (td as any).w || 80;
      const h = (td as any).h || 80;
      await prisma.$queryRaw`
        INSERT INTO tables (id, tenant_id, branch_id, zone_id, number, capacity, shape, position_x, position_y, width, height, status, is_active)
        VALUES (uuid_generate_v7(), ${T}::uuid, ${branchId}::uuid, ${zone!.id}::uuid, ${td.number}, ${td.capacity}, ${td.shape}, ${td.x}, ${td.y}, ${w}, ${h}, 'available', true)
      `;
      tablesCreated++;
    }
  }

  log('✅', `Zonas: ${zonesCreated} creadas, Mesas: ${tablesCreated} creadas (16 total)`);
}

// ══════════════════════════════════════
// 7. CUSTOMERS
// ══════════════════════════════════════
async function seedCustomers(T: string) {
  const customerDefs = [
    { name: 'Consumidor Final', taxId: '9999999999999', taxIdType: 'ruc', email: null, phone: null },
    { name: 'Juan Pérez López', taxId: '0912345678001', taxIdType: 'ruc', email: 'juan.perez@email.com', phone: '0991234567' },
    { name: 'María Fernanda Rodríguez', taxId: '0923456789', taxIdType: 'cedula', email: 'mfrodriguez@email.com', phone: '0987654321' },
    { name: 'Restaurante El Cangrejo S.A.', taxId: '0992345678001', taxIdType: 'ruc', email: 'compras@elcangrejo.com', phone: '042345678' },
    { name: 'Andrea Solano Vera', taxId: '0934567890', taxIdType: 'cedula', email: 'andrea.solano@email.com', phone: '0976543210' },
    { name: 'Carlos Mendoza', taxId: '0945678901', taxIdType: 'cedula', email: 'cmendoza@email.com', phone: '0965432109' },
    { name: 'Diana Torres', taxId: '0956789012', taxIdType: 'cedula', email: 'dtorres@email.com', phone: '0954321098' },
    { name: 'Hotel Playa Azul', taxId: '0993456789001', taxIdType: 'ruc', email: 'recepcion@playaazul.com', phone: '042456789' },
    { name: 'Roberto Zambrano', taxId: '0967890123', taxIdType: 'cedula', email: 'rzambrano@email.com', phone: '0943210987' },
    { name: 'Lucía Espinoza', taxId: '0978901234', taxIdType: 'cedula', email: 'lespinoza@email.com', phone: '0932109876' },
  ];

  let created = 0;
  for (const c of customerDefs) {
    const existing = await prisma.customer.findFirst({
      where: { tenantId: T, name: c.name },
    });
    if (existing) continue;

    await prisma.customer.create({
      data: {
        tenantId: T,
        name: c.name,
        taxId: c.taxId,
        taxIdType: c.taxIdType,
        email: c.email,
        phone: c.phone,
        isActive: true,
      },
    });
    created++;
  }

  log('✅', `Clientes: ${created} creados (${customerDefs.length} total)`);
}

// ══════════════════════════════════════
// 8. SUPPLIERS
// ══════════════════════════════════════
async function seedSuppliers(T: string) {
  const supplierDefs = [
    { name: 'Mariscos del Pacífico', contactName: 'Roberto Arias', phone: '0991122334', email: 'ventas@mariscospacifico.com', taxId: '0991234567001' },
    { name: 'Distribuidora La Granja', contactName: 'Elena Muñoz', phone: '0992233445', email: 'pedidos@lagranja.com', taxId: '0992345678001' },
    { name: 'Bebidas y Licores S.A.', contactName: 'Marco Salazar', phone: '0993344556', email: 'ventas@bebidasylicores.com', taxId: '0993456789001' },
    { name: 'Verduras Frescas EC', contactName: 'Patricia Loor', phone: '0994455667', email: 'info@verdurasfrescas.com', taxId: '0994567890001' },
  ];

  const suppliers: Record<string, string> = {};
  let created = 0;

  for (const s of supplierDefs) {
    const existing = await prisma.supplier.findFirst({
      where: { tenantId: T, name: s.name },
    });
    if (existing) {
      suppliers[s.name] = existing.id;
      continue;
    }

    const supplier = await prisma.supplier.create({
      data: {
        tenantId: T,
        name: s.name,
        contactName: s.contactName,
        phone: s.phone,
        email: s.email,
        taxId: s.taxId,
        isActive: true,
      },
    });
    suppliers[s.name] = supplier.id;
    created++;
  }

  log('✅', `Proveedores: ${created} creados (${supplierDefs.length} total)`);
  return suppliers;
}

// ══════════════════════════════════════
// 9. INGREDIENTS
// ══════════════════════════════════════
async function seedIngredients(T: string, branchId: string, suppliers: Record<string, string>) {
  const ingredientDefs = [
    { name: 'Camarón mediano', unit: 'lb', stock: 50, minStock: 10, cost: 5.50, supplier: 'Mariscos del Pacífico', category: 'Mariscos' },
    { name: 'Camarón grande', unit: 'lb', stock: 30, minStock: 8, cost: 7.00, supplier: 'Mariscos del Pacífico', category: 'Mariscos' },
    { name: 'Corvina fresca', unit: 'lb', stock: 40, minStock: 10, cost: 4.50, supplier: 'Mariscos del Pacífico', category: 'Mariscos' },
    { name: 'Concha prieta', unit: 'unidad', stock: 200, minStock: 50, cost: 0.35, supplier: 'Mariscos del Pacífico', category: 'Mariscos' },
    { name: 'Calamar', unit: 'lb', stock: 20, minStock: 5, cost: 3.50, supplier: 'Mariscos del Pacífico', category: 'Mariscos' },
    { name: 'Pulpo', unit: 'lb', stock: 15, minStock: 5, cost: 8.00, supplier: 'Mariscos del Pacífico', category: 'Mariscos' },
    { name: 'Langostino jumbo', unit: 'lb', stock: 10, minStock: 5, cost: 12.00, supplier: 'Mariscos del Pacífico', category: 'Mariscos' },
    { name: 'Limón', unit: 'unidad', stock: 300, minStock: 100, cost: 0.05, supplier: 'Verduras Frescas EC', category: 'Vegetales' },
    { name: 'Cebolla paiteña', unit: 'lb', stock: 50, minStock: 15, cost: 0.60, supplier: 'Verduras Frescas EC', category: 'Vegetales' },
    { name: 'Tomate', unit: 'lb', stock: 30, minStock: 10, cost: 0.80, supplier: 'Verduras Frescas EC', category: 'Vegetales' },
    { name: 'Plátano verde', unit: 'unidad', stock: 100, minStock: 30, cost: 0.15, supplier: 'Verduras Frescas EC', category: 'Vegetales' },
    { name: 'Arroz', unit: 'lb', stock: 100, minStock: 25, cost: 0.50, supplier: 'Distribuidora La Granja', category: 'Granos' },
    { name: 'Aceite vegetal', unit: 'litro', stock: 20, minStock: 5, cost: 2.80, supplier: 'Distribuidora La Granja', category: 'Aceites' },
    { name: 'Ajo', unit: 'lb', stock: 10, minStock: 3, cost: 2.50, supplier: 'Verduras Frescas EC', category: 'Condimentos' },
    { name: 'Sal', unit: 'lb', stock: 20, minStock: 5, cost: 0.40, supplier: 'Distribuidora La Granja', category: 'Condimentos' },
    { name: 'Pilsener 600ml', unit: 'unidad', stock: 120, minStock: 48, cost: 1.10, supplier: 'Bebidas y Licores S.A.', category: 'Bebidas' },
    { name: 'Coca-Cola Personal', unit: 'unidad', stock: 48, minStock: 24, cost: 0.60, supplier: 'Bebidas y Licores S.A.', category: 'Bebidas' },
    { name: 'Maní', unit: 'lb', stock: 10, minStock: 3, cost: 2.00, supplier: 'Distribuidora La Granja', category: 'Granos' },
  ];

  let created = 0;
  for (const ig of ingredientDefs) {
    const existing = await prisma.ingredient.findFirst({
      where: { tenantId: T, name: ig.name },
    });
    if (existing) continue;

    await prisma.ingredient.create({
      data: {
        tenantId: T,
        branchId,
        name: ig.name,
        unit: ig.unit,
        currentStock: ig.stock,
        minStock: ig.minStock,
        costPerUnit: ig.cost,
        supplierId: suppliers[ig.supplier] || null,
        category: ig.category,
        isActive: true,
      },
    });
    created++;
  }

  log('✅', `Ingredientes: ${created} creados (${ingredientDefs.length} total)`);
}

// ══════════════════════════════════════
// 10. CASH REGISTER
// ══════════════════════════════════════
async function seedCashRegister(T: string, branchId: string) {
  const existing = await prisma.$queryRaw<Array<{id: string}>>`
    SELECT id FROM cash_registers WHERE tenant_id = ${T}::uuid LIMIT 1
  `;
  if (existing.length > 0) {
    log('⏭️', `Caja registradora ya existe`);
    return;
  }

  await prisma.$queryRaw`
    INSERT INTO cash_registers (id, tenant_id, branch_id, name, is_active, created_at)
    VALUES (uuid_generate_v7(), ${T}::uuid, ${branchId}::uuid, 'Caja Principal', true, now())
  `;
  await prisma.$queryRaw`
    INSERT INTO cash_registers (id, tenant_id, branch_id, name, is_active, created_at)
    VALUES (uuid_generate_v7(), ${T}::uuid, ${branchId}::uuid, 'Caja Terraza', true, now())
  `;

  log('✅', 'Cajas registradoras creadas (2)');
}

// ══════════════════════════════════════
// 11. DELIVERY ZONES
// ══════════════════════════════════════
async function seedDeliveryZones(T: string, branchId: string) {
  const zoneDefs = [
    { name: 'Centro de Guayaquil', fee: 1.50, minOrder: 8.00, minutes: 25, color: '#3B82F6' },
    { name: 'Norte de Guayaquil', fee: 2.50, minOrder: 12.00, minutes: 35, color: '#10B981' },
    { name: 'Sur de Guayaquil', fee: 2.50, minOrder: 12.00, minutes: 40, color: '#F59E0B' },
    { name: 'Samborondón', fee: 3.50, minOrder: 15.00, minutes: 45, color: '#8B5CF6' },
  ];

  let created = 0;
  for (const z of zoneDefs) {
    const existing = await prisma.deliveryZone.findFirst({
      where: { tenantId: T, name: z.name },
    });
    if (existing) continue;

    await prisma.deliveryZone.create({
      data: {
        tenantId: T,
        branchId,
        name: z.name,
        deliveryFee: z.fee,
        minOrderAmount: z.minOrder,
        estimatedMinutes: z.minutes,
        color: z.color,
        isActive: true,
      },
    });
    created++;
  }

  log('✅', `Zonas de delivery: ${created} creadas (${zoneDefs.length} total)`);
}

// ══════════════════════════════════════
// 12. PROMOTIONS
// ══════════════════════════════════════
async function seedPromotions(T: string, products: Record<string, string>, categories: Record<string, string>) {
  const promoDefs = [
    {
      name: 'Happy Hour Cervezas',
      description: '50% de descuento en cervezas nacionales de 16:00 a 19:00',
      promoType: 'percentage', discountValue: 50, scope: 'category',
      startTime: '16:00', endTime: '19:00', daysOfWeek: [1,2,3,4,5], isAutomatic: true,
    },
    {
      name: '2x1 Ceviches Martes',
      description: 'Segundo ceviche gratis todos los martes',
      promoType: 'buy_x_get_y', discountValue: 100, scope: 'category',
      buyQuantity: 2, getQuantity: 1, daysOfWeek: [2], isAutomatic: true,
    },
    {
      name: 'Descuento 10% Almuerzo',
      description: '10% de descuento en pedidos mayores a $20',
      promoType: 'percentage', discountValue: 10, scope: 'order',
      minOrderAmount: 20, maxDiscountAmount: 5,
      startTime: '12:00', endTime: '15:00', daysOfWeek: [1,2,3,4,5], isAutomatic: true,
    },
    {
      name: 'Cupón BIENVENIDO',
      description: '$3 de descuento para nuevos clientes',
      promoType: 'fixed', discountValue: 3, scope: 'order',
      minOrderAmount: 15, couponCode: 'BIENVENIDO', maxUses: 100, isAutomatic: false,
    },
  ];

  let created = 0;
  for (const p of promoDefs) {
    const existing = await prisma.$queryRaw<Array<{id: string}>>`
      SELECT id FROM promotions WHERE tenant_id = ${T}::uuid AND name = ${p.name} LIMIT 1
    `;
    if (existing.length > 0) continue;

    const days = `{${(p.daysOfWeek || [0,1,2,3,4,5,6]).join(',')}}`;
    await prisma.$queryRaw`
      INSERT INTO promotions (
        id, tenant_id, name, description, promo_type, discount_value, 
        buy_quantity, get_quantity, scope, coupon_code,
        min_order_amount, max_discount_amount, max_uses, max_uses_per_order, current_uses,
        start_date, start_time, end_time, days_of_week,
        is_active, is_automatic, priority, stackable, created_at, updated_at
      ) VALUES (
        uuid_generate_v7(), ${T}::uuid, ${p.name}, ${p.description}, ${p.promoType}, ${p.discountValue},
        ${(p as any).buyQuantity || null}, ${(p as any).getQuantity || null}, ${p.scope}, ${(p as any).couponCode || null},
        ${(p as any).minOrderAmount || 0}, ${(p as any).maxDiscountAmount || null}, ${(p as any).maxUses || null}, 1, 0,
        now(), ${(p as any).startTime || null}::time, ${(p as any).endTime || null}::time, ${days}::int[],
        true, ${p.isAutomatic}, 0, false, now(), now()
      )
    `;
    created++;
  }

  log('✅', `Promociones: ${created} creadas (${promoDefs.length} total)`);
}

// ══════════════════════════════════════
// 13. SRI CONFIG
// ══════════════════════════════════════
async function seedSriConfig(T: string) {
  const existing = await prisma.sriConfig.findFirst({
    where: { tenantId: T },
  });
  if (existing) {
    log('⏭️', 'SRI Config ya existe');
    return;
  }

  await prisma.sriConfig.create({
    data: {
      tenantId: T,
      ruc: '0990000000001',
      razonSocial: 'CEVICHERIA LA COSTA S.A.',
      nombreComercial: 'Cevichería La Costa',
      direccionMatriz: 'Av. Francisco de Orellana, Guayaquil, Ecuador',
      obligadoContabilidad: false,
      regimenRimpe: true,
      ambiente: '1', // 1 = pruebas, 2 = producción
      tipoEmision: '1',
      establecimiento: '001',
      puntoEmision: '001',
      secuencialFactura: 0,
      secuencialNotaCredito: 0,
      secuencialRetencion: 0,
    },
  });

  log('✅', 'SRI Config creada (ambiente: pruebas)');
}

// ══════════════════════════════════════
// RUN
// ══════════════════════════════════════
main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
