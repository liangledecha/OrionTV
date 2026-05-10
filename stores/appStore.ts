import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CookieManager from '@react-native-cookies/cookies';
import { useSettingsStore } from './settingsStore';
import useAuthStore from './authStore';
import Logger from '@/utils/Logger';

const logger = Logger.withTag('AppStore');

interface AppState {
  isAppReady: boolean;
  initializeApp: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  isAppReady: false,

  initializeApp: async () => {
    // 防重入：已经就绪则不再重复初始化
    if (get().isAppReady) {
      logger.info('App already ready, skipping initialization');
      return;
    }

    try {
      // Phase 1: 加载设置（包含 fetchServerConfig）
      logger.info('Phase 1: Loading settings...');
      await useSettingsStore.getState().loadSettings();

      const { apiBaseUrl } = useSettingsStore.getState();

      if (apiBaseUrl) {
        // Phase 2: 清除旧 cookie，使用当前凭据重新登录
        logger.info('Phase 2: Authenticating...');
        await AsyncStorage.setItem('authCookies', '');
        try {
          await CookieManager.clearAll();
        } catch {
          // 忽略原生 cookie 管理器错误
        }

        await useAuthStore.getState().checkLoginStatus(apiBaseUrl);
      } else {
        logger.info('No API base URL configured, skipping authentication');
      }

      // Phase 3: 应用就绪，允许页面开始加载影片数据
      set({ isAppReady: true });
      logger.info('App initialization complete, isAppReady = true');
    } catch (error) {
      logger.error('App initialization failed:', error);
      // 即使出错也允许进入应用，避免卡死
      set({ isAppReady: true });
    }
  },
}));
