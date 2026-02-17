import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto, PinLoginDto } from './dto/auth.dto';
export interface JwtPayload {
    sub: string;
    tenantId: string;
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
        };
        tenant: {
            id: string;
            name: string;
            isActive: boolean;
            slug: string;
        };
    }>;
    pinLogin(dto: PinLoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            firstName: any;
            lastName: any;
            avatarUrl: any;
            role: any;
            permissions: any;
        };
        tenant: any;
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
    private generateTokens;
}
