import React, { useRef, useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Text, ActivityIndicator, useTVEventHandler, HWEvent } from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { useKeepAwake } from "expo-keep-awake";
import { useSettingsStore } from "@/stores/settingsStore";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import Logger from '@/utils/Logger';

const logger = Logger.withTag('LivePlayer');

interface LivePlayerProps {
  streamUrl: string | null;
  channelTitle?: string | null;
  onPlaybackStatusUpdate: (status: AVPlaybackStatus) => void;
  onChannelChange?: (direction: 'next' | 'prev') => void;
  isChannelListVisible?: boolean;
}

const PLAYBACK_TIMEOUT = 15000;
const AD_KEYWORDS = [
  'sponsor',
  '/ad/',
  '/ads/',
  'advert',
  'advertisement',
  '/adjump',
  'redtraffic',
];

export default function LivePlayer({ 
  streamUrl, 
  channelTitle, 
  onPlaybackStatusUpdate,
  onChannelChange,
  isChannelListVisible = false 
}: LivePlayerProps) {
  const video = useRef<Video>(null);
  const { deviceType } = useResponsiveLayout();
  const [isLoading, setIsLoading] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  useKeepAwake();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (streamUrl) {
      const filteredUrl = filterStreamUrl(streamUrl);
      setCurrentStreamUrl(filteredUrl);
      setIsLoading(true);
      setIsTimeout(false);
      timeoutRef.current = setTimeout(() => {
        setIsTimeout(true);
        setIsLoading(false);
      }, PLAYBACK_TIMEOUT);
    } else {
      setCurrentStreamUrl(null);
      setIsLoading(false);
      setIsTimeout(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [streamUrl]);

  const filterStreamUrl = (url: string): string => {
    const lowerUrl = url.toLowerCase();
    const containsAd = AD_KEYWORDS.some(keyword => lowerUrl.includes(keyword.toLowerCase()));
    if (containsAd) {
      logger.debug(`Filtered ad URL: ${url.substring(0, 100)}...`);
      return '';
    }
    return url;
  };

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (status.isPlaying) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        setIsLoading(false);
        setIsTimeout(false);
      } else if (status.isBuffering) {
        setIsLoading(true);
      }
    } else {
      if (status.error) {
        setIsLoading(false);
        setIsTimeout(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    }
    onPlaybackStatusUpdate(status);
  }, [onPlaybackStatusUpdate]);

  const handleTVEvent = useCallback(
    (event: HWEvent) => {
      if (deviceType !== 'tv' || isChannelListVisible) return;
      
      if (event.eventType === 'left') {
        onChannelChange?.('prev');
      } else if (event.eventType === 'right') {
        onChannelChange?.('next');
      }
    },
    [deviceType, isChannelListVisible, onChannelChange]
  );

  useTVEventHandler(deviceType === 'tv' ? handleTVEvent : () => {});

  if (!currentStreamUrl) {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>按向下键选择频道</Text>
      </View>
    );
  }

  if (isTimeout) {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>加载失败，请重试</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Video
        ref={video}
        style={styles.video}
        source={{
          uri: currentStreamUrl,
        }}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onError={(e) => {
          logger.error(`Video playback error: ${JSON.stringify(e)}`);
          setIsTimeout(true);
          setIsLoading(false);
        }}
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.messageText}>加载中...</Text>
        </View>
      )}
      {channelTitle && !isLoading && !isTimeout && (
        <View style={styles.overlay}>
          <Text style={styles.title}>{channelTitle}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  video: {
    flex: 1,
    alignSelf: "stretch",
  },
  overlay: {
    position: "absolute",
    top: 20,
    left: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 10,
    borderRadius: 5,
  },
  title: {
    color: "#fff",
    fontSize: 18,
  },
  messageText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 10,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});