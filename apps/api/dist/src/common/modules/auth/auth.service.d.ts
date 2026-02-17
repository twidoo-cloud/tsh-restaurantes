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
    login(dto: LoginDto): unknown;
    pinLogin(dto: PinLoginDto): unknown;
    forgotPassword(email: string): unknown;
    resetPassword(token: string, newPassword: string): unknown;
    setPin(userId: string, pin: string): unknown;
    removePin(userId: string): unknown;
    refreshToken(refreshToken: string): unknown;
    getProfile(userId: string): unknown;
    updateProfile(userId: string, data: {
        firstName?: string;
        lastName?: string;
        avatarUrl?: string;
    }): unknown;
    changePassword(userId: string, currentPassword: string, newPassword: string): unknown;
    getPinTenants(): unknown;
    switchBranch(userId: string, branchId: string): unknown;
    private generateTokens;
}
