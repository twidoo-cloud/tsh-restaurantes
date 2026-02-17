-- ══════════════════════════════════════════════════════════════
-- POS SaaS Multi-Vertical — Database Initialization
-- PostgreSQL 16 + TimescaleDB
-- Version 2.0 — February 2026
-- ══════════════════════════════════════════════════════════════

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ──────────────────────────────────────────
-- UUID v7 generator function
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION uuid_generate_v7() RETURNS uuid AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms = substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) from 3);
  uuid_bytes = unix_ts_ms || gen_random_bytes(10);
  uuid_bytes = set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
  uuid_bytes = set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
  RETURN encode(uuid_bytes, 'hex')::uuid;
END
$$ LANGUAGE plpgsql VOLATILE;

-- ──────────────────────────────────────────
-- Trigger function for updated_at
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════
-- CORE TABLES
-- ══════════════════════════════════════════════════════════════

-- ── resellers ──
CREATE TABLE resellers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  name        VARCHAR(200) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  domain      VARCHAR(255) UNIQUE,
  logo_url    TEXT,
  theme_config JSONB DEFAULT '{}',
  country_code CHAR(2) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON resellers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── tenants ──
CREATE TABLE tenants (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  reseller_id         UUID NOT NULL REFERENCES resellers(id),
  name                VARCHAR(200) NOT NULL,
  slug                VARCHAR(100) NOT NULL UNIQUE,
  vertical_type       VARCHAR(30) NOT NULL DEFAULT 'restaurant',
  enabled_modules     TEXT[] NOT NULL DEFAULT '{core}',
  tax_id              VARCHAR(50),
  country_code        CHAR(2) NOT NULL,
  currency_code       CHAR(3) NOT NULL DEFAULT 'PEN',
  timezone            VARCHAR(50) NOT NULL DEFAULT 'America/Lima',
  address             JSONB,
  phone               VARCHAR(30),
  logo_url            TEXT,
  settings            JSONB DEFAULT '{}',
  subscription_plan   VARCHAR(50) NOT NULL DEFAULT 'basic',
  subscription_status VARCHAR(20) NOT NULL DEFAULT 'trial',
  trial_ends_at       TIMESTAMPTZ,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_tenants_reseller ON tenants(reseller_id);
CREATE INDEX idx_tenants_vertical ON tenants(vertical_type);

-- ── roles ──
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  is_system   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

-- ── users ──
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  pin_hash      VARCHAR(255),
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  role_id       UUID REFERENCES roles(id),
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── customers ──
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tax_id          VARCHAR(50),
  name            VARCHAR(300) NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(30),
  address         TEXT,
  notes           TEXT,
  total_purchases DECIMAL(14,2) DEFAULT 0,
  visit_count     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_tax_id ON customers(tenant_id, tax_id) WHERE tax_id IS NOT NULL;

-- ── product_categories ──
CREATE TABLE product_categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  display_order INTEGER DEFAULT 0,
  image_url     TEXT,
  is_active     BOOLEAN DEFAULT true,
  parent_id     UUID REFERENCES product_categories(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_categories_tenant ON product_categories(tenant_id, display_order);

-- ── products ──
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES product_categories(id),
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  sku             VARCHAR(50),
  barcode         VARCHAR(50),
  price           DECIMAL(12,2) NOT NULL,
  cost            DECIMAL(12,2),
  tax_rate        DECIMAL(5,4) DEFAULT 0.18,
  unit            VARCHAR(20) DEFAULT 'unit',
  track_inventory BOOLEAN DEFAULT true,
  current_stock   DECIMAL(12,4) DEFAULT 0,
  min_stock       DECIMAL(12,4) DEFAULT 0,
  image_url       TEXT,
  display_order   INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  is_available    BOOLEAN DEFAULT true,
  tags            TEXT[] DEFAULT '{}',
  attributes      JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, sku)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_products_active ON products(tenant_id, category_id, display_order) WHERE is_active = true;
CREATE INDEX idx_products_barcode ON products(tenant_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_low_stock ON products(tenant_id) WHERE current_stock <= min_stock AND track_inventory = true AND is_active = true;

-- ── product_variants ──
CREATE TABLE product_variants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  sku           VARCHAR(50),
  barcode       VARCHAR(50),
  price         DECIMAL(12,2) NOT NULL,
  cost          DECIMAL(12,2),
  current_stock DECIMAL(12,4) DEFAULT 0,
  attributes    JSONB DEFAULT '{}',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_variants_product ON product_variants(tenant_id, product_id);

-- ── cash_registers ──
CREATE TABLE cash_registers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── shifts ──
CREATE TABLE shifts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cash_register_id UUID NOT NULL REFERENCES cash_registers(id),
  opened_by        UUID NOT NULL REFERENCES users(id),
  closed_by        UUID REFERENCES users(id),
  opening_amount   DECIMAL(12,2) NOT NULL,
  closing_amount   DECIMAL(12,2),
  expected_amount  DECIMAL(12,2),
  difference       DECIMAL(12,2),
  total_sales      DECIMAL(12,2) DEFAULT 0,
  orders_count     INTEGER DEFAULT 0,
  status           VARCHAR(20) DEFAULT 'open',
  notes            TEXT,
  opened_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at        TIMESTAMPTZ
);

CREATE INDEX idx_shifts_tenant_status ON shifts(tenant_id, status) WHERE status = 'open';

-- ── orders ──
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number    VARCHAR(30) NOT NULL,
  customer_id     UUID REFERENCES customers(id),
  served_by       UUID REFERENCES users(id),
  shift_id        UUID REFERENCES shifts(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'open',
  type            VARCHAR(20) NOT NULL DEFAULT 'sale',
  subtotal        DECIMAL(12,2) DEFAULT 0,
  tax_amount      DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_reason TEXT,
  service_charge  DECIMAL(12,2) DEFAULT 0,
  total           DECIMAL(12,2) DEFAULT 0,
  notes           TEXT,
  metadata        JSONB DEFAULT '{}',
  is_synced       BOOLEAN DEFAULT true,
  offline_id      VARCHAR(50),
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, order_number)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status) WHERE status IN ('open', 'in_progress');
CREATE INDEX idx_orders_tenant_date ON orders(tenant_id, created_at DESC);

