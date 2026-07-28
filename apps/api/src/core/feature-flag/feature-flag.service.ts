import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuditService } from '../audit/audit.service';

// Feature dependencies definition
export const FEATURE_DEPENDENCIES: Record<string, string[]> = {
  flash_sale: ['promotion_engine'],
};

@Injectable()
export class FeatureFlagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly auditService: AuditService,
  ) {}

  async getTenantFeatures(tenantId: string): Promise<any[]> {
    const allFeatures = await this.prisma.feature.findMany({
      orderBy: { key: 'asc' },
    });

    const tenantFeatures = await this.prisma.tenantFeature.findMany({
      where: { tenantId },
    });

    const tfMap = new Map(tenantFeatures.map((tf) => [tf.featureId, tf]));

    return allFeatures.map((feat) => {
      const tf = tfMap.get(feat.id);
      return {
        id: feat.id,
        key: feat.key,
        name: feat.name,
        description: feat.description,
        category: feat.category,
        isCore: feat.isCore,
        isEnabled: feat.isCore ? true : tf ? tf.isEnabled : false,
        config: tf?.config || null,
      };
    });
  }

  async toggleFeature(
    tenantId: string,
    featureKey: string,
    isEnabled: boolean,
    actorId?: string,
  ) {
    const feature = await this.prisma.feature.findUnique({
      where: { key: featureKey },
    });

    if (!feature) {
      throw new NotFoundException(`Fitur '${featureKey}' tidak ditemukan`);
    }

    // Rule 1: Cannot disable core feature
    if (feature.isCore && !isEnabled) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'CANNOT_MODIFY_CORE_FEATURE',
        message: `Fitur core '${feature.name}' tidak dapat dinonaktifkan.`,
      });
    }

    // Rule 2: Cannot disable feature if dependent features are active
    if (!isEnabled) {
      const activeDependents = await this.findActiveDependents(tenantId, featureKey);
      if (activeDependents.length > 0) {
        throw new ConflictException({
          statusCode: 409,
          error: 'FEATURE_HAS_ACTIVE_DEPENDENTS',
          message: `Tidak dapat menonaktifkan '${feature.name}' karena fitur '${activeDependents.join(
            ', ',
          )}' sedang aktif.`,
        });
      }
    }

    // Rule 3: Cannot enable feature if required dependencies are disabled
    if (isEnabled && FEATURE_DEPENDENCIES[featureKey]) {
      const requiredKeys = FEATURE_DEPENDENCIES[featureKey];
      for (const reqKey of requiredKeys) {
        const parentTf = await this.prisma.tenantFeature.findFirst({
          where: {
            tenantId,
            feature: { key: reqKey },
          },
        });
        if (!parentTf || !parentTf.isEnabled) {
          throw new BadRequestException({
            statusCode: 400,
            error: 'MISSING_FEATURE_DEPENDENCY',
            message: `Fitur '${feature.name}' membutuhkan fitur induk '${reqKey}' aktif.`,
          });
        }
      }
    }

    const existingTf = await this.prisma.tenantFeature.findUnique({
      where: {
        tenantId_featureId: {
          tenantId,
          featureId: feature.id,
        },
      },
    });

    const updatedTf = await this.prisma.tenantFeature.upsert({
      where: {
        tenantId_featureId: {
          tenantId,
          featureId: feature.id,
        },
      },
      update: { isEnabled },
      create: {
        tenantId,
        featureId: feature.id,
        isEnabled,
      },
    });

    // Invalidate Redis cache
    const cacheKey = `feature:${tenantId}:${featureKey}`;
    await this.redis.del(cacheKey);

    // Audit log
    await this.auditService.log({
      tenantId,
      actorType: actorId ? 'TENANT_USER' : 'SYSTEM',
      actorId,
      action: 'FEATURE_TOGGLE',
      entityType: 'TenantFeature',
      entityId: updatedTf.id,
      before: { isEnabled: existingTf?.isEnabled ?? false },
      after: { isEnabled: updatedTf.isEnabled },
    });

    return {
      key: feature.key,
      name: feature.name,
      isEnabled: updatedTf.isEnabled,
    };
  }

  private async findActiveDependents(tenantId: string, targetKey: string): Promise<string[]> {
    const activeDependents: string[] = [];
    for (const [depKey, parentKeys] of Object.entries(FEATURE_DEPENDENCIES)) {
      if (parentKeys.includes(targetKey)) {
        const depTf = await this.prisma.tenantFeature.findFirst({
          where: {
            tenantId,
            feature: { key: depKey },
          },
        });
        if (depTf && depTf.isEnabled) {
          activeDependents.push(depKey);
        }
      }
    }
    return activeDependents;
  }
}
