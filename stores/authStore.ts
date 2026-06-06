import { create } from "zustand";
import { api } from "@/services/api";
import { LoginCredentialsManager } from "@/services/storage";
import { useSettingsStore } from "./settingsStore";
import Toast from "react-native-toast-message";
import Logger from "@/utils/Logger";

const logger = Logger.withTag('AuthStore');

// 登录弹窗定时器（模块级，确保全局唯一）
let loginTimer: ReturnType<typeof setInterval> | null = null;

const startLoginTimer = (set: any, get: any) => {
  stopLoginTimer();
  loginTimer = setInterval(() => {
    const state = get();
    if (!state.isLoggedIn && !state.isLoginModalVisible) {
      set({ isLoginModalVisible: true });
    }
  }, 15000);
};

const stopLoginTimer = () => {
  if (loginTimer) {
    clearInterval(loginTimer);
    loginTimer = null;
  }
};

interface AuthState {
  isLoggedIn: boolean;
  isLoginModalVisible: boolean;
  showLoginModal: () => void;
  hideLoginModal: () => void;
  checkLoginStatus: (apiBaseUrl?: string) => Promise<void>;
  markAsLoggedIn: () => void;
  logout: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  isLoginModalVisible: false,
  showLoginModal: () => {
    set({ isLoginModalVisible: true });
  },
  hideLoginModal: () => {
    set({ isLoginModalVisible: false });
  },
  checkLoginStatus: async (apiBaseUrl?: string) => {
    // 已登录状态下不再重复检查，避免登录后重复弹Toast和请求登录接口
    if (get().isLoggedIn) {
      return;
    }

    if (!apiBaseUrl) {
      set({ isLoggedIn: false, isLoginModalVisible: false });
      stopLoginTimer();
      return;
    }
    try {
      // Wait for server config to be loaded if it's currently loading
      const settingsState = useSettingsStore.getState();
      let serverConfig = settingsState.serverConfig;

      // If server config is loading, wait a bit for it to complete
      if (settingsState.isLoadingServerConfig) {
        const maxWaitTime = 3000;
        const checkInterval = 100;
        let waitTime = 0;

        while (waitTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waitTime += checkInterval;
          const currentState = useSettingsStore.getState();
          if (!currentState.isLoadingServerConfig) {
            serverConfig = currentState.serverConfig;
            break;
          }
        }
      }

      if (!serverConfig?.StorageType) {
        if (!settingsState.isLoadingServerConfig) {
          Toast.show({ type: "error", text1: "请检查网络或者服务器地址是否可用" });
        }
        return;
      }

      // localstorage 模式无需登录
      if (serverConfig.StorageType === "localstorage") {
        set({ isLoggedIn: true, isLoginModalVisible: false });
        stopLoginTimer();
        return;
      }

      // 非 localstorage 模式：使用保存的账号密码自动登录
      const credentials = await LoginCredentialsManager.get();
      if (credentials && credentials.password) {
        const loginResult = await api.login(
          credentials.username || undefined,
          credentials.password
        ).catch(() => null);

        if (loginResult && loginResult.ok) {
          set({ isLoggedIn: true, isLoginModalVisible: false });
          stopLoginTimer();
          return;
        } else {
          // 自动登录失败，清除旧凭证并启动弹窗定时器
          await LoginCredentialsManager.clear();
          set({ isLoggedIn: false });
          startLoginTimer(set, get);
          set({ isLoginModalVisible: true });
          return;
        }
      }

      // 没有保存的凭证，启动弹窗定时器
      set({ isLoggedIn: false });
      startLoginTimer(set, get);
      set({ isLoginModalVisible: true });
    } catch (error) {
      logger.error("Failed to check login status:", error);
      set({ isLoggedIn: false });
      startLoginTimer(set, get);
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        set({ isLoginModalVisible: true });
      }
    }
  },
  markAsLoggedIn: () => {
    set({ isLoggedIn: true, isLoginModalVisible: false });
    stopLoginTimer();
  },
  logout: async () => {
    try {
      await api.logout();
      await LoginCredentialsManager.clear();
      set({ isLoggedIn: false, isLoginModalVisible: true });
      startLoginTimer(set, get);
    } catch (error) {
      logger.error("Failed to logout:", error);
    }
  },
}));

export default useAuthStore;
