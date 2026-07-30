import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const host = req.headers.host || '';
    const headerTenantId = req.headers['x-tenant-id'] as string;
    const authHeader = req.headers['authorization'] as string;

    let tenant = null;

    if (headerTenantId) {
      tenant = await this.prisma.tenant.findUnique({
        where: { id: headerTenantId },
        include: { settings: true },
      });
    }

    if (!tenant && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const secret =
          this.configService.get<string>('JWT_ACCESS_SECRET') ||
          'super-secret-access-token-key-change-in-prod';
        const payload = this.jwtService.verify(token, { secret });
        if (payload && payload.tenantId) {
          tenant = await this.prisma.tenant.findUnique({
            where: { id: payload.tenantId },
            include: { settings: true },
          });
        }
      } catch {
        // Token invalid or expired
      }
    }

    if (!tenant && host) {
      const hostname = host.split(':')[0];

      tenant = await this.prisma.tenant.findUnique({
        where: { customDomain: hostname },
        include: { settings: true },
      });

      if (!tenant && hostname.includes('.')) {
        const parts = hostname.split('.');
        if (parts.length >= 2) {
          const subdomain = parts[0];
          if (subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'admin') {
            tenant = await this.prisma.tenant.findUnique({
              where: { subdomain },
              include: { settings: true },
            });
          }
        }
      }
    }

    if (!tenant) {
      tenant = await this.prisma.tenant.findFirst({
        where: { status: 'ACTIVE' },
        include: { settings: true },
      });
    }

    (req as any).tenant = tenant;
    next();
  }
}
