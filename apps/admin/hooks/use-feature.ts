'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';

export interface TenantFeatureItem {
  id: string;
  key: string;
  name: string;
  description?: string;
  category: string;
  isCore: boolean;
  isEnabled: boolean;
  config?: Record<string, any>;
}

export function useTenantFeatures() {
  return useQuery<TenantFeatureItem[]>({
    queryKey: queryKeys.features.all,
    queryFn: async () => {
      const res: any = await apiClient.get('/admin/features');
      return res.data || res;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache aligned with backend Redis
  });
}

export function useFeature(key: string): {
  isEnabled: boolean;
  isLoading: boolean;
  isCore: boolean;
  config?: Record<string, any>;
  feature?: TenantFeatureItem;
} {
  const { data: features, isLoading } = useTenantFeatures();

  const feature = features?.find((f) => f.key === key);

  return {
    isEnabled: feature?.isEnabled ?? false,
    isLoading,
    isCore: feature?.isCore ?? false,
    config: feature?.config,
    feature,
  };
}