-- ── order_items ──
CREATE TABLE order_items (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES products(id),
  product_variant_id UUID REFERENCES product_variants(id),
  quantity           DECIMAL(12,4) NOT NULL DEFAULT 1,
  unit_price         DECIMAL(12,2) NOT NULL,
  modifiers          JSONB DEFAULT '[]',
  modifiers_total    DECIMAL(12,2) DEFAULT 0,
  subtotal           DECIMAL(12,2) NOT NULL,
  tax_amount         DECIMAL(12,2) DEFAULT 0,
  discount_amount    DECIMAL(12,2) DEFAULT 0,
  notes              TEXT,
  metadata           JSONB DEFAULT '{}',
  is_void            BOOLEAN DEFAULT false,
  void_reason        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(tenant_id, order_id);

-- ── payments ──
CREATE TABLE payments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method        VARCHAR(30) NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,
  currency_code CHAR(3) NOT NULL,
  reference     VARCHAR(100),
  status        VARCHAR(20) DEFAULT 'completed',
  processed_by  UUID REFERENCES users(id),
  cash_received DECIMAL(12,2),
  change_given  DECIMAL(12,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments(tenant_id, order_id);

-- ── tips ──
CREATE TABLE tips (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id),
  amount     DECIMAL(12,2) NOT NULL,
  method     VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── suppliers ──
CREATE TABLE suppliers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         VARCHAR(200) NOT NULL,
  contact_name VARCHAR(200),
  phone        VARCHAR(30),
  email        VARCHAR(255),
  tax_id       VARCHAR(50),
  address      TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ingredients ──
CREATE TABLE ingredients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  unit          VARCHAR(20) NOT NULL,
  current_stock DECIMAL(12,4) DEFAULT 0,
  min_stock     DECIMAL(12,4) DEFAULT 0,
  cost_per_unit DECIMAL(12,4) DEFAULT 0,
  supplier_id   UUID REFERENCES suppliers(id),
  category      VARCHAR(100),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── stock_movements ──
CREATE TABLE stock_movements (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type    VARCHAR(30) NOT NULL,
  entity_id      UUID NOT NULL,
  type           VARCHAR(20) NOT NULL,
  quantity       DECIMAL(12,4) NOT NULL,
  unit_cost      DECIMAL(12,4),
  reference_type VARCHAR(50),
  reference_id   UUID,
  notes          TEXT,
  performed_by   UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_entity ON stock_movements(tenant_id, entity_type, entity_id);

-- ── tax_configs ──
CREATE TABLE tax_configs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  country_code     CHAR(2) NOT NULL,
  tax_authority    VARCHAR(50) NOT NULL,
  tax_id           VARCHAR(50) NOT NULL,
  certificate_data TEXT,
  api_credentials  JSONB,
  default_tax_rate DECIMAL(5,4) NOT NULL,
  document_series  JSONB DEFAULT '{}',
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── invoices ──
CREATE TABLE invoices (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id           UUID REFERENCES orders(id),
  tax_config_id      UUID REFERENCES tax_configs(id),
  document_type      VARCHAR(30) NOT NULL,
  series             VARCHAR(10) NOT NULL,
  number             INTEGER NOT NULL,
  full_number        VARCHAR(30) NOT NULL,
  customer_id        UUID REFERENCES customers(id),
  subtotal           DECIMAL(12,2) NOT NULL,
  tax_amount         DECIMAL(12,2) NOT NULL,
  total              DECIMAL(12,2) NOT NULL,
  currency_code      CHAR(3) NOT NULL,
  xml_content        TEXT,
  authority_response JSONB,
  status             VARCHAR(20) DEFAULT 'draft',
  pdf_url            TEXT,
  issued_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id, issued_at DESC);

-- ── invoice_items ──
CREATE TABLE invoice_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity   DECIMAL(12,4) NOT NULL,
  unit_price DECIMAL(12,4) NOT NULL,
  tax_rate   DECIMAL(5,4) NOT NULL,
  tax_amount DECIMAL(12,2) NOT NULL,
  total      DECIMAL(12,2) NOT NULL
);

-- ── daily_sales_summary ──
CREATE TABLE daily_sales_summary (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  total_orders    INTEGER DEFAULT 0,
  gross_sales     DECIMAL(12,2) DEFAULT 0,
  net_sales       DECIMAL(12,2) DEFAULT 0,
  tax_collected   DECIMAL(12,2) DEFAULT 0,
  discounts_given DECIMAL(12,2) DEFAULT 0,
  avg_ticket      DECIMAL(12,2) DEFAULT 0,
  top_products    JSONB DEFAULT '[]',
  sales_by_hour   JSONB DEFAULT '{}',
  sales_by_method JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, date)
);

-- ── audit_logs ──
CREATE TABLE audit_logs (
  id          BIGSERIAL,
  tenant_id   UUID NOT NULL,
  user_id     UUID,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('audit_logs', 'created_at', chunk_time_interval => INTERVAL '1 month');

-- ══════════════════════════════════════════════════════════════
-- MODULE: RESTAURANT
-- ══════════════════════════════════════════════════════════════

-- ── floor_plans ──
CREATE TABLE floor_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── zones ──
CREATE TABLE zones (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  floor_plan_id UUID NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  color         VARCHAR(7),
  display_order INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT true
);

-- ── tables ──
CREATE TABLE tables (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  zone_id          UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  number           VARCHAR(20) NOT NULL,
  capacity         INTEGER DEFAULT 4,
  shape            VARCHAR(20) DEFAULT 'rectangle',
  position_x       INTEGER DEFAULT 0,
  position_y       INTEGER DEFAULT 0,
  width            INTEGER DEFAULT 100,
  height           INTEGER DEFAULT 80,
  status           VARCHAR(20) DEFAULT 'available',
  current_order_id UUID REFERENCES orders(id),
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tables_tenant_status ON tables(tenant_id, status);

-- ── kitchen_orders ──
CREATE TABLE kitchen_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_item_id   UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kitchen_station VARCHAR(50) NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending',
  priority        INTEGER DEFAULT 0,
  seat_number     INTEGER,
  notes           TEXT,
  fired_at        TIMESTAMPTZ,
  ready_at        TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kitchen_orders_pending ON kitchen_orders(tenant_id, kitchen_station, status)
  WHERE status IN ('pending', 'preparing');

-- ── recipes ──
CREATE TABLE recipes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  yield_quantity DECIMAL(12,4) DEFAULT 1,
  yield_unit     VARCHAR(20) DEFAULT 'portion',
  total_cost     DECIMAL(12,4) DEFAULT 0,
  instructions   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── recipe_items ──
CREATE TABLE recipe_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipe_id     UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  quantity      DECIMAL(12,4) NOT NULL,
  unit          VARCHAR(20) NOT NULL,
  cost          DECIMAL(12,4) DEFAULT 0
);

-- ══════════════════════════════════════════════════════════════
-- MODULE: HARDWARE STORE
-- ══════════════════════════════════════════════════════════════

-- ── product_barcodes ──
CREATE TABLE product_barcodes (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES product_variants(id),
  barcode            VARCHAR(100) NOT NULL,
  barcode_type       VARCHAR(20) DEFAULT 'EAN13',
  is_primary         BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_barcodes_code ON product_barcodes(tenant_id, barcode);

-- ── warehouse_locations ──
CREATE TABLE warehouse_locations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  code       VARCHAR(20) NOT NULL,
  parent_id  UUID REFERENCES warehouse_locations(id),
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- ── product_locations ──
CREATE TABLE product_locations (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES product_variants(id),
  location_id        UUID NOT NULL REFERENCES warehouse_locations(id),
  quantity           DECIMAL(12,4) DEFAULT 0,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- MODULE: PHARMACY
-- ══════════════════════════════════════════════════════════════

-- ── product_batches ──
CREATE TABLE product_batches (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES product_variants(id),
  batch_number       VARCHAR(100) NOT NULL,
  quantity           DECIMAL(12,4) DEFAULT 0,
  cost_per_unit      DECIMAL(12,4),
  manufactured_at    DATE,
  expires_at         DATE,
  received_at        DATE NOT NULL,
  supplier_id        UUID REFERENCES suppliers(id),
  status             VARCHAR(20) DEFAULT 'active',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_batches_expiry ON product_batches(tenant_id, expires_at) WHERE status = 'active';

-- ── prescriptions ──
CREATE TABLE prescriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id       UUID REFERENCES customers(id),
  order_id          UUID REFERENCES orders(id),
  doctor_name       VARCHAR(200) NOT NULL,
  doctor_license    VARCHAR(50),
  prescription_date DATE NOT NULL,
  expiry_date       DATE,
  image_url         TEXT,
  status            VARCHAR(20) DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── prescription_items ──
CREATE TABLE prescription_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  prescription_id     UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id),
  quantity_prescribed DECIMAL(12,4) NOT NULL,
  quantity_dispensed  DECIMAL(12,4) DEFAULT 0,
  dosage              VARCHAR(200),
  duration_days       INTEGER
);

-- ══════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════════════════════════

-- App role for tenant isolation
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pos_app') THEN
    CREATE ROLE pos_app NOLOGIN;
  END IF;
END $$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO pos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pos_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO pos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pos_app;

-- Enable RLS on all tenant-scoped tables
DO $$
DECLARE
  t TEXT;
  tables_with_tenant TEXT[] := ARRAY[
    'roles','users','customers','product_categories','products','product_variants',
    'cash_registers','shifts','orders','order_items','payments','tips',
    'suppliers','ingredients','stock_movements','tax_configs','invoices','invoice_items',
    'daily_sales_summary',
    'floor_plans','zones','tables','kitchen_orders','recipes','recipe_items',
    'product_barcodes','warehouse_locations','product_locations',
    'product_batches','prescriptions','prescription_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables_with_tenant LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_%I ON %I USING (tenant_id = current_setting(''app.current_tenant'')::uuid)',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY tenant_insert_%I ON %I FOR INSERT WITH CHECK (tenant_id = current_setting(''app.current_tenant'')::uuid)',
      t, t
    );
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════
-- SEED DATA: Demo Restaurant
-- ══════════════════════════════════════════════════════════════

-- Reseller
INSERT INTO resellers (id, name, slug, country_code, contact_email, theme_config) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'POS Latam', 'pos-latam', 'PE', 'admin@poslatam.com',
   '{"primary_color":"#1B4F72","secondary_color":"#2E86C1","font":"Inter"}');

-- Tenant (Restaurant)
INSERT INTO tenants (id, reseller_id, name, slug, vertical_type, enabled_modules, tax_id, country_code, currency_code, timezone, settings) VALUES
  ('b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'Cevichería Marina', 'cevicheria-marina', 'restaurant',
   '{core,restaurant}',
   '20123456789', 'PE', 'PEN', 'America/Lima',
   '{"tax_included":true,"default_tip_percent":10,"service_charge_percent":0}');

-- Roles
INSERT INTO roles (id, tenant_id, name, slug, permissions, is_system) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Dueño', 'owner',
   '["*"]', true),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Administrador', 'admin',
   '["orders.*","products.*","inventory.*","reports.*","users.view"]', true),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Cajero', 'cashier',
   '["orders.*","payments.*","shifts.*"]', true),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Mesero', 'waiter',
   '["orders.create","orders.update","tables.view"]', true),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Cocina', 'kitchen',
   '["kitchen.*"]', true);

