import Logger from '@/utils/Logger';
import { useSettingsStore } from '@/stores/settingsStore';

const logger = Logger.withTag('AdFilter');

const DEFAULT_AD_KEYWORDS = [
  'sponsor',
  '/ad/',
  '/ads/',
  'advert',
  'advertisement',
  '/adjump',
  'redtraffic',
  'click',
  'vast',
  'ima.',
  'doubleclick',
  'googlesyndication',
  'googleadservices',
  'adnxs',
  'adsrvr',
  'adsystem',
  'adform',
  'criteo',
  'taboola',
  'outbrain',
  'mgid',
  'propeller',
  'revcontent',
];

const DEFAULT_AD_HOSTS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adnxs.com',
  'adsrvr.org',
  'adform.net',
  'criteo.com',
  'criteo.net',
  'taboola.com',
  'outbrain.com',
  'mgid.com',
  'propellerads.com',
  'revcontent.com',
  'moatads.com',
  'adsafeprotected.com',
  'adblade.com',
  'bidswitch.net',
  'casalemedia.com',
  'contextweb.com',
  'amazon-adsystem.com',
];

const AD_DURATION_RANGES = {
  min: 5,
  max: 60,
};

interface AdRule {
  type: 'keyword' | 'host' | 'duration' | 'regex';
  pattern: string;
  weight: number;
}

interface FilterResult {
  isAd: boolean;
  reason?: string;
  confidence: number;
}

interface ParsedM3U8Segment {
  url: string;
  duration: number;
  lineIndex: number;
}

let cachedKeywords: string[] | null = null;
let cachedHosts: string[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000;

const getAdKeywords = (): string[] => {
  if (cachedKeywords && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedKeywords;
  }

  const customRules = useSettingsStore.getState().customAdRules;
  if (customRules && customRules.trim()) {
    if (customRules.includes('function')) {
      cachedKeywords = DEFAULT_AD_KEYWORDS;
      cacheTimestamp = Date.now();
      return cachedKeywords;
    }
    const lines = customRules.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length > 0) {
      cachedKeywords = lines;
      cacheTimestamp = Date.now();
      logger.info(`Using custom ad keywords: ${lines.length} rules`);
      return lines;
    }
  }
  cachedKeywords = DEFAULT_AD_KEYWORDS;
  cacheTimestamp = Date.now();
  return cachedKeywords;
};

const getAdHosts = (): string[] => {
  if (cachedHosts && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedHosts;
  }
  cachedHosts = DEFAULT_AD_HOSTS;
  cacheTimestamp = Date.now();
  return cachedHosts;
};

export const parseM3U8Segments = (m3u8Content: string): ParsedM3U8Segment[] => {
  const segments: ParsedM3U8Segment[] = [];
  const lines = m3u8Content.split('\n');
  let currentDuration = 0;
  let currentUrl = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      const durationMatch = line.match(/#EXTINF:(\d+\.?\d*)/);
      if (durationMatch) {
        currentDuration = parseFloat(durationMatch[1]) || 0;
      }
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && !nextLine.startsWith('#')) {
          currentUrl = nextLine;
          segments.push({
            url: currentUrl,
            duration: currentDuration,
            lineIndex: i,
          });
        }
      }
    }
  }

  return segments;
};

export const isAdByKeyword = (url: string, keywords?: string[]): FilterResult => {
  const searchKeywords = keywords || getAdKeywords();
  const lowerUrl = url.toLowerCase();

  for (const keyword of searchKeywords) {
    if (lowerUrl.includes(keyword.toLowerCase())) {
      return {
        isAd: true,
        reason: `Keyword match: ${keyword}`,
        confidence: 0.9,
      };
    }
  }

  return { isAd: false, confidence: 0 };
};

export const isAdByHost = (url: string, hosts?: string[]): FilterResult => {
  const searchHosts = hosts || getAdHosts();

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    for (const host of searchHosts) {
      if (hostname === host || hostname.endsWith('.' + host)) {
        return {
          isAd: true,
          reason: `Ad host: ${host}`,
          confidence: 0.95,
        };
      }
    }
  } catch {
    return { isAd: false, confidence: 0 };
  }

  return { isAd: false, confidence: 0 };
};

