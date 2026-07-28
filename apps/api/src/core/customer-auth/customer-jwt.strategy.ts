import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface CustomerJwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  type: 'customer';
}

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') ||
        'super-secret-access-token-key-change-in-prod',
    });
  }

  async validate(payload: CustomerJwtPayload) {
    if (payload.type !== 'customer') {
      throw new UnauthorizedException('Token type invalid');
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.sub },
    });

    if (!customer || customer.deletedAt) {
      throw new UnauthorizedException('Customer not found or inactive');
    }

    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      tenantId: customer.tenantId,
      phone: customer.phone,
    };
  }
}
