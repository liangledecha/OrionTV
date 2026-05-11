import { create } from 'zustand';
import { Channel, fetchAndParseM3u } from '@/services/m3u';
import Logger from '@/utils/Logger';

const logger = Logger.withTag('LiveStore');

interface LiveChannel extends Channel {
  favorite?: boolean;
  lastWatched?: number;
}

interface LiveState {
  channels: LiveChannel[];
  groupedChannels: Record<string, LiveChannel[]>;
  channelGroups: string[];
  selectedGroup: string;
  currentChannelIndex: number;
  favoriteChannels: LiveChannel[];
  isLoading: boolean;
  error: string | null;
  
  loadChannels: (m3uUrl: string, removeAds?: boolean) => Promise<void>;
  setSelectedGroup: (group: string) => void;
  selectChannel: (index: number) => void;
  changeChannel: (direction: 'next' | 'prev') => void;
  toggleFavorite: (channelId: string) => void;
  getCurrentChannel: () => LiveChannel | null;
  searchChannels: (query: string) => LiveChannel[];
}

export const useLiveStore = create<LiveState>((set, get) => ({
  channels: [],
  groupedChannels: {},
  channelGroups: [],
  selectedGroup: '',
  currentChannelIndex: 0,
  favoriteChannels: [],
  isLoading: false,
  error: null,

  loadChannels: async (m3uUrl: string, removeAds = true) => {
    if (!m3uUrl) {
      set({ error: 'M3U URL not configured', isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      logger.info(`Loading channels from: ${m3uUrl}, removeAds: ${removeAds}`);
      const parsedChannels = await fetchAndParseM3u(m3uUrl, removeAds);
      
      if (parsedChannels.length === 0) {
        set({ error: 'No channels found in playlist', isLoading: false });
        return;
      }

      const channelsWithMeta: LiveChannel[] = parsedChannels.map((channel, index) => ({
        ...channel,
        id: channel.id || `channel-${index}`,
        favorite: false,
        lastWatched: undefined,
      }));

      const groups: Record<string, LiveChannel[]> = channelsWithMeta.reduce((acc, channel) => {
        const groupName = channel.group || 'Other';
        if (!acc[groupName]) {
          acc[groupName] = [];
        }
        acc[groupName].push(channel);
        return acc;
      }, {} as Record<string, LiveChannel[]>);

      const groupNames = Object.keys(groups).sort();
      const favorites = channelsWithMeta.filter(c => c.favorite);

      set({
        channels: channelsWithMeta,
        groupedChannels: groups,
        channelGroups: groupNames,
        selectedGroup: groupNames[0] || '',
        favoriteChannels: favorites,
        isLoading: false,
        currentChannelIndex: 0,
      });

      logger.info(`Loaded ${parsedChannels.length} channels in ${groupNames.length} groups`);
    } catch (error) {
      logger.error('Failed to load channels:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load channels', 
        isLoading: false 
      });
    }
  },

  setSelectedGroup: (group: string) => {
    set({ selectedGroup: group });
  },

  selectChannel: (index: number) => {
    const { channels } = get();
    if (index >= 0 && index < channels.length) {
      set({ currentChannelIndex: index });
      
      const updatedChannels = [...channels];
      updatedChannels[index] = { ...updatedChannels[index], lastWatched: Date.now() };
      set({ channels: updatedChannels });
    }
  },

  changeChannel: (direction: 'next' | 'prev') => {
    const { channels, currentChannelIndex } = get();
    if (channels.length === 0) return;

    let newIndex: number;
    if (direction === 'next') {
      newIndex = (currentChannelIndex + 1) % channels.length;
    } else {
      newIndex = (currentChannelIndex - 1 + channels.length) % channels.length;
    }
    
    set({ currentChannelIndex: newIndex });
    
    const updatedChannels = [...channels];
    updatedChannels[newIndex] = { ...updatedChannels[newIndex], lastWatched: Date.now() };
    set({ channels: updatedChannels });
  },

  toggleFavorite: (channelId: string) => {
    const { channels, favoriteChannels } = get();
    
    const channelIndex = channels.findIndex(c => c.id === channelId);
    if (channelIndex === -1) return;

    const channel = channels[channelIndex];
    const newFavoriteStatus = !channel.favorite;

    const updatedChannels = [...channels];
    updatedChannels[channelIndex] = { ...channel, favorite: newFavoriteStatus };

    let newFavorites: LiveChannel[];
    if (newFavoriteStatus) {
      newFavorites = [...favoriteChannels, updatedChannels[channelIndex]];
    } else {
      newFavorites = favoriteChannels.filter(c => c.id !== channelId);
    }

    set({ 
      channels: updatedChannels,
      favoriteChannels: newFavorites,
    });
  },

  getCurrentChannel: () => {
    const { channels, currentChannelIndex } = get();
    return channels[currentChannelIndex] || null;
  },

  searchChannels: (query: string) => {
    const { channels } = get();
    if (!query.trim()) return channels;

    const lowerQuery = query.toLowerCase();
    return channels.filter(channel => 
      channel.name.toLowerCase().includes(lowerQuery) ||
      channel.group?.toLowerCase().includes(lowerQuery)
    );
  },
}));