import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto, PinLoginDto } from './dto/auth.dto';
export interface JwtPayload {
    sub: string;
    tenantId: string;
    branchId: string | null;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    permissions: any[];
}
export declare class AuthService {
    private prisma;
    private jwt;
    private config;
    private audit;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService, audit: AuditService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            avatarUrl: string;
            role: string;
            permissions: import("@prisma/client/runtime/library").JsonValue;
            defaultBranchId: string;
        };
        tenant: {
            trialExpired: boolean;
            trialDaysRemaining: number;
            id: string;
            name: string;
            isActive: boolean;
            slug: string;
            verticalType: string;
            countryCode: string;
            currencyCode: string;
            subscriptionPlan: string;
            subscriptionStatus: string;
            trialEndsAt: Date;
        };
        branches: {
            id: string;
            tenantId: string;
            createdAt: Date;
            name: string;
            email: string | null;
            isActive: boolean;
            updatedAt: Date;
            address: import("@prisma/client/runtime/library").JsonValue | null;
            phone: string | null;
            settings: import("@prisma/client/runtime/library").JsonValue;
            code: string;
            establecimientoSri: string;
            puntoEmisionSri: string;
            isMain: boolean;
        }[];
    }>;
    pinLogin(dto: PinLoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            avatarUrl: string;
            role: string;
            permissions: import("@prisma/client/runtime/library").JsonValue;
            defaultBranchId: string;
        };
        tenant: {
            trialExpired: boolean;
            trialDaysRemaining: number;
            id: string;
            name: string;
            isActive: boolean;
            slug: string;
            verticalType: string;
            countryCode: string;
            currencyCode: string;
            subscriptionPlan: string;
            subscriptionStatus: string;
            trialEndsAt: Date;
        };
        branches: {
            id: string;
            tenantId: string;
            createdAt: Date;
            name: string;
            email: string | null;
            isActive: boolean;
            updatedAt: Date;
            address: import("@prisma/client/runtime/library").JsonValue | null;
            phone: string | null;
            settings: import("@prisma/client/runtime/library").JsonValue;
            code: string;
            establecimientoSri: string;
            puntoEmisionSri: string;
            isMain: boolean;
        }[];
    }>;
    forgotPassword(email: string): Promise<{
        success: boolean;
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        success: boolean;
        message: string;
    }>;
    setPin(userId: string, pin: string): Promise<{
        success: boolean;
    }>;
    removePin(userId: string): Promise<{
        success: boolean;
    }>;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        avatarUrl: string;
        role: string;
        permissions: import("@prisma/client/runtime/library").JsonValue;
        hasPin: boolean;
        tenant: {
            id: string;
            name: string;
            slug: string;
        };
    }>;
    updateProfile(userId: string, data: {
        firstName?: string;
        lastName?: string;
        avatarUrl?: string;
    }): Promise<{
        id: string;
        tenantId: string;
        createdAt: Date;
        email: string;
        roleId: string;
        passwordHash: string;
        pinHash: string | null;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        defaultBranchId: string | null;
        updatedAt: Date;
    }>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        success: boolean;
    }>;
    getPinTenants(): Promise<{
        id: string;
        name: string;
        slug: string;
        logoUrl: string;
    }[]>;
    switchBranch(userId: string, branchId: string): Promise<{
        accessToken: string;
        refreshToken: string;
        branch: {
            id: string;
            tenantId: string;
            createdAt: Date;
            name: string;
            email: string | null;
            isActive: boolean;
            updatedAt: Date;
            address: import("@prisma/client/runtime/library").JsonValue | null;
            phone: string | null;
            settings: import("@prisma/client/runtime/library").JsonValue;
            code: string;
            establecimientoSri: string;
            puntoEmisionSri: string;
            isMain: boolean;
        };
    }>;
    private generateTokens;
}
