import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenant?.id || request.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant context required to evaluate feature flags');
    }

    const cacheKey = `feature:${tenantId}:${requiredFeature}`;
    const cachedStatus = await this.redis.get(cacheKey);

    if (cachedStatus !== null) {
      if (cachedStatus === 'true') return true;
      throw new ForbiddenException({
        statusCode: 403,
        error: 'FEATURE_DISABLED',
        message: `Fitur '${requiredFeature}' tidak aktif untuk tenant ini.`,
      });
    }

    // Fallback to DB query
    const featureMeta = await this.prisma.feature.findUnique({
      where: { key: requiredFeature },
    });

    if (featureMeta?.isCore) {
      await this.redis.set(cacheKey, 'true', 300);
      return true;
    }

    const tf = await this.prisma.tenantFeature.findFirst({
      where: {
        tenantId,
        feature: { key: requiredFeature },
      },
      include: { feature: true },
    });

    const isEnabled = tf ? tf.isEnabled : false;

    // Cache status for 5 minutes (300 seconds)
    await this.redis.set(cacheKey, isEnabled ? 'true' : 'false', 300);

    if (isEnabled) {
      return true;
    }

    throw new ForbiddenException({
      statusCode: 403,
      error: 'FEATURE_DISABLED',
      message: `Fitur '${requiredFeature}' tidak aktif untuk tenant ini.`,
    });
  }
}
