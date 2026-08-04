import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { LoginTenantUserDto } from './dto/login-tenant-user.dto';
import { TenantRole, TenantStatus } from '@ucp/database';

export const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'app', 'mail', 'support', 'staging'];

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async registerTenant(dto: RegisterTenantDto) {
    const cleanStoreName = dto.storeName.replace(/<[^>]*>/g, '').trim();
    const cleanOwnerName = dto.ownerName.replace(/<[^>]*>/g, '').trim();
    const cleanSubdomain = dto.subdomain.toLowerCase().trim();

    if (RESERVED_SUBDOMAINS.includes(cleanSubdomain)) {
      throw new BadRequestException(`Subdomain '${cleanSubdomain}' tidak dapat digunakan.`);
    }

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { subdomain: cleanSubdomain },
    });

    if (existingTenant) {
      throw new ConflictException(`Subdomain '${cleanSubdomain}' sudah terdaftar.`);
    }

    const planKey = dto.planKey || 'basic';
    const plan = await this.prisma.plan.findUnique({
      where: { key: planKey },
      include: { features: true },
    });

    if (!plan) {
      throw new NotFoundException(`Plan '${planKey}' tidak ditemukan.`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const planFeatureIds = new Set(plan.features.map((pf) => pf.featureId));

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: cleanStoreName,
          subdomain: cleanSubdomain,
          planId: plan.id,
          status: TenantStatus.ACTIVE,
          settings: {
            create: {
              storeName: cleanStoreName,
            },
          },
        },
      });

      const owner = await tx.tenantUser.create({
        data: {
          tenantId: tenant.id,
          name: cleanOwnerName,
          email: dto.ownerEmail.toLowerCase().trim(),
          passwordHash,
          role: TenantRole.OWNER,
        },
      });

      const allFeatures = await tx.feature.findMany();
      const tenantFeaturesData = allFeatures.map((feat) => ({
        tenantId: tenant.id,
        featureId: feat.id,
        isEnabled: feat.isCore || planFeatureIds.has(feat.id),
      }));

      await tx.tenantFeature.createMany({
        data: tenantFeaturesData,
      });

      return { tenant, owner };
    });

    await this.auditService.log({
      tenantId: result.tenant.id,
      actorType: 'TENANT_USER',
      actorId: result.owner.id,
      action: 'TENANT_CREATED',
      entityType: 'Tenant',
      entityId: result.tenant.id,
      after: { name: result.tenant.name, subdomain: result.tenant.subdomain },
    });

    const tokens = await this.generateTokens(
      result.owner.id,
      result.owner.email,
      result.tenant.id,
      result.owner.role,
    );

    return {
      message: 'Registrasi tenant berhasil',
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        subdomain: result.tenant.subdomain,
      },
      user: {
        id: result.owner.id,
        name: result.owner.name,
        email: result.owner.email,
        role: result.owner.role,
      },
      tokens,
    };
  }

  async loginTenantUser(dto: LoginTenantUserDto, currentTenantId?: string) {
    const cleanEmail = dto.email.toLowerCase().trim();

    let tenantId = currentTenantId;

    if (dto.subdomain) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { subdomain: dto.subdomain },
      });
      if (!tenant) {
        throw new UnauthorizedException('Tenant tidak ditemukan');
      }
      tenantId = tenant.id;
    }

    let user;
    if (tenantId) {
      user = await this.prisma.tenantUser.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email: cleanEmail,
          },
        },
      });
    }

    if (!user) {
      user = await this.prisma.tenantUser.findFirst({
        where: { email: cleanEmail },
      });
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);

    return {
      message: 'Login berhasil',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      },
      tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token tidak ditemukan');
    }

    try {
      const secret =
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'super-secret-refresh-token-key-change-in-prod';
      const payload = this.jwtService.verify(refreshToken, { secret });

      const user = await this.prisma.tenantUser.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User tidak aktif atau tidak ditemukan');
      }

      return this.generateTokens(user.id, user.email, user.tenantId, user.role);
    } catch {
      throw new UnauthorizedException('Refresh token tidak valid atau kadaluarsa');
    }
  }

  private async generateTokens(
    userId: string,
    email: string,
    tenantId: string,
    role: TenantRole,
  ) {
    const payload = { sub: userId, email, tenantId, role };

    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'super-secret-access-token-key-change-in-prod';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'super-secret-refresh-token-key-change-in-prod';

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 mins
    };
  }
}
