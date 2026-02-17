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
  branchId: string | null;
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
        tenant: { select: { id: true, name: true, slug: true, isActive: true, subscriptionPlan: true, subscriptionStatus: true, trialEndsAt: true, verticalType: true, countryCode: true, currencyCode: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    if (!user.tenant.isActive) throw new UnauthorizedException('Cuenta de restaurante desactivada');

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      this.audit.log({
        tenantId: user.tenantId, userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: 'login', entity: 'auth',
        description: `Intento de login fallido para ${user.email}`,
        severity: 'warning', details: { email: dto.email, reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Credenciales inválidas');
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

    // Load branches
    const branches = await this.prisma.branch.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: [{ isMain: 'desc' }, { code: 'asc' }],
    });

    return {
      user: {
        id: user.id, email: user.email,
        firstName: user.firstName, lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: user.role.slug,
        permissions: user.role.permissions,
        defaultBranchId: user.defaultBranchId,
      },
      tenant: {
        ...user.tenant,
        trialExpired: user.tenant.trialEndsAt ? new Date() > new Date(user.tenant.trialEndsAt) : false,
        trialDaysRemaining: user.tenant.trialEndsAt
          ? Math.max(0, Math.ceil((new Date(user.tenant.trialEndsAt).getTime() - Date.now()) / 86400000))
          : null,
      },
      branches,
      ...tokens,
    };
  }

  async pinLogin(dto: PinLoginDto) {
    const users = await this.prisma.user.findMany({
      where: { tenantId: dto.tenantId, isActive: true, pinHash: { not: null } },
      include: { role: true, tenant: { select: { id: true, name: true, slug: true, isActive: true, subscriptionPlan: true, subscriptionStatus: true, trialEndsAt: true, verticalType: true, countryCode: true, currencyCode: true } } },
    });

    // Compare PINs in parallel for speed
    const results = await Promise.all(
      users.map(async (user) => ({
        user,
        match: user.pinHash ? await bcrypt.compare(dto.pin, user.pinHash) : false,
      })),
    );
    const matchedUser = results.find(r => r.match)?.user;

    if (!matchedUser) throw new UnauthorizedException('PIN inválido');

    await this.prisma.user.update({
      where: { id: matchedUser.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(matchedUser);

    // Load branches
    const branches = await this.prisma.branch.findMany({
      where: { tenantId: matchedUser.tenantId, isActive: true },
      orderBy: [{ isMain: 'desc' }, { code: 'asc' }],
    });

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
        defaultBranchId: matchedUser.defaultBranchId,
      },
      tenant: {
        ...matchedUser.tenant,
        trialExpired: matchedUser.tenant.trialEndsAt ? new Date() > new Date(matchedUser.tenant.trialEndsAt) : false,
        trialDaysRemaining: matchedUser.tenant.trialEndsAt
          ? Math.max(0, Math.ceil((new Date(matchedUser.tenant.trialEndsAt).getTime() - Date.now()) / 86400000))
          : null,
      },
      branches,
      ...tokens,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true },
      include: { tenant: { select: { name: true } } },
    });

    // Siempre respondemos success para no revelar si el email existe
    if (!user) {
      return { success: true, message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' };
    }

    // Generar token de reset con JWT (expira en 30 min)
    const resetToken = this.jwt.sign(
      { sub: user.id, email: user.email, type: 'password-reset' },
      {
        secret: this.config.get('JWT_SECRET', 'pos-jwt-secret-dev') + '-reset',
        expiresIn: '30m',
      },
    );

    // TODO: Enviar email real con SMTP. Por ahora log en consola.
    const resetUrl = `${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/login?reset=${resetToken}`;
    console.log('═══════════════════════════════════════════════');
    console.log('📧 PASSWORD RESET REQUEST');
    console.log(`   User: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   Tenant: ${user.tenant.name}`);
    console.log(`   Token: ${resetToken}`);
    console.log(`   URL: ${resetUrl}`);
    console.log(`   Expires: 30 minutes`);
    console.log('═══════════════════════════════════════════════');

    this.audit.log({
      tenantId: user.tenantId, userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      action: 'password-reset-request', entity: 'auth',
      description: `Solicitud de restablecimiento de contraseña para ${user.email}`,
      severity: 'warning',
    });

    return { success: true, message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(token, {
        secret: this.config.get('JWT_SECRET', 'pos-jwt-secret-dev') + '-reset',
      });
    } catch {
      throw new BadRequestException('El enlace de restablecimiento ha expirado o es inválido');
    }

    if (payload.type !== 'password-reset') {
      throw new BadRequestException('Token inválido');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new BadRequestException('Usuario no encontrado');
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash },
    });

    this.audit.log({
      tenantId: user.tenantId, userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      action: 'password-reset', entity: 'auth',
      description: `${user.firstName} ${user.lastName} restableció su contraseña`,
      severity: 'warning',
    });

    return { success: true, message: 'Contraseña restablecida correctamente' };
  }

  async setPin(userId: string, pin: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const pinHash = await bcrypt.hash(pin, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { pinHash },
    });

    this.audit.log({
      tenantId: user.tenantId, userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      action: 'set-pin', entity: 'auth',
      description: `${user.firstName} ${user.lastName} configuró su PIN de acceso rápido`,
    });

    return { success: true };
  }

  async removePin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    await this.prisma.user.update({
      where: { id: userId },
      data: { pinHash: null },
    });

    return { success: true };
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
      hasPin: !!user.pinHash,
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

  async getPinTenants() {
    const tenantsWithPin = await this.prisma.tenant.findMany({
      where: {
        isActive: true,
        users: { some: { isActive: true, pinHash: { not: null } } },
      },
      select: { id: true, name: true, slug: true, logoUrl: true },
      orderBy: { name: 'asc' },
    });
    return tenantsWithPin;
  }

  async switchBranch(userId: string, branchId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId: user.tenantId, isActive: true },
    });
    if (!branch) throw new BadRequestException('Sucursal no encontrada o inactiva');

    await this.prisma.user.update({
      where: { id: userId },
      data: { defaultBranchId: branchId },
    });

    const updatedUser = { ...user, defaultBranchId: branchId };
    const tokens = await this.generateTokens(updatedUser);

    return { branch, ...tokens };
  }

  private async generateTokens(user: any) {
    const payload: JwtPayload = {
      sub: user.id, tenantId: user.tenantId,
      branchId: user.defaultBranchId || null,
      email: user.email,
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
