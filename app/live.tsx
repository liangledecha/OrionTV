import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { View, FlatList, StyleSheet, ActivityIndicator, Modal, useTVEventHandler, HWEvent, Text, Pressable, Animated } from "react-native";
import { AVPlaybackStatus } from "expo-av";
import LivePlayer from "@/components/LivePlayer";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { StyledButton } from "@/components/StyledButton";
import { useSettingsStore } from "@/stores/settingsStore";
import { useLiveStore } from "@/stores/liveStore";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { getCommonResponsiveStyles } from "@/utils/ResponsiveStyles";
import ResponsiveNavigation from "@/components/navigation/ResponsiveNavigation";
import ResponsiveHeader from "@/components/navigation/ResponsiveHeader";
import { DeviceUtils } from "@/utils/DeviceUtils";
import Logger from '@/utils/Logger';

const logger = Logger.withTag('LiveScreen');

interface ChannelItemProps {
  channel: { id: string; name: string; logo?: string };
  isSelected: boolean;
  onSelect: () => void;
  isTV: boolean;
  isMobile: boolean;
  minTouchTarget: number;
}

const ChannelItem: React.FC<ChannelItemProps> = React.memo(({ 
  channel, 
  isSelected, 
  onSelect, 
  isTV, 
  isMobile,
  minTouchTarget 
}) => (
  <Pressable
    hasTVPreferredFocus={isTV && isSelected}
    style={({ focused }) => [
      styles.channelItem,
      isMobile && { minHeight: minTouchTarget * 0.8 },
      isSelected && styles.channelItemSelected,
      isTV && focused && styles.channelItemFocused,
    ]}
    onPress={onSelect}
  >
    {channel.logo ? (
      <View style={styles.logoContainer}>
        <Animated.Image 
          source={{ uri: channel.logo }} 
          style={styles.channelLogo}
          resizeMode="contain"
        />
      </View>
    ) : (
      <View style={styles.logoPlaceholder}>
        <Text style={styles.logoPlaceholderText}>
          {channel.name.charAt(0)}
        </Text>
      </View>
    )}
    <Text 
      style={[styles.channelName, isSelected && styles.channelNameSelected]} 
      numberOfLines={1}
    >
      {channel.name}
    </Text>
  </Pressable>
));

ChannelItem.displayName = 'ChannelItem';

