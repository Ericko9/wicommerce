import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface UpdateTenantSettingDto {
  storeName?: string;
  logoUrl?: string;
  themeColor?: string;
  paymentDueHours?: number;
  hideWhenOutOfStock?: boolean;
  loyaltyPointRatio?: number;
}

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(tenantId: string) {
    const settings = await this.prisma.tenantSetting.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      throw new NotFoundException('Setting tenant tidak ditemukan');
    }

    return settings;
  }

  async updateSettings(tenantId: string, dto: UpdateTenantSettingDto) {
    const settings = await this.prisma.tenantSetting.update({
      where: { tenantId },
      data: dto,
    });

    return settings;
  }
}