export const isAdByDuration = (duration: number): FilterResult => {
  if (duration >= AD_DURATION_RANGES.min && duration <= AD_DURATION_RANGES.max) {
    return {
      isAd: true,
      reason: `Suspicious duration: ${duration}s`,
      confidence: 0.5,
    };
  }
  return { isAd: false, confidence: 0 };
};

export const isAdSegment = (url: string, duration?: number): FilterResult => {
  const keywordResult = isAdByKeyword(url);
  if (keywordResult.isAd) {
    return keywordResult;
  }

  const hostResult = isAdByHost(url);
  if (hostResult.isAd) {
    return hostResult;
  }

  if (duration !== undefined) {
    const durationResult = isAdByDuration(duration);
    if (durationResult.isAd) {
      return durationResult;
    }
  }

  return { isAd: false, confidence: 0 };
};

export const checkAdBatch = (urls: string[]): Map<string, FilterResult> => {
  const results = new Map<string, FilterResult>();
  const adKeywords = getAdKeywords();
  const adHosts = getAdHosts();

  for (const url of urls) {
    if (results.has(url)) continue;

    let isAd = false;
    let reason = '';
    let confidence = 0;

    const lowerUrl = url.toLowerCase();
    for (const keyword of adKeywords) {
      if (lowerUrl.includes(keyword.toLowerCase())) {
        isAd = true;
        reason = `keyword: ${keyword}`;
        confidence = 0.9;
        break;
      }
    }

    if (!isAd) {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        for (const host of adHosts) {
          if (hostname === host || hostname.endsWith('.' + host)) {
            isAd = true;
            reason = `host: ${host}`;
            confidence = 0.95;
            break;
          }
        }
      } catch {}
    }

    results.set(url, { isAd, reason, confidence });
  }

  return results;
};

export const getAdEpisodeIndices = (episodes: string[]): number[] => {
  const adIndices: number[] = [];
  const batchResults = checkAdBatch(episodes);

  episodes.forEach((url, index) => {
    const result = batchResults.get(url);
    if (result?.isAd) {
      adIndices.push(index);
    }
  });

  return adIndices;
};

export const filterAdEpisodes = (episodes: string[]): string[] => {
  const batchResults = checkAdBatch(episodes);
  return episodes.filter(url => {
    const result = batchResults.get(url);
    return !result?.isAd;
  });
};

export const filterAdsFromM3U8 = (m3u8Content: string, useAdvancedDetection = false): string => {
  if (!m3u8Content) return '';

  const lines = m3u8Content.split('\n');
  const filteredLines: string[] = [];
  const adKeywords = getAdKeywords();
  const adHosts = getAdHosts();

  let i = 0;
  let totalFiltered = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.includes('#EXT-X-DISCONTINUITY')) {
      i++;
      continue;
    }

    if (line.includes('#EXTINF:')) {
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const durationMatch = line.match(/#EXTINF:(\d+\.?\d*)/);
        const duration = durationMatch ? parseFloat(durationMatch[1]) || 0 : 0;

        let isAd = false;
        let reason = '';

        if (useAdvancedDetection) {
          const result = isAdSegment(nextLine, duration);
          isAd = result.isAd;
          reason = result.reason || '';
        } else {
          const containsKeyword = adKeywords.some(keyword =>
            nextLine.toLowerCase().includes(keyword.toLowerCase())
          );
          if (containsKeyword) {
            isAd = true;
            reason = 'keyword';
          }
        }

        if (!isAd && useAdvancedDetection) {
          try {
            const urlObj = new URL(nextLine);
            const hostname = urlObj.hostname.toLowerCase();
            const adHostMatch = adHosts.some(host =>
              hostname === host || hostname.endsWith('.' + host)
            );
            if (adHostMatch) {
              isAd = true;
              reason = 'ad host';
            }
          } catch {}
        }

        if (isAd) {
          totalFiltered++;
          logger.debug(`Filtered ad segment: ${nextLine.substring(0, 80)}... (${reason})`);
          i += 2;
          continue;
        }
      }
    }

    filteredLines.push(line);
    i++;
  }

  if (totalFiltered > 0) {
    logger.info(`Filtered ${totalFiltered} ad segments from M3U8`);
  }

  return filteredLines.join('\n');
};

