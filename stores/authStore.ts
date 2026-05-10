import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CookieManager from "@react-native-cookies/cookies";
import { api } from "@/services/api";
import { useSettingsStore } from "./settingsStore";
import { LoginCredentialsManager } from "@/services/storage";
import Logger from "@/utils/Logger";

const logger = Logger.withTag('AuthStore');

interface AuthState {
  isLoggedIn: boolean;
  isLoginModalVisible: boolean;
  showLoginModal: () => void;
  hideLoginModal: () => void;
  checkLoginStatus: (apiBaseUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseHttpStatus = (error: unknown): number | null => {
  if (error instanceof Error) {
    const match = error.message.match(/HTTP error! status: (\d{3})/);
    if (match) {
      return Number(match[1]);
    }
  }
  return null;
};

// 防重入锁：确保 checkLoginStatus 不会并发执行，避免竞态条件导致已登录状态被覆盖
let checkLoginStatusPromise: Promise<void> | null = null;

/** @internal 仅用于测试重置锁状态 */
export const __resetCheckLoginStatusForTest = () => {
  checkLoginStatusPromise = null;
};

const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  isLoginModalVisible: false,
  showLoginModal: () => set({ isLoginModalVisible: true }),
  hideLoginModal: () => set({ isLoginModalVisible: false }),

  checkLoginStatus: async (apiBaseUrl?: string) => {
    // 防重入：如果已有执行中的检查，等待其结果，避免多个并发调用互相覆盖状态
    if (checkLoginStatusPromise) {
      return checkLoginStatusPromise;
    }

    checkLoginStatusPromise = (async () => {
      try {
        if (!apiBaseUrl) {
          set({ isLoggedIn: false, isLoginModalVisible: false });
          return;
        }

        const settingsState = useSettingsStore.getState();
        let serverConfig = settingsState.serverConfig;

        if (settingsState.isLoadingServerConfig) {
          const maxWaitTime = 3000;
          const checkInterval = 100;
          let waitTime = 0;

          while (waitTime < maxWaitTime) {
            await delay(checkInterval);
            waitTime += checkInterval;
            const currentState = useSettingsStore.getState();
            if (!currentState.isLoadingServerConfig) {
              serverConfig = currentState.serverConfig;
              break;
            }
          }
        }

        // 如果无法获取服务器配置，仍然尝试登录（假设不是 localstorage 模式）
        // 登录成功后再获取配置也不迟

        // 清除旧 cookie，准备重新登录
        await AsyncStorage.setItem('authCookies', '');
        try {
          await CookieManager.clearAll();
        } catch {
          // 忽略原生 cookie 管理器错误
        }

        let { username, password } = settingsState;
        const isLocalStorage = serverConfig?.StorageType === "localstorage";

        // 如果 settingsStore 中没有凭据，尝试从 LoginCredentialsManager 读取
        if (!username && !password) {
          const savedCreds = await LoginCredentialsManager.get();
          if (savedCreds) {
            username = savedCreds.username;
            password = savedCreds.password;
          }
        }

        // localstorage 模式下无密码也可以（后端不需要认证）
        if (!password && !isLocalStorage) {
          set({ isLoggedIn: false, isLoginModalVisible: false });
          return;
        }

        if (isLocalStorage && !password) {
          set({ isLoggedIn: false, isLoginModalVisible: false });
          return;
        }

        // 使用设置中保存的账号密码进行登录（带重试）
        const loginUsername = isLocalStorage ? undefined : username;

        for (let attempt = 1; attempt <= 3; attempt += 1) {
          try {
            const loginResult = await api.login(loginUsername, password);
            if (loginResult.ok) {
              set({ isLoggedIn: true, isLoginModalVisible: false });
              return;
            }
            // 服务器明确返回认证失败（账号密码错误），弹出登录框提示用户
            set({ isLoggedIn: false, isLoginModalVisible: true });
            return;
          } catch (error) {
            if (error instanceof Error) {
              // 后端明确拒绝认证（401），账号密码错误，弹出登录框提示用户
              if (error.message === "UNAUTHORIZED") {
                set({ isLoggedIn: false, isLoginModalVisible: true });
                return;
              }

              // 网络错误，可以重试
              if (error.message.toLowerCase().includes("network")) {
                if (attempt < 3) {
                  await delay(2000);
                  continue;
                }
                set({ isLoggedIn: false });
                return;
              }

              // HTTP 状态码错误
              const statusCode = parseHttpStatus(error);
              if (statusCode) {
                // 5xx 服务器错误，可以重试
                if (statusCode >= 500) {
                  if (attempt < 3) {
                    await delay(2000);
                    continue;
                  }
                  set({ isLoggedIn: false });
                  return;
                }
                // 4xx 客户端错误（除 401 外），不需要重试
                set({ isLoggedIn: false });
                return;
              }
            }

            // 其他未知错误，重试
            if (attempt < 3) {
              await delay(2000);
              continue;
            }
            set({ isLoggedIn: false });
            return;
          }
        }
      } catch (error) {
        logger.error("Failed to check login status:", error);
        set({ isLoggedIn: false });
      } finally {
        checkLoginStatusPromise = null;
      }
    })();

    return checkLoginStatusPromise;
  },

  logout: async () => {
    try {
      await api.logout();
      set({ isLoggedIn: false });
    } catch (error) {
      logger.error("Failed to logout:", error);
      await AsyncStorage.setItem('authCookies', '');
      try {
        await CookieManager.clearAll();
      } catch {
        // 忽略
      }
      set({ isLoggedIn: false });
    }
  },
}));

export default useAuthStore;
