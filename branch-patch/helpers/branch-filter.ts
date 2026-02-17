/**
 * Branch filtering helpers for raw SQL queries and Prisma.
 *
 * Usage:
 *   import { branchCondition, branchConditionFor } from '../../helpers/branch-filter';
 *
 *   const bf = branchConditionFor('o', branchId);   // "AND o.branch_id = 'uuid'" or ""
 *   const bf2 = branchCondition(branchId);           // "AND branch_id = 'uuid'" or ""
 */

export function branchCondition(branchId: string | null | undefined): string {
  if (!branchId) return '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId)) return '';
  return `AND branch_id = '${branchId}'`;
}

export function branchConditionFor(alias: string, branchId: string | null | undefined): string {
  if (!branchId) return '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId)) return '';
  return `AND ${alias}.branch_id = '${branchId}'`;
}

export function branchWhere(branchId: string | null | undefined): Record<string, any> {
  if (!branchId) return {};
  return { branchId };
}