export const filterAdsFromM3U8WithCustomCode = (m3u8Content: string): string => {
  if (!m3u8Content) return '';

  const customRules = useSettingsStore.getState().customAdRules;
  if (!customRules || !customRules.includes('function')) {
    return filterAdsFromM3U8(m3u8Content, true);
  }

  try {
    const func = new Function('m3u8Content', customRules + '\nif (typeof filterAdsFromM3U8 === "function") { return filterAdsFromM3U8(m3u8Content); } else { throw new Error("Function filterAdsFromM3U8 not found"); }');
    const result = func(m3u8Content);
    logger.info('Custom ad filter code executed successfully');
    return result;
  } catch (error) {
    logger.error('Failed to execute custom ad filter code:', error);
    logger.info('Falling back to advanced filter');
    return filterAdsFromM3U8(m3u8Content, true);
  }
};

export const getSmartFilterStats = (m3u8Content: string): {
  totalSegments: number;
  adSegments: number;
  normalSegments: number;
  estimatedAdDuration: number;
} => {
  if (!m3u8Content) return { totalSegments: 0, adSegments: 0, normalSegments: 0, estimatedAdDuration: 0 };

  const segments = parseM3U8Segments(m3u8Content);
  let adSegments = 0;
  let adDuration = 0;

  for (const segment of segments) {
    const result = isAdSegment(segment.url, segment.duration);
    if (result.isAd) {
      adSegments++;
      adDuration += segment.duration;
    }
  }

  return {
    totalSegments: segments.length,
    adSegments,
    normalSegments: segments.length - adSegments,
    estimatedAdDuration: adDuration,
  };
};

export const extractAdPatterns = (): string[] => {
  return [...DEFAULT_AD_KEYWORDS];
};

export const getAllAdHosts = (): string[] => {
  return [...DEFAULT_AD_HOSTS];
};

export const addCustomAdPattern = (pattern: string): void => {
  if (pattern && !DEFAULT_AD_KEYWORDS.includes(pattern)) {
    DEFAULT_AD_KEYWORDS.push(pattern);
    cachedKeywords = null;
    logger.info(`Added custom ad pattern: ${pattern}`);
  }
};

export const removeCustomAdPattern = (pattern: string): void => {
  const index = DEFAULT_AD_KEYWORDS.indexOf(pattern);
  if (index > -1) {
    DEFAULT_AD_KEYWORDS.splice(index, 1);
    cachedKeywords = null;
    logger.info(`Removed custom ad pattern: ${pattern}`);
  }
};

export const getAllAdPatterns = (): string[] => {
  return [...DEFAULT_AD_KEYWORDS];
};

export const resetAdPatterns = (): void => {
  DEFAULT_AD_KEYWORDS.length = 0;
  DEFAULT_AD_KEYWORDS.push(
    'sponsor',
    '/ad/',
    '/ads/',
    'advert',
    'advertisement',
    '/adjump',
    'redtraffic',
    'click',
    'vast',
    'ima.',
    'doubleclick',
    'googlesyndication',
    'googleadservices',
    'adnxs',
    'adsrvr',
    'adsystem',
    'adform',
    'criteo',
    'taboola',
    'outbrain',
    'mgid',
    'propeller',
    'revcontent'
  );
  cachedKeywords = null;
  logger.info('Ad patterns reset to defaults');
};

export const clearFilterCache = (): void => {
  cachedKeywords = null;
  cachedHosts = null;
  cacheTimestamp = 0;
  logger.info('Filter cache cleared');
};

export const getDefaultAdRules = (): string => {
  return DEFAULT_AD_KEYWORDS.join('\n');
};

export const getDefaultAdHosts = (): string => {
  return DEFAULT_AD_HOSTS.join('\n');
};
