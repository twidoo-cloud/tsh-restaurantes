import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the tenant_id from the authenticated user's JWT.
 * Usage: @CurrentTenant() tenantId: string
 */
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId;
  },
);

/**
 * Extracts the branch_id from the authenticated user's JWT.
 * Usage: @CurrentBranch() branchId: string | null
 */
export const CurrentBranch = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.branchId || null;
  },
);

/**
 * Extracts the full user object from the JWT.
 * Usage: @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
