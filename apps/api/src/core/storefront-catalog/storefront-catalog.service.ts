import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductStatus } from '@ucp/database';
import { ProductQueryDto } from '../catalog/dto/product-query.dto';

@Injectable()
export class StorefrontCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getStoreInfo(tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('Context tenant tidak ditemukan di request');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        settings: true,
        features: {
          where: { isEnabled: true },
          include: { feature: true },
        },
      },
    });

    if (!tenant || tenant.deletedAt) {
      throw new NotFoundException('Toko tidak ditemukan');
    }

    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain,
      settings: tenant.settings,
      activeFeatures: tenant.features.map((tf) => tf.feature.key),
    };
  }

  async getCategories(tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('Context tenant tidak ditemukan');
    }

    return this.prisma.category.findMany({
      where: { tenantId },
      include: { children: true },
      orderBy: { name: 'asc' },
    });
  }

  async getProducts(tenantId: string, query: ProductQueryDto) {
    if (!tenantId) {
      throw new BadRequestException('Context tenant tidak ditemukan');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const settings = await this.prisma.tenantSetting.findUnique({
      where: { tenantId },
    });

    const where: any = {
      tenantId,
      status: ProductStatus.ACTIVE,
      deletedAt: null,
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const rawProducts = await this.prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        inventoryItems: true,
      },
    });

    let mapped = rawProducts.map((p) => {
      const totalStock = p.inventoryItems.reduce((acc, item) => acc + item.quantity, 0);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        basePrice: p.basePrice,
        category: p.category,
        images: p.images,
        totalStock,
        stockStatus: totalStock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      };
    });

    if (settings?.hideWhenOutOfStock) {
      mapped = mapped.filter((p) => p.totalStock > 0);
    }

    return {
      items: mapped,
      meta: {
        page,
        limit,
        total: mapped.length,
        totalPages: Math.ceil(mapped.length / limit),
      },
    };
  }

  async getProductBySlug(tenantId: string, slug: string): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Context tenant tidak ditemukan');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        tenantId,
        slug,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        inventoryItems: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    const totalStock = product.inventoryItems.reduce((acc, item) => acc + item.quantity, 0);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      basePrice: product.basePrice,
      category: product.category,
      images: product.images,
      variants: product.variants,
      totalStock,
      stockStatus: totalStock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
    };
  }
}
