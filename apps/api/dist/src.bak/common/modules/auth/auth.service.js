"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../../prisma.service");
const audit_service_1 = require("../audit/audit.service");
let AuthService = class AuthService {
    constructor(prisma, jwt, config, audit) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
        this.audit = audit;
    }
    async login(dto) {
        const user = await this.prisma.user.findFirst({
            where: { email: dto.email, isActive: true },
            include: {
                role: true,
                tenant: { select: { id: true, name: true, slug: true, isActive: true } },
            },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        if (!user.tenant.isActive)
            throw new common_1.UnauthorizedException('Cuenta de restaurante desactivada');
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            this.audit.log({
                tenantId: user.tenantId, userId: user.id,
                userName: `${user.firstName} ${user.lastName}`,
                action: 'login', entity: 'auth',
                description: `Intento de login fallido para ${user.email}`,
                severity: 'warning', details: { email: dto.email, reason: 'invalid_password' },
            });
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const tokens = await this.generateTokens(user);
        this.audit.log({
            tenantId: user.tenantId, userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            userRole: user.role.slug,
            action: 'login', entity: 'auth',
            description: `${user.firstName} ${user.lastName} inició sesión`,
            details: { email: user.email, role: user.role.slug },
        });
        return {
            user: {
                id: user.id, email: user.email,
                firstName: user.firstName, lastName: user.lastName,
                avatarUrl: user.avatarUrl,
                role: user.role.slug,
                permissions: user.role.permissions,
            },
            tenant: user.tenant,
            ...tokens,
        };
    }
    async pinLogin(dto) {
        const users = await this.prisma.user.findMany({
            where: { tenantId: dto.tenantId, isActive: true, pinHash: { not: null } },
            include: { role: true, tenant: { select: { id: true, name: true, slug: true, isActive: true } } },
        });
        let matchedUser = null;
        for (const user of users) {
            if (user.pinHash && await bcrypt.compare(dto.pin, user.pinHash)) {
                matchedUser = user;
                break;
            }
        }
        if (!matchedUser)
            throw new common_1.UnauthorizedException('PIN inválido');
        await this.prisma.user.update({
            where: { id: matchedUser.id },
            data: { lastLoginAt: new Date() },
        });
        const tokens = await this.generateTokens(matchedUser);
        this.audit.log({
            tenantId: matchedUser.tenantId, userId: matchedUser.id,
            userName: `${matchedUser.firstName} ${matchedUser.lastName}`,
            userRole: matchedUser.role.slug,
            action: 'login', entity: 'auth',
            description: `${matchedUser.firstName} ${matchedUser.lastName} inició sesión con PIN`,
            details: { method: 'pin', role: matchedUser.role.slug },
        });
        return {
            user: {
                id: matchedUser.id, email: matchedUser.email,
                firstName: matchedUser.firstName, lastName: matchedUser.lastName,
                avatarUrl: matchedUser.avatarUrl,
                role: matchedUser.role.slug,
                permissions: matchedUser.role.permissions,
            },
            tenant: matchedUser.tenant,
            ...tokens,
        };
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwt.verify(refreshToken, {
                secret: this.config.get('JWT_REFRESH_SECRET') || this.config.get('JWT_SECRET') || 'pos-jwt-secret-dev',
            });
            const user = await this.prisma.user.findFirst({
                where: { id: payload.sub, isActive: true },
                include: { role: true, tenant: true },
            });
            if (!user)
                throw new common_1.UnauthorizedException('Token inválido');
            return this.generateTokens(user);
        }
        catch {
            throw new common_1.UnauthorizedException('Token expirado o inválido');
        }
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true, tenant: { select: { id: true, name: true, slug: true } } },
        });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        return {
            id: user.id, email: user.email,
            firstName: user.firstName, lastName: user.lastName,
            avatarUrl: user.avatarUrl, role: user.role.slug,
            permissions: user.role.permissions,
            tenant: user.tenant,
        };
    }
    async updateProfile(userId, data) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { firstName: data.firstName, lastName: data.lastName, avatarUrl: data.avatarUrl },
        });
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid)
            throw new common_1.BadRequestException('Contraseña actual incorrecta');
        const hash = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
        this.audit.log({
            tenantId: user.tenantId, userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            action: 'update', entity: 'auth',
            description: `${user.firstName} ${user.lastName} cambió su contraseña`,
            severity: 'warning',
        });
        return { success: true };
    }
    async generateTokens(user) {
        const payload = {
            sub: user.id, tenantId: user.tenantId, email: user.email,
            firstName: user.firstName, lastName: user.lastName,
            role: user.role.slug, permissions: user.role.permissions || [],
        };
        const accessToken = this.jwt.sign(payload);
        const refreshToken = this.jwt.sign(payload, {
            secret: this.config.get('JWT_REFRESH_SECRET') || this.config.get('JWT_SECRET') || 'pos-jwt-secret-dev',
            expiresIn: this.config.get('JWT_REFRESH_EXPIRATION', '7d'),
        });
        return { accessToken, refreshToken };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        audit_service_1.AuditService])
], AuthService);
//# sourceMappingURL=auth.service.js.map