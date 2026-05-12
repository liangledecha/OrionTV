import Logger from '@/utils/Logger';
import { useSettingsStore } from '@/stores/settingsStore';
import { isAdSegment, filterAdsFromM3U8 } from '@/services/adFilter';

const logger = Logger.withTag('M3U');

const DEFAULT_AD_KEYWORDS = [
  'sponsor',
  '/ad/',
  '/ads/',
  'advert',
  'advertisement',
  '/adjump',
  'redtraffic',
];

let cachedKeywords: string[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000;

const getAdKeywords = (): string[] => {
  if (cachedKeywords && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedKeywords;
  }

  const customRules = useSettingsStore.getState().customAdRules;
  if (customRules && customRules.trim() && !customRules.includes('function')) {
    const lines = customRules.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length > 0) {
      cachedKeywords = lines;
      cacheTimestamp = Date.now();
      logger.info(`Using custom ad keywords: ${lines.join(', ')}`);
      return lines;
    }
  }
  cachedKeywords = DEFAULT_AD_KEYWORDS;
  cacheTimestamp = Date.now();
  return cachedKeywords;
};

export interface Channel {
  id: string;
  name: string;
  url: string;
  logo: string;
  group: string;
}

export const parseM3U = (m3uText: string): Channel[] => {
  const parsedChannels: Channel[] = [];
  const lines = m3uText.split('\n');
  let currentChannelInfo: Partial<Channel> | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('#EXTINF:')) {
      currentChannelInfo = {};
      const commaIndex = trimmedLine.lastIndexOf(',');
      if (commaIndex !== -1) {
        currentChannelInfo.name = trimmedLine.substring(commaIndex + 1).trim();
        const attributesPart = trimmedLine.substring(8, commaIndex);
        const logoMatch = attributesPart.match(/tvg-logo="([^"]*)"/i);
        if (logoMatch && logoMatch[1]) {
          currentChannelInfo.logo = logoMatch[1];
        }
        const groupMatch = attributesPart.match(/group-title="([^"]*)"/i);
        if (groupMatch && groupMatch[1]) {
          currentChannelInfo.group = groupMatch[1];
        }
      } else {
        currentChannelInfo.name = trimmedLine.substring(8).trim();
      }
    } else if (currentChannelInfo && trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('://')) {
      currentChannelInfo.url = trimmedLine;
      currentChannelInfo.id = currentChannelInfo.url;

      const finalChannel: Channel = {
        id: currentChannelInfo.id,
        url: currentChannelInfo.url,
        name: currentChannelInfo.name || 'Unknown',
        logo: currentChannelInfo.logo || '',
        group: currentChannelInfo.group || 'Default',
      };

      parsedChannels.push(finalChannel);
      currentChannelInfo = null;
    }
  }
  return parsedChannels;
};

export const fetchAndParseM3u = async (m3uUrl: string, filterAds = true): Promise<Channel[]> => {
  try {
    const response = await fetch(m3uUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch M3U: ${response.statusText}`);
    }
    const m3uText = await response.text();

    if (filterAds) {
      const filteredContent = filterM3UContent(m3uText);
      return parseM3U(filteredContent);
    }

    return parseM3U(m3uText);
  } catch (error) {
    logger.info("Error fetching or parsing M3U:", error);
    return [];
  }
};

export const filterM3UContent = (m3uContent: string): string => {
  if (!m3uContent) return '';

  const adKeywords = getAdKeywords();
  const lines = m3uContent.split('\n');
  const filteredLines: string[] = [];
  let totalFiltered = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.includes('#EXT-X-DISCONTINUITY')) {
      i++;
      continue;
    }

    if (line.includes('#EXTINF:')) {
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const containsAdKeyword = adKeywords.some(keyword =>
          nextLine.toLowerCase().includes(keyword.toLowerCase())
        );

        if (containsAdKeyword) {
          totalFiltered++;
          i += 2;
          continue;
        }
      }
    }

    filteredLines.push(line);
    i++;
  }

  if (totalFiltered > 0) {
    logger.info(`Filtered ${totalFiltered} ad channels from M3U`);
  }

  return filteredLines.join('\n');
};

export const isAdUrl = (url: string): boolean => {
  if (!url) return false;
  const result = isAdSegment(url);
  return result.isAd;
};

export const getPlayableUrl = (originalUrl: string | null): string | null => {
  if (!originalUrl) {
    return null;
  }
  return originalUrl;
};

export const clearM3UCache = (): void => {
  cachedKeywords = null;
  cacheTimestamp = 0;
  logger.info('M3U cache cleared');
};
