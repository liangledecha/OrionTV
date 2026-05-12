import { useCallback, useMemo } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  isAdSegment,
  filterAdsFromM3U8,
  filterAdsFromM3U8WithCustomCode,
  getSmartFilterStats,
  clearFilterCache,
} from '@/services/adFilter';

export const useAdFilter = () => {
  const { removeAds, customAdRules } = useSettingsStore();

  const isCodeMode = useMemo(() => {
    return customAdRules && customAdRules.includes('function');
  }, [customAdRules]);

  const filterM3U8 = useCallback(
    (m3u8Content: string): string => {
      if (!removeAds) {
        return m3u8Content;
      }
      return filterAdsFromM3U8WithCustomCode(m3u8Content);
    },
    [removeAds]
  );

  const checkSegment = useCallback(
    (url: string, duration?: number) => {
      if (!removeAds) {
        return { isAd: false, confidence: 0 };
      }
      return isAdSegment(url, duration);
    },
    [removeAds]
  );

  const getStats = useCallback(
    (m3u8Content: string) => {
      if (!removeAds) {
        return {
          totalSegments: 0,
          adSegments: 0,
          normalSegments: 0,
          estimatedAdDuration: 0,
          filteringEnabled: false,
        };
      }
      const stats = getSmartFilterStats(m3u8Content);
      return {
        ...stats,
        filteringEnabled: true,
      };
    },
    [removeAds]
  );

  const refreshCache = useCallback(() => {
    clearFilterCache();
  }, []);

  return {
    removeAds,
    isCodeMode,
    filterM3U8,
    checkSegment,
    getStats,
    refreshCache,
  };
};
