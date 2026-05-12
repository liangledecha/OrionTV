import Logger from '@/utils/Logger';
import { isAdSegment } from '@/services/adFilter';

const logger = Logger.withTag('AdFilterCache');

interface AdCheckResult {
  url: string;
  isAd: boolean;
  reason?: string;
  confidence: number;
  timestamp: number;
}

interface EpisodeAdInfo {
  episodeIndex: number;
  isAd: boolean;
  adSegments: { index: number; url: string; reason: string }[];
}

class AdFilterCacheManager {
  private cache: Map<string, AdCheckResult> = new Map();
  private episodeCache: Map<string, EpisodeAdInfo[]> = new Map();
  private cacheDuration = 300000;
  private maxCacheSize = 500;

  clear(): void {
    this.cache.clear();
    this.episodeCache.clear();
    logger.info('AdFilterCache cleared');
  }

  getCacheKey(source: string, id: string, url: string): string {
    return `${source}:${id}:${url}`;
  }

  getEpisodeCacheKey(source: string, id: string): string {
    return `${source}:${id}`;
  }

  checkUrl(url: string): AdCheckResult {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      logger.debug(`AdFilterCache HIT: ${url.substring(0, 50)}...`);
      return cached;
    }

    logger.debug(`AdFilterCache MISS: ${url.substring(0, 50)}...`);
    const result = isAdSegment(url);
    const cacheEntry: AdCheckResult = {
      url,
      isAd: result.isAd,
      reason: result.reason,
      confidence: result.confidence,
      timestamp: Date.now(),
    };

    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(url, cacheEntry);
    return cacheEntry;
  }

  checkEpisodeList(
    source: string,
    id: string,
    episodes: string[]
  ): EpisodeAdInfo[] {
    const cacheKey = this.getEpisodeCacheKey(source, id);
    const cached = this.episodeCache.get(cacheKey);
    
    if (cached) {
      logger.info(`Episode ad cache HIT for ${source}:${id}`);
      return cached;
    }

    logger.info(`Episode ad cache MISS - checking ${episodes.length} episodes`);
    const results: EpisodeAdInfo[] = [];

    for (let i = 0; i < episodes.length; i++) {
      const url = episodes[i];
      const checkResult = this.checkUrl(url);
      
      results.push({
        episodeIndex: i,
        isAd: checkResult.isAd,
        adSegments: checkResult.isAd ? [{
          index: i,
          url: url,
          reason: checkResult.reason || 'unknown',
        }] : [],
      });
    }

    this.episodeCache.set(cacheKey, results);
    logger.info(`Episode ad cache saved for ${source}:${id} - ${results.filter(r => r.isAd).length} ad episodes found`);

    return results;
  }

  isEpisodeAd(source: string, id: string, episodeIndex: number): boolean {
    const cacheKey = this.getEpisodeCacheKey(source, id);
    const cached = this.episodeCache.get(cacheKey);
    
    if (cached && cached[episodeIndex]) {
      return cached[episodeIndex].isAd;
    }

    return false;
  }

  getAdStats(source: string, id: string): {
    total: number;
    adCount: number;
    adPercentage: number;
  } {
    const cacheKey = this.getEpisodeCacheKey(source, id);
    const cached = this.episodeCache.get(cacheKey);
    
    if (!cached) {
      return { total: 0, adCount: 0, adPercentage: 0 };
    }

    const adCount = cached.filter(e => e.isAd).length;
    return {
      total: cached.length,
      adCount,
      adPercentage: cached.length > 0 ? (adCount / cached.length) * 100 : 0,
    };
  }

  invalidate(source?: string, id?: string): void {
    if (source && id) {
      const cacheKey = this.getEpisodeCacheKey(source, id);
      this.episodeCache.delete(cacheKey);
      logger.info(`Episode ad cache invalidated for ${source}:${id}`);
    } else {
      this.episodeCache.clear();
      logger.info('All episode ad caches invalidated');
    }
  }
}

export const adFilterCache = new AdFilterCacheManager();