-- Users (password: demo123)
INSERT INTO users (id, tenant_id, email, password_hash, pin_hash, first_name, last_name, role_id) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'carlos@marina.pe', '$2b$10$rQZ8kHw3FVaGJC3pQn5OSuWzMvZI9V3IFVxVJVq2Q0aQw4kHZ1/Wy', -- demo123
   '$2b$10$abcdef1234567890abcdef1234567890abcdef1234567890ab', -- 1234
   'Carlos', 'García', 'c0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'maria@marina.pe', '$2b$10$rQZ8kHw3FVaGJC3pQn5OSuWzMvZI9V3IFVxVJVq2Q0aQw4kHZ1/Wy',
   NULL, 'María', 'López', 'c0000000-0000-0000-0000-000000000003'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'jose@marina.pe', '$2b$10$rQZ8kHw3FVaGJC3pQn5OSuWzMvZI9V3IFVxVJVq2Q0aQw4kHZ1/Wy',
   NULL, 'José', 'Ramírez', 'c0000000-0000-0000-0000-000000000004');

-- Product Categories (Restaurant menu)
INSERT INTO product_categories (id, tenant_id, name, display_order) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Entradas', 1),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Ceviches', 2),
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Platos de Fondo', 3),
  ('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Bebidas', 4),
  ('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Postres', 5);