export default function LiveScreen() {
  const { m3uUrl, removeAds } = useSettingsStore();
  const {
    channels,
    groupedChannels,
    channelGroups,
    selectedGroup,
    currentChannelIndex,
    isLoading,
    error,
    loadChannels,
    setSelectedGroup,
    selectChannel,
    changeChannel,
    getCurrentChannel,
  } = useLiveStore();
  
  const { deviceType, spacing } = useResponsiveLayout();
  const isTV = deviceType === 'tv';
  const isMobile = deviceType === 'mobile';
  const minTouchTarget = DeviceUtils.getMinTouchTargetSize();

  const [isChannelListVisible, setIsChannelListVisible] = useState(false);
  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [focusedGroupIndex, setFocusedGroupIndex] = useState<number>(0);
  const [focusedChannelIndex, setFocusedChannelIndex] = useState<number>(0);
  const titleTimer = useRef<NodeJS.Timeout | null>(null);
  const listRef = useRef<FlatList>(null);
  const groupListRef = useRef<FlatList>(null);

  const currentChannel = getCurrentChannel();
  const selectedChannelUrl = currentChannel?.url || null;

  useEffect(() => {
    if (m3uUrl) {
      loadChannels(m3uUrl, removeAds);
    }
  }, [m3uUrl, removeAds, loadChannels]);

  useEffect(() => {
    if (currentChannel) {
      showChannelTitle(currentChannel.name);
    }
  }, [currentChannelIndex]);

  const showChannelTitle = useCallback((title: string) => {
    setChannelTitle(title);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => setChannelTitle(null), 3000);
  }, []);

  const handleSelectChannel = useCallback((index: number) => {
    selectChannel(index);
    const channel = channels[index];
    if (channel) {
      showChannelTitle(channel.name);
    }
    setIsChannelListVisible(false);
  }, [selectChannel, channels, showChannelTitle]);

  const handleChannelChange = useCallback((direction: 'next' | 'prev') => {
    changeChannel(direction);
    const newChannel = getCurrentChannel();
    if (newChannel) {
      showChannelTitle(newChannel.name);
    }
  }, [changeChannel, getCurrentChannel, showChannelTitle]);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded && status.error) {
      logger.error('Playback error:', status.error);
    }
  }, []);

  const handleTVEvent = useCallback((event: HWEvent) => {
    if (!isTV) return;

    if (isChannelListVisible) {
      switch (event.eventType) {
        case 'left':
          if (focusedGroupIndex > 0) {
            setFocusedGroupIndex(prev => prev - 1);
            groupListRef.current?.scrollToIndex({ index: focusedGroupIndex - 1, animated: true });
          }
          break;
        case 'right':
          setFocusedChannelIndex(0);
          setFocusedGroupIndex(-1);
          break;
        case 'up':
          if (focusedGroupIndex === -1) {
            setFocusedGroupIndex(0);
          } else if (focusedChannelIndex > 0) {
            setFocusedChannelIndex(prev => prev - 1);
            listRef.current?.scrollToIndex({ index: focusedChannelIndex - 1, animated: true });
          }
          break;
        case 'down': {
          const currentGroupChannels = groupedChannels[selectedGroup] || [];
          if (focusedChannelIndex < currentGroupChannels.length - 1) {
            setFocusedChannelIndex(prev => prev + 1);
            listRef.current?.scrollToIndex({ index: focusedChannelIndex + 1, animated: true });
          }
          break;
        }
        case 'select': {
          const currentGroupChannels = groupedChannels[selectedGroup] || [];
          const channelIndex = channels.findIndex(c => c.id === currentGroupChannels[focusedChannelIndex]?.id);
          if (channelIndex !== -1) {
            handleSelectChannel(channelIndex);
          }
          break;
        }
        case 'back':
          setIsChannelListVisible(false);
          break;
      }
    } else {
      switch (event.eventType) {
        case 'down':
          setIsChannelListVisible(true);
          setFocusedGroupIndex(0);
          if (currentChannel) {
            const currentIndex = channels.findIndex(c => c.id === currentChannel.id);
            setFocusedChannelIndex(currentIndex >= 0 ? currentIndex : 0);
          } else {
            setFocusedChannelIndex(0);
          }
          break;
        case 'left':
          if (channels.length > 0) {
            handleChannelChange('prev');
          }
          break;
        case 'right':
          if (channels.length > 0) {
            handleChannelChange('next');
          }
          break;
        case 'info':
        case 'menu':
          setIsChannelListVisible(true);
          break;
      }
    }
  }, [
    isTV, 
    isChannelListVisible, 
    focusedGroupIndex, 
    focusedChannelIndex, 
    groupedChannels, 
    selectedGroup, 
    channels, 
    currentChannel,
    handleSelectChannel,
    handleChannelChange
  ]);

  useTVEventHandler(isTV ? handleTVEvent : () => {
    // 空函数，避免条件函数导致的事件处理问题
  });

  const renderGroupItem = useCallback(({ item, index }: { item: string; index: number }) => {
    const isSelected = selectedGroup === item;
    const isFocused = focusedGroupIndex === index && isChannelListVisible;

    return (
      <Pressable
        hasTVPreferredFocus={isTV && isFocused}
        style={({ focused }) => [
          styles.groupItem,
          isMobile && { minHeight: minTouchTarget * 0.7 },
          isSelected && styles.groupItemSelected,
          isTV && focused && styles.groupItemFocused,
        ]}
        onPress={() => {
          setSelectedGroup(item);
          setFocusedChannelIndex(0);
          setFocusedGroupIndex(index);
        }}
      >
        <Text 
          style={[
            styles.groupName, 
            isSelected && styles.groupNameSelected
          ]} 
          numberOfLines={1}
        >
          {item}
        </Text>
        <Text style={styles.groupCount}>
          {groupedChannels[item]?.length || 0}
        </Text>
      </Pressable>
    );
  }, [selectedGroup, focusedGroupIndex, groupedChannels, isTV, isMobile, minTouchTarget, setSelectedGroup]);

  const renderChannelItem = useCallback(({ item, index }: { item: { id: string; name: string; logo?: string }; index: number }) => {
    const globalIndex = channels.findIndex(c => c.id === item.id);
    const isSelected = channels[currentChannelIndex]?.id === item.id;
    const isFocused = focusedGroupIndex === -1 && focusedChannelIndex === index && isChannelListVisible;

    return (
      <ChannelItem
        channel={item}
        isSelected={isSelected}
        onSelect={() => handleSelectChannel(globalIndex)}
        isTV={isTV}
        isMobile={isMobile}
        minTouchTarget={minTouchTarget}
      />
    );
  }, [channels, currentChannelIndex, focusedGroupIndex, focusedChannelIndex, isChannelListVisible, isTV, isMobile, minTouchTarget, handleSelectChannel]);

  const currentGroupChannels = useMemo(() => {
    return groupedChannels[selectedGroup] || [];
  }, [groupedChannels, selectedGroup]);

  const styles = useMemo(() => createResponsiveStyles(deviceType, spacing, minTouchTarget), [deviceType, spacing, minTouchTarget]);

  const renderLiveContent = () => (
    <>
      <LivePlayer 
        streamUrl={selectedChannelUrl} 
        channelTitle={channelTitle} 
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onChannelChange={handleChannelChange}
        isChannelListVisible={isChannelListVisible}
      />
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <StyledButton
            text="重新加载"
            onPress={() => loadChannels(m3uUrl, removeAds)}
            variant="primary"
            style={styles.retryButton}
          />
        </View>
      )}

      {!m3uUrl && !error && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>请先在设置中配置M3U播放列表地址</Text>
        </View>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={isChannelListVisible}
        onRequestClose={() => setIsChannelListVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>选择频道</Text>
              <Pressable 
                style={styles.closeButton}
                onPress={() => setIsChannelListVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>
            
            <View style={styles.listContainer}>
              <View style={styles.groupColumn}>
                <FlatList
                  ref={groupListRef}
                  data={channelGroups}
                  keyExtractor={(item, index) => `group-${item}-${index}`}
                  renderItem={renderGroupItem}
                  showsVerticalScrollIndicator={false}
                />
              </View>
              
              <View style={styles.channelColumn}>
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>加载中...</Text>
                  </View>
                ) : (
                  <FlatList
                    ref={listRef}
                    data={currentGroupChannels}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    renderItem={renderChannelItem}
                    showsVerticalScrollIndicator={false}
                    getItemLayout={(_, index) => ({
                      length: isMobile ? minTouchTarget * 0.8 + 8 : 52,
                      offset: (isMobile ? minTouchTarget * 0.8 + 8 : 52) * index,
                      index,
                    })}
                  />
                )}
              </View>
            </View>

            <View style={styles.channelInfo}>
              <Text style={styles.channelInfoText}>
                {currentChannelIndex + 1} / {channels.length}
              </Text>
              {currentChannel && (
                <Text style={styles.channelInfoName} numberOfLines={1}>
                  {currentChannel.name}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );

  const content = (
    <ThemedView style={[styles.container]}>
      {renderLiveContent()}
    </ThemedView>
  );

  if (isTV) {
    return content;
  }

  return (
    <ResponsiveNavigation>
      <ResponsiveHeader title="直播" showBackButton />
      {content}
    </ResponsiveNavigation>
  );
}

const createResponsiveStyles = (deviceType: string, spacing: number, minTouchTarget: number) => {
  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    modalContainer: {
      flex: 1,
      flexDirection: "row",
      justifyContent: isMobile ? "center" : "flex-end",
      backgroundColor: "rgba(0, 0, 0, 0.85)",
    },
    modalContent: {
      width: isMobile ? '100%' : isTablet ? 400 : 500,
      height: "100%",
      backgroundColor: "rgba(30, 30, 30, 0.95)",
      borderTopLeftRadius: isMobile ? 0 : 16,
      borderBottomLeftRadius: isMobile ? 0 : 16,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: spacing,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255, 255, 255, 0.1)",
    },
    modalTitle: {
      color: "#fff",
      fontSize: isMobile ? 20 : 18,
      fontWeight: "bold",
    },
    closeButton: {
      width: 32,
      height: 32,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      borderRadius: 16,
    },
    closeButtonText: {
      color: "#fff",
      fontSize: 16,
    },
    listContainer: {
      flex: 1,
      flexDirection: isMobile ? "column" : "row",
    },
    groupColumn: {
      flex: isMobile ? 0 : 1,
      borderRightWidth: isMobile ? 0 : 1,
      borderRightColor: "rgba(255, 255, 255, 0.1)",
      marginRight: isMobile ? 0 : spacing,
      marginBottom: isMobile ? spacing : 0,
      maxHeight: isMobile ? 120 : undefined,
    },
    channelColumn: {
      flex: isMobile ? 1 : 2,
    },
    groupItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: isMobile ? minTouchTarget / 4 : 10,
      paddingHorizontal: spacing,
      marginVertical: isMobile ? 2 : 4,
      marginHorizontal: spacing / 2,
      borderRadius: 8,
      backgroundColor: "transparent",
    },
    groupItemSelected: {
      backgroundColor: "rgba(0, 122, 255, 0.3)",
    },
    groupItemFocused: {
      backgroundColor: "rgba(0, 122, 255, 0.5)",
      borderWidth: 1,
      borderColor: "#007AFF",
    },
    groupName: {
      color: "#fff",
      fontSize: isMobile ? 14 : 13,
      flex: 1,
    },
    groupNameSelected: {
      color: "#007AFF",
      fontWeight: "bold",
    },
    groupCount: {
      color: "rgba(255, 255, 255, 0.5)",
      fontSize: 12,
      marginLeft: spacing / 2,
    },
    channelItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: isMobile ? minTouchTarget / 5 : 8,
      paddingHorizontal: spacing,
      marginVertical: isMobile ? 2 : 4,
      marginHorizontal: spacing / 2,
      borderRadius: 8,
      backgroundColor: "transparent",
    },
    channelItemSelected: {
      backgroundColor: "rgba(0, 122, 255, 0.3)",
    },
    channelItemFocused: {
      backgroundColor: "rgba(0, 122, 255, 0.5)",
      borderWidth: 1,
      borderColor: "#007AFF",
    },
    logoContainer: {
      width: 32,
      height: 32,
      marginRight: spacing,
    },
    channelLogo: {
      width: 32,
      height: 32,
      borderRadius: 4,
    },
    logoPlaceholder: {
      width: 32,
      height: 32,
      marginRight: spacing,
      backgroundColor: "rgba(0, 122, 255, 0.3)",
      borderRadius: 4,
      justifyContent: "center",
      alignItems: "center",
    },
    logoPlaceholderText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "bold",
    },
    channelName: {
      color: "#fff",
      fontSize: isMobile ? 14 : 13,
      flex: 1,
    },
    channelNameSelected: {
      color: "#007AFF",
      fontWeight: "bold",
    },
    channelInfo: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: spacing,
      borderTopWidth: 1,
      borderTopColor: "rgba(255, 255, 255, 0.1)",
    },
    channelInfoText: {
      color: "rgba(255, 255, 255, 0.6)",
      fontSize: 12,
    },
    channelInfoName: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "bold",
      flex: 1,
      textAlign: "right",
      marginLeft: spacing,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      color: "#fff",
      marginTop: spacing,
    },
    errorContainer: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: [{ translateX: -100 }, { translateY: -50 }],
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      padding: spacing * 2,
      borderRadius: 12,
      alignItems: "center",
    },
    errorText: {
      color: "#ff4444",
      fontSize: 14,
      marginBottom: spacing,
      textAlign: "center",
    },
    retryButton: {
      minWidth: 100,
    },
    emptyContainer: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: [{ translateX: -100 }, { translateY: -50 }],
      alignItems: "center",
    },
    emptyText: {
      color: "#fff",
      fontSize: 16,
      textAlign: "center",
    },
  });
};