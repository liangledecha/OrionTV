import { useCallback, RefObject, useMemo } from 'react';
import { Video, ResizeMode } from 'expo-av';
import Toast from 'react-native-toast-message';
import usePlayerStore from '@/stores/playerStore';
import { isAdSegment } from '@/services/adFilter';
import { useSettingsStore } from '@/stores/settingsStore';

interface UseVideoHandlersProps {
  videoRef: RefObject<Video>;
  currentEpisode: { url: string; title: string; isAd?: boolean; adReason?: string } | undefined;
  initialPosition: number;
  introEndTime?: number;
  playbackRate: number;
  handlePlaybackStatusUpdate: (status: any) => void;
  deviceType: string;
  detail?: { poster?: string };
}

export const useVideoHandlers = ({
  videoRef,
  currentEpisode,
  initialPosition,
  introEndTime,
  playbackRate,
  handlePlaybackStatusUpdate,
  deviceType,
  detail,
}: UseVideoHandlersProps) => {
  
  const onLoad = useCallback(async () => {
    console.info(`[PERF] Video onLoad - video ready to play`);
    
    const { removeAds, checkCurrentEpisodeAd } = usePlayerStore.getState();
    const url = currentEpisode?.url;
    
    if (removeAds && url) {
      const adInfo = checkCurrentEpisodeAd(url);
      if (adInfo) {
        console.warn(`[AD_FILTER] onLoad - Current episode is detected as AD: ${adInfo.reason}`);
        Toast.show({
          type: "error",
          text1: "广告警告",
          text2: `检测到广告片段: ${adInfo.reason}`,
          visibilityTime: 3000,
        });
      }
    }
    
    try {
      const jumpPosition = initialPosition || introEndTime || 0;
      if (jumpPosition > 0) {
        console.info(`[PERF] Setting initial position to ${jumpPosition}ms`);
        await videoRef.current?.setPositionAsync(jumpPosition);
      }
      
      console.info(`[AUTOPLAY] Attempting to start playback after onLoad`);
      await videoRef.current?.playAsync();
      console.info(`[AUTOPLAY] Auto-play successful after onLoad`);
      
      usePlayerStore.setState({ isLoading: false });
      console.info(`[PERF] Video loading complete - isLoading set to false`);
    } catch (error) {
      console.warn(`[AUTOPLAY] Failed to auto-play after onLoad:`, error);
      usePlayerStore.setState({ isLoading: false });
    }
  }, [videoRef, initialPosition, introEndTime, currentEpisode?.url]);

  const onLoadStart = useCallback(() => {
    if (!currentEpisode?.url) return;
    
    console.info(`[PERF] Video onLoadStart - starting to load video: ${currentEpisode.url.substring(0, 100)}...`);
    
    const removeAds = useSettingsStore.getState().removeAds;
    if (removeAds) {
      const adCheckResult = isAdSegment(currentEpisode.url);
      if (adCheckResult.isAd) {
        console.warn(`[AD_FILTER] onLoadStart - Ad detected: ${adCheckResult.reason}`);
        Toast.show({
          type: "warn",
          text1: "广告片段检测",
          text2: `即将播放广告: ${adCheckResult.reason || '未知原因'}`,
          visibilityTime: 2500,
        });
      }
    }
    
    usePlayerStore.setState({ isLoading: true });
  }, [currentEpisode?.url]);

  const onError = useCallback((error: any) => {
    if (!currentEpisode?.url) return;
    
    console.error(`[ERROR] Video playback error:`, error);
    
    // 检测SSL证书错误和其他网络错误
    const errorString = (error as any)?.error?.toString() || error?.toString() || '';
    const isSSLError = errorString.includes('SSLHandshakeException') || 
                      errorString.includes('CertPathValidatorException') ||
                      errorString.includes('Trust anchor for certification path not found');
    const isNetworkError = errorString.includes('HttpDataSourceException') ||
                         errorString.includes('IOException') ||
                         errorString.includes('SocketTimeoutException');
    
    if (isSSLError) {
      console.error(`[SSL_ERROR] SSL certificate validation failed for URL: ${currentEpisode.url}`);
      Toast.show({ 
        type: "error", 
        text1: "SSL证书错误，正在尝试其他播放源...",
        text2: "请稍候"
      });
      usePlayerStore.getState().handleVideoError('ssl', currentEpisode.url);
    } else if (isNetworkError) {
      console.error(`[NETWORK_ERROR] Network connection failed for URL: ${currentEpisode.url}`);
      Toast.show({ 
        type: "error", 
        text1: "网络连接失败，正在尝试其他播放源...",
        text2: "请稍候"
      });
      usePlayerStore.getState().handleVideoError('network', currentEpisode.url);
    } else {
      console.error(`[VIDEO_ERROR] Other video error for URL: ${currentEpisode.url}`);
      Toast.show({ 
        type: "error", 
        text1: "视频播放失败，正在尝试其他播放源...",
        text2: "请稍候"
      });
      usePlayerStore.getState().handleVideoError('other', currentEpisode.url);
    }
  }, [currentEpisode?.url]);

  // 优化的Video组件props - 增强缓存配置
  const videoProps = useMemo(() => ({
    source: { uri: currentEpisode?.url || '' },
    posterSource: { uri: detail?.poster ?? "" },
    resizeMode: ResizeMode.CONTAIN,
    rate: playbackRate,
    onPlaybackStatusUpdate: handlePlaybackStatusUpdate,
    onLoad,
    onLoadStart,
    onError,
    useNativeControls: deviceType !== 'tv',
    shouldPlay: true,
    progressiveRenderingEnabled: true,
  }), [
    currentEpisode?.url,
    detail?.poster,
    playbackRate,
    handlePlaybackStatusUpdate,
    onLoad,
    onLoadStart,
    onError,
    deviceType,
  ]);

  return {
    onLoad,
    onLoadStart,
    onError,
    videoProps,
  };
};