-- Products
INSERT INTO products (id, tenant_id, category_id, name, description, price, cost, sku, tax_rate, attributes) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000001', 'Causa Limeña', 'Papa amarilla, pollo, palta', 28.00, 8.50, 'ENT-001', 0.18,
   '{"kitchen_station":"cold","prep_time_minutes":10}'),
  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000001', 'Tequeños con Huancaína', '6 unidades con salsa', 22.00, 6.00, 'ENT-002', 0.18,
   '{"kitchen_station":"grill","prep_time_minutes":8}'),
  ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000002', 'Ceviche Clásico', 'Pescado del día, limón, cebolla, ají', 42.00, 14.00, 'CEV-001', 0.18,
   '{"kitchen_station":"cold","prep_time_minutes":12}'),
  ('f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000002', 'Ceviche Mixto', 'Pescado, mariscos, pulpo', 52.00, 18.00, 'CEV-002', 0.18,
   '{"kitchen_station":"cold","prep_time_minutes":15}'),
  ('f0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000003', 'Lomo Saltado', 'Lomo fino, papas fritas, arroz', 45.00, 15.00, 'PLT-001', 0.18,
   '{"kitchen_station":"grill","prep_time_minutes":18}'),
  ('f0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000003', 'Arroz con Mariscos', 'Arroz, mariscos variados, ají panca', 48.00, 16.00, 'PLT-002', 0.18,
   '{"kitchen_station":"grill","prep_time_minutes":20}'),
  ('f0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000003', 'Ají de Gallina', 'Pollo deshilachado en crema de ají', 38.00, 12.00, 'PLT-003', 0.18,
   '{"kitchen_station":"grill","prep_time_minutes":15}'),
  ('f0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000004', 'Chicha Morada', 'Jarra personal', 12.00, 2.50, 'BEB-001', 0.18,
   '{"kitchen_station":"bar","prep_time_minutes":2}'),
  ('f0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000004', 'Pisco Sour', 'Cóctel clásico peruano', 28.00, 8.00, 'BEB-002', 0.18,
   '{"kitchen_station":"bar","prep_time_minutes":5,"is_alcoholic":true}'),
  ('f0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000005', 'Suspiro Limeño', 'Manjarblanco, merengue', 18.00, 4.00, 'POS-001', 0.18,
   '{"kitchen_station":"cold","prep_time_minutes":3}');

