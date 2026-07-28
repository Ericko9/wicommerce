import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async registerCustomer(tenantId: string, dto: RegisterCustomerDto) {
    if (!tenantId) {
      throw new BadRequestException('Context tenant tidak ditemukan');
    }

    const cleanEmail = dto.email.toLowerCase().trim();

    const existing = await this.prisma.customer.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: cleanEmail,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Email '${cleanEmail}' sudah terdaftar untuk toko ini.`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        name: dto.name,
        email: cleanEmail,
        passwordHash,
        phone: dto.phone || null,
      },
    });

    const token = await this.generateCustomerToken(customer.id, customer.email!, tenantId);

    return {
      message: 'Registrasi pelanggan berhasil',
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      token,
    };
  }

  async loginCustomer(tenantId: string, dto: LoginCustomerDto) {
    if (!tenantId) {
      throw new BadRequestException('Context tenant tidak ditemukan');
    }

    const cleanEmail = dto.email.toLowerCase().trim();

    const customer = await this.prisma.customer.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: cleanEmail,
        },
      },
    });

    if (!customer || customer.deletedAt || !customer.passwordHash) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const isMatch = await bcrypt.compare(dto.password, customer.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const token = await this.generateCustomerToken(customer.id, customer.email!, tenantId);

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        loyaltyPoints: customer.loyaltyPoints,
      },
      token,
    };
  }

  private async generateCustomerToken(customerId: string, email: string, tenantId: string) {
    const payload = { sub: customerId, email, tenantId, type: 'customer' };
    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'super-secret-access-token-key-change-in-prod';

    return this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: '7d',
    });
  }
}
