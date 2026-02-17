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
    login(dto: LoginDto): unknown;
    pinLogin(dto: PinLoginDto): unknown;
    refreshToken(refreshToken: string): unknown;
    getProfile(userId: string): unknown;
    updateProfile(userId: string, data: {
        firstName?: string;
        lastName?: string;
        avatarUrl?: string;
    }): unknown;
    changePassword(userId: string, currentPassword: string, newPassword: string): unknown;
    private generateTokens;
}
