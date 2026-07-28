import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const host = req.headers.host || '';
    const headerTenantId = req.headers['x-tenant-id'] as string;

    let tenant = null;

    if (headerTenantId) {
      tenant = await this.prisma.tenant.findUnique({
        where: { id: headerTenantId },
        include: { settings: true },
      });
    } else if (host) {
      const hostname = host.split(':')[0]; // Remove port

      // Check custom domain
      tenant = await this.prisma.tenant.findUnique({
        where: { customDomain: hostname },
        include: { settings: true },
      });

      // If not custom domain, resolve subdomain
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

    (req as any).tenant = tenant;
    next();
  }
}
