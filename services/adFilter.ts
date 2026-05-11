import Logger from '@/utils/Logger';

const logger = Logger.withTag('AdFilter');

const AD_KEYWORDS = [
  'sponsor',
  '/ad/',
  '/ads/',
  'advert',
  'advertisement',
  '/adjump',
  'redtraffic',
];

export const filterAdsFromM3U8 = (m3u8Content: string): string => {
  if (!m3u8Content) return '';

  const lines = m3u8Content.split('\n');
  const filteredLines: string[] = [];

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
        const containsAdKeyword = AD_KEYWORDS.some(keyword =>
          nextLine.toLowerCase().includes(keyword.toLowerCase())
        );

        if (containsAdKeyword) {
          i += 2;
          logger.debug(`Filtered ad segment: ${nextLine.substring(0, 100)}...`);
          continue;
        }
      }
    }

    filteredLines.push(line);
    i++;
  }

  return filteredLines.join('\n');
};

export const isAdSegment = (url: string): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return AD_KEYWORDS.some(keyword => lowerUrl.includes(keyword.toLowerCase()));
};

export const extractAdPatterns = (): string[] => {
  return [...AD_KEYWORDS];
};

export const addCustomAdPattern = (pattern: string): void => {
  if (pattern && !AD_KEYWORDS.includes(pattern)) {
    AD_KEYWORDS.push(pattern);
    logger.info(`Added custom ad pattern: ${pattern}`);
  }
};

export const removeCustomAdPattern = (pattern: string): void => {
  const index = AD_KEYWORDS.indexOf(pattern);
  if (index > -1) {
    AD_KEYWORDS.splice(index, 1);
    logger.info(`Removed custom ad pattern: ${pattern}`);
  }
};

export const getAllAdPatterns = (): string[] => {
  return [...AD_KEYWORDS];
};

export const resetAdPatterns = (): void => {
  AD_KEYWORDS.length = 0;
  AD_KEYWORDS.push(
    'sponsor',
    '/ad/',
    '/ads/',
    'advert',
    'advertisement',
    '/adjump',
    'redtraffic'
  );
  logger.info('Ad patterns reset to defaults');
};