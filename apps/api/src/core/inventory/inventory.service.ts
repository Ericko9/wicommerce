import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AdjustInventoryDto, InventoryAdjustmentType } from './dto/adjust-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getInventory(tenantId: string) {
    const defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { tenantId, isDefault: true },
    });

    if (!defaultWarehouse) {
      return [];
    }

    return this.prisma.inventoryItem.findMany({
      where: {
        tenantId,
        warehouseId: defaultWarehouse.id,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            status: true,
          },
        },
        warehouse: true,
      },
    });
  }

  async adjustInventory(tenantId: string, dto: AdjustInventoryDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    let defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { tenantId, isDefault: true },
    });

    if (!defaultWarehouse) {
      defaultWarehouse = await this.prisma.warehouse.create({
        data: {
          tenantId,
          name: 'Gudang Utama',
          isDefault: true,
        },
      });
    }

    const warehouseId = defaultWarehouse.id;

    return this.prisma.$transaction(async (tx) => {
      let item = await tx.inventoryItem.findFirst({
        where: {
          tenantId,
          productId: dto.productId,
          warehouseId,
        },
      });

      if (!item) {
        item = await tx.inventoryItem.create({
          data: {
            tenantId,
            productId: dto.productId,
            warehouseId,
            quantity: 0,
          },
        });
      }

      let newQuantity = item.quantity;
      if (dto.type === InventoryAdjustmentType.IN) {
        newQuantity += dto.quantity;
      } else if (dto.type === InventoryAdjustmentType.OUT) {
        newQuantity -= dto.quantity;
      } else if (dto.type === InventoryAdjustmentType.SET) {
        newQuantity = dto.quantity;
      }

      if (newQuantity < 0) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'INVALID_STOCK',
          message: `Stok tidak boleh kurang dari 0 (Stok saat ini: ${item.quantity}, Penyesuaian: ${dto.quantity})`,
        });
      }

      const updated = await tx.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: newQuantity },
        include: {
          product: true,
          warehouse: true,
        },
      });

      return updated;
    });
  }
}
