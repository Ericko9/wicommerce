import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { slugify } from '@ucp/utils';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(tenantId: string, dto: CreateCategoryDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);

    const existing = await this.prisma.category.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Kategori dengan slug '${slug}' sudah ada.`);
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, tenantId },
      });
      if (!parent) {
        throw new NotFoundException('Kategori induk tidak ditemukan.');
      }
    }

    return this.prisma.category.create({
      data: {
        tenantId,
        name: dto.name,
        slug,
        parentId: dto.parentId || null,
      },
    });
  }

  async getCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      include: {
        children: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateCategory(tenantId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });

    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan.');
    }

    let slug = category.slug;
    if (dto.slug || dto.name) {
      slug = dto.slug ? slugify(dto.slug) : slugify(dto.name || category.name);
      if (slug !== category.slug) {
        const existing = await this.prisma.category.findUnique({
          where: { tenantId_slug: { tenantId, slug } },
        });
        if (existing) {
          throw new ConflictException(`Slug '${slug}' sudah digunakan.`);
        }
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name || category.name,
        slug,
        parentId: dto.parentId !== undefined ? dto.parentId : category.parentId,
      },
    });
  }

  async deleteCategory(tenantId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });

    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan.');
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
