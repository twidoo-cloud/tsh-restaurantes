# TSH v2.6.0 — Branch Filtering Patch

## What This Fixes
- Branch switching now actually filters data in ALL modules
- JWT is the single source of truth for branchId (no more query params)
- Dashboard, Kitchen, Shifts, Reports, Inventory — all filter by active branch

## Installation

```bash
cd ~/Documents/Proyectos/pos-sas

# ── 1. Create helpers directory ──
mkdir -p apps/api/src/common/helpers

# ── 2. Copy branch filter helper ──
cp branch-patch/helpers/branch-filter.ts \
   apps/api/src/common/helpers/branch-filter.ts

# ── 3. Fix JWT Strategy (ROOT CAUSE) ──
cp branch-patch/auth/strategies/jwt.strategy.ts \
   apps/api/src/common/modules/auth/strategies/jwt.strategy.ts

# ── 4. Dashboard (simplified — no more query params) ──
cp branch-patch/dashboard/dashboard.controller.ts \
   apps/api/src/common/modules/dashboard/dashboard.controller.ts

# ── 5. Kitchen ──
cp branch-patch/kitchen/kitchen.controller.ts \
   apps/api/src/common/modules/kitchen/kitchen.controller.ts
cp branch-patch/kitchen/kitchen.service.ts \
   apps/api/src/common/modules/kitchen/kitchen.service.ts

# ── 6. Shifts ──
cp branch-patch/shifts/shifts.controller.ts \
   apps/api/src/common/modules/shifts/shifts.controller.ts
cp branch-patch/shifts/shifts.service.ts \
   apps/api/src/common/modules/shifts/shifts.service.ts

# ── 7. Reports ──
cp branch-patch/reports/reports.controller.ts \
   apps/api/src/common/modules/reports/reports.controller.ts
cp branch-patch/reports/reports.service.ts \
   apps/api/src/common/modules/reports/reports.service.ts

# ── 8. Inventory ──
cp branch-patch/inventory/inventory.controller.ts \
   apps/api/src/common/modules/inventory/inventory.controller.ts
cp branch-patch/inventory/inventory.service.ts \
   apps/api/src/common/modules/inventory/inventory.service.ts
```

## Frontend Change (Dashboard)

In `apps/web/src/app/dashboard/page.tsx`, remove the `apiGet` helper function
and replace all `apiGet(url)` calls with just `api.get(url)`.

The `?branchId=` query parameter is no longer needed — the JWT handles it now.

## What Changed — Summary

| File | Change |
|------|--------|
| `jwt.strategy.ts` | Added `branchId` to validate() return — was MISSING |
| `branch-filter.ts` | NEW helper with `branchConditionFor()` for SQL filtering |
| `dashboard.controller.ts` | Removed `resolveBranch` and `@Query('branchId')` |
| `kitchen.controller.ts` | Added `@CurrentBranch()` to getOrders, getReady, getStats |
| `kitchen.service.ts` | Added `branchConditionFor('ko', branchId)` to queries |
| `shifts.controller.ts` | Added `@CurrentBranch()` to getCashRegisters, getActiveShift, openShift, getShifts |
| `shifts.service.ts` | Branch filter on cash_registers + shifts queries, branch_id on INSERT |
| `reports.controller.ts` | Added `@CurrentBranch()` to all 7 endpoints |
| `reports.service.ts` | Branch filter on all order-based queries |
| `inventory.controller.ts` | Added `@CurrentBranch()` to movements and recordMovement |
| `inventory.service.ts` | Branch filter on stock_movements (products are shared tenant-level) |

## How It Works

```
User switches branch → POST /auth/switch-branch
  → New JWT with branchId
  → Saved to localStorage
  → router.refresh()

Any API call → Bearer token in header
  → jwt.strategy.ts extracts branchId ← WAS MISSING
  → @CurrentBranch() reads from request.user.branchId
  → Controller passes to service
  → Service adds WHERE branch_id = ? to SQL
  → Returns filtered data
```

## NOT modified (no branch filter needed)
- **Products** — Shared tenant-level (same menu all branches)
- **Categories** — Shared tenant-level
- **Customers** — Shared tenant-level  
- **Promotions** — Shared tenant-level
- **Recipes** — Shared tenant-level
- **Suppliers** — Shared tenant-level
- **Reservations** — Queried by date/table, not branch-dependent
- **Tables controller** — Needs branch filter on zones/tables (Phase 2)
- **Delivery** — Needs branch filter on delivery_orders/zones (Phase 2)
