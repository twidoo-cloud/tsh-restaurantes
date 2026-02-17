import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto, PinLoginDto } from './dto/auth.dto';

export interface JwtPayload {
  sub: string;       // user id
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: any[];
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
      include: {
        role: true,
        tenant: { select: { id: true, name: true, slug: true, isActive: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    if (!user.tenant.isActive) throw new UnauthorizedException('Cuenta de restaurante desactivada');

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      // Audit failed login
      this.audit.log({
        tenantId: user.tenantId, userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: 'login', entity: 'auth',
        description: `Intento de login fallido para ${user.email}`,
        severity: 'warning', details: { email: dto.email, reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user);

    // Audit successful login
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

  async pinLogin(dto: PinLoginDto) {
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

    if (!matchedUser) throw new UnauthorizedException('PIN inválido');

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

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET') || this.config.get('JWT_SECRET') || 'pos-jwt-secret-dev',
      });
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, isActive: true },
        include: { role: true, tenant: true },
      });
      if (!user) throw new UnauthorizedException('Token inválido');
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Token expirado o inválido');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return {
      id: user.id, email: user.email,
      firstName: user.firstName, lastName: user.lastName,
      avatarUrl: user.avatarUrl, role: user.role.slug,
      permissions: user.role.permissions,
      tenant: user.tenant,
    };
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { firstName: data.firstName, lastName: data.lastName, avatarUrl: data.avatarUrl },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Contraseña actual incorrecta');
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

  private async generateTokens(user: any) {
    const payload: JwtPayload = {
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
}
