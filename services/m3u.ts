import Logger from '@/utils/Logger';

const logger = Logger.withTag('M3U');

const AD_KEYWORDS = [
  'sponsor',
  '/ad/',
  '/ads/',
  'advert',
  'advertisement',
  '/adjump',
  'redtraffic',
];

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

  const lines = m3uContent.split('\n');
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
          logger.debug(`Filtered ad channel: ${nextLine.substring(0, 100)}...`);
          i += 2;
          continue;
        }
      }
    }

    filteredLines.push(line);
    i++;
  }

  return filteredLines.join('\n');
};

export const isAdUrl = (url: string): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return AD_KEYWORDS.some(keyword => lowerUrl.includes(keyword.toLowerCase()));
};

export const getPlayableUrl = (originalUrl: string | null): string | null => {
  if (!originalUrl) {
    return null;
  }
  return originalUrl;
};