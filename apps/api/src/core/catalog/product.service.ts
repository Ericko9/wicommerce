import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { S3Service } from '../../common/s3/s3.service';
import { slugify } from '@ucp/utils';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductStatus } from '@ucp/database';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PRODUCT_IMAGES = 8;

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async createProduct(tenantId: string, dto: CreateProductDto) {
    let baseSlug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    let slug = baseSlug;
    let counter = 1;

    while (
      await this.prisma.product.findUnique({
        where: { tenantId_slug: { tenantId, slug } },
      })
    ) {
      slug = `${baseSlug}-${counter++}`;
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, tenantId },
      });
      if (!category) {
        throw new NotFoundException('Kategori tidak ditemukan');
      }
    }

    // Resolve or create default warehouse
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
      const product = await tx.product.create({
        data: {
          tenantId,
          name: dto.name,
          slug,
          description: dto.description || null,
          basePrice: dto.basePrice,
          categoryId: dto.categoryId || null,
          status: dto.status || ProductStatus.DRAFT,
        },
      });

      // Default single variant (implicit core variant)
      const variant = await tx.productVariant.create({
        data: {
          productId: product.id,
          sku: slug,
          name: dto.name,
        },
      });

      // Create initial inventory item
      await tx.inventoryItem.create({
        data: {
          tenantId,
          productId: product.id,
          variantId: variant.id,
          warehouseId,
          quantity: dto.initialQuantity || 0,
        },
      });

      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          category: true,
          images: true,
          inventoryItems: {
            include: { warehouse: true },
          },
        },
      });
    });
  }

  async getProducts(tenantId: string, query: ProductQueryDto) {
    const page = Math.max(1, query.page || 1);
    const rawLimit = query.limit || 20;
    const limit = Math.min(Math.max(1, Number(rawLimit)), 100);
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
          inventoryItems: {
            include: { warehouse: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductById(tenantId: string, id: string): Promise<any> {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        inventoryItems: {
          include: { warehouse: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    return product;
  }

  async updateProduct(tenantId: string, id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    let slug = product.slug;
    if (dto.slug || dto.name) {
      const candidateSlug = dto.slug ? slugify(dto.slug) : slugify(dto.name || product.name);
      if (candidateSlug !== product.slug) {
        const existing = await this.prisma.product.findUnique({
          where: { tenantId_slug: { tenantId, slug: candidateSlug } },
        });
        if (existing) {
          throw new ConflictException(`Slug '${candidateSlug}' sudah digunakan`);
        }
        slug = candidateSlug;
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name || product.name,
        slug,
        description: dto.description !== undefined ? dto.description : product.description,
        basePrice: dto.basePrice !== undefined ? dto.basePrice : product.basePrice,
        categoryId: dto.categoryId !== undefined ? dto.categoryId : product.categoryId,
        status: dto.status || product.status,
      },
      include: {
        category: true,
        images: true,
        inventoryItems: true,
      },
    });
  }

  async deleteProduct(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    // Soft delete
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getPresignedImageUploadUrl(
    tenantId: string,
    productId: string,
    fileName: string,
    fileType: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
      throw new BadRequestException(
        `Format file '${fileType}' tidak didukung. Gunakan jpg, png, atau webp.`,
      );
    }

    const key = `tenants/${tenantId}/products/${productId}/${Date.now()}-${slugify(fileName)}`;
    return this.s3Service.getPresignedUploadUrl(key, fileType);
  }

  async addProductImage(tenantId: string, productId: string, url: string, sortOrder = 0) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    if (product.images.length >= MAX_PRODUCT_IMAGES) {
      throw new BadRequestException(`Maksimal ${MAX_PRODUCT_IMAGES} gambar per produk.`);
    }

    return this.prisma.productImage.create({
      data: {
        productId,
        url,
        sortOrder,
      },
    });
  }

  async deleteProductImage(tenantId: string, productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: {
        id: imageId,
        product: { id: productId, tenantId },
      },
    });

    if (!image) {
      throw new NotFoundException('Gambar produk tidak ditemukan');
    }

    return this.prisma.productImage.delete({
      where: { id: imageId },
    });
  }

  // =========================================
  // PRODUCT VARIANTS (Requires 'product_variants' feature)
  // =========================================

  async createVariant(tenantId: string, productId: string, dto: import('./dto/variant.dto').CreateVariantDto): Promise<any> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    const existingSku = await this.prisma.productVariant.findUnique({
      where: {
        productId_sku: {
          productId,
          sku: dto.sku,
        },
      },
    });

    if (existingSku) {
      throw new ConflictException(`SKU '${dto.sku}' sudah digunakan untuk produk ini`);
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

    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.create({
        data: {
          productId,
          sku: dto.sku,
          name: dto.name,
          price: dto.price !== undefined ? dto.price : null,
          attributes: dto.attributes ? JSON.parse(JSON.stringify(dto.attributes)) : null,
        },
      });

      await tx.inventoryItem.create({
        data: {
          tenantId,
          productId,
          variantId: variant.id,
          warehouseId: defaultWarehouse!.id,
          quantity: dto.initialQuantity || 0,
        },
      });

      return tx.productVariant.findUnique({
        where: { id: variant.id },
        include: { inventoryItems: true },
      });
    });
  }

  async getVariants(tenantId: string, productId: string): Promise<any> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    return this.prisma.productVariant.findMany({
      where: { productId },
      include: { inventoryItems: true },
    });
  }

  async updateVariant(
    tenantId: string,
    productId: string,
    variantId: string,
    dto: import('./dto/variant.dto').UpdateVariantDto,
  ): Promise<any> {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        product: { id: productId, tenantId, deletedAt: null },
      },
    });

    if (!variant) {
      throw new NotFoundException('Varian produk tidak ditemukan');
    }

    if (dto.sku && dto.sku !== variant.sku) {
      const existing = await this.prisma.productVariant.findUnique({
        where: { productId_sku: { productId, sku: dto.sku } },
      });
      if (existing) {
        throw new ConflictException(`SKU '${dto.sku}' sudah digunakan`);
      }
    }

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        sku: dto.sku || variant.sku,
        name: dto.name || variant.name,
        price: dto.price !== undefined ? dto.price : variant.price,
        attributes: dto.attributes ? JSON.parse(JSON.stringify(dto.attributes)) : variant.attributes,
      },
      include: { inventoryItems: true },
    });
  }

  async deleteVariant(tenantId: string, productId: string, variantId: string): Promise<any> {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        product: { id: productId, tenantId, deletedAt: null },
      },
    });

    if (!variant) {
      throw new NotFoundException('Varian produk tidak ditemukan');
    }

    return this.prisma.productVariant.delete({
      where: { id: variantId },
    });
  }
}