-- Floor Plan & Tables
INSERT INTO floor_plans (id, tenant_id, name, display_order) VALUES
  ('10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Planta Principal', 1);

INSERT INTO zones (id, tenant_id, floor_plan_id, name, color, display_order) VALUES
  ('11000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Salón', '#3498DB', 1),
  ('11000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Terraza', '#27AE60', 2),
  ('11000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Barra', '#E67E22', 3);

INSERT INTO tables (id, tenant_id, zone_id, number, capacity, shape, position_x, position_y, width, height) VALUES
  ('12000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '1', 4, 'rectangle', 50, 50, 120, 80),
  ('12000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '2', 4, 'rectangle', 200, 50, 120, 80),
  ('12000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '3', 6, 'rectangle', 350, 50, 150, 100),
  ('12000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '4', 2, 'circle', 50, 180, 80, 80),
  ('12000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '5', 2, 'circle', 170, 180, 80, 80),
  ('12000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', '6', 4, 'rectangle', 50, 50, 120, 80),
  ('12000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', '7', 4, 'rectangle', 200, 50, 120, 80),
  ('12000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', 'B1', 2, 'circle', 50, 50, 70, 70),
  ('12000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', 'B2', 2, 'circle', 150, 50, 70, 70),
  ('12000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', 'B3', 2, 'circle', 250, 50, 70, 70);

-- Cash Register
INSERT INTO cash_registers (id, tenant_id, name) VALUES
  ('13000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Caja Principal');

-- ══════════════════════════════════════════════════════════════
-- Order number sequence function
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION generate_order_number(p_tenant_id UUID)
RETURNS VARCHAR(30) AS $$
DECLARE
  next_num INTEGER;
  year_str VARCHAR(4);
BEGIN
  year_str := to_char(NOW(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(split_part(order_number, '-', 3) AS INTEGER)
  ), 0) + 1 INTO next_num
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND order_number LIKE 'ORD-' || year_str || '-%';
  RETURN 'ORD-' || year_str || '-' || lpad(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════
-- Done!
-- ══════════════════════════════════════════════════════════════
