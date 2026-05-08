import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/services/api";
import { useSettingsStore } from "./settingsStore";
import { LoginCredentialsManager } from "@/services/storage";
import Toast from "react-native-toast-message";
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

<<<<<<< HEAD
type CredentialLoginResult =
  | { success: true }
  | { success: false; reason: 'no_credentials' | 'unauthorized' | 'network' | 'server' | 'unknown' };

=======
>>>>>>> 0094e2d5a080c20995b33106ae727e8818cbda64
const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  isLoginModalVisible: false,
  showLoginModal: () => set({ isLoginModalVisible: true }),
  hideLoginModal: () => set({ isLoginModalVisible: false }),

  checkLoginStatus: async (apiBaseUrl?: string) => {
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

    if (!serverConfig?.StorageType) {
      if (!settingsState.isLoadingServerConfig) {
        Toast.show({ type: "error", text1: "请检查网络或者服务器地址是否可用" });
      }
      return;
    }

<<<<<<< HEAD
    const tryCredentialLogin = async (): Promise<CredentialLoginResult> => {
=======
    const tryCredentialLogin = async (): Promise<boolean> => {
>>>>>>> 0094e2d5a080c20995b33106ae727e8818cbda64
      const savedCredentials = await LoginCredentialsManager.get();
      const isLocalStorage = serverConfig?.StorageType === "localstorage";

      if (!savedCredentials?.password && !isLocalStorage) {
<<<<<<< HEAD
        return { success: false, reason: 'no_credentials' };
      }

      if (isLocalStorage && !savedCredentials?.password) {
        return { success: false, reason: 'no_credentials' };
=======
        return false;
      }

      if (isLocalStorage && !savedCredentials?.password) {
        return false;
>>>>>>> 0094e2d5a080c20995b33106ae727e8818cbda64
      }

      const username = isLocalStorage ? undefined : savedCredentials?.username;
      const password = savedCredentials?.password;
<<<<<<< HEAD
=======
      let lastError: unknown;
>>>>>>> 0094e2d5a080c20995b33106ae727e8818cbda64

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const loginResult = await api.login(username, password);
          if (loginResult.ok) {
<<<<<<< HEAD
            // 登录成功，刷新保存的凭据（更新保存时间等）
            if (savedCredentials) {
              await LoginCredentialsManager.save(savedCredentials);
            }
            return { success: true };
=======
            if (savedCredentials) {
              await LoginCredentialsManager.save(savedCredentials);
            }
            return true;
          }
          lastError = new Error("LOGIN_FAILED");
        } catch (error) {
          lastError = error;
          if (attempt < 3) {
            await delay(2000);
>>>>>>> 0094e2d5a080c20995b33106ae727e8818cbda64
          }
          // 服务器明确返回 ok: false，说明账号密码错误，不需要重试
          return { success: false, reason: 'unauthorized' };
        } catch (error) {
          if (error instanceof Error) {
            // 后端明确拒绝认证（401），不需要重试
            if (error.message === "UNAUTHORIZED") {
              return { success: false, reason: 'unauthorized' };
            }

            // 网络错误，可以重试
            if (error.message.toLowerCase().includes("network")) {
              if (attempt < 3) {
                await delay(2000);
                continue;
              }
              return { success: false, reason: 'network' };
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
                return { success: false, reason: 'server' };
              }
              // 4xx 客户端错误（除 401 外，如 403, 404 等），不需要重试
              return { success: false, reason: 'server' };
            }
          }

          // 其他未知错误，重试
          if (attempt < 3) {
            await delay(2000);
            continue;
          }
          return { success: false, reason: 'unknown' };
        }
      }

<<<<<<< HEAD
      return { success: false, reason: 'unknown' };
    };

    try {
      // 阶段 1：优先使用 cookie 验证 session
=======
      if (lastError instanceof Error && lastError.message === "UNAUTHORIZED") {
        return false;
      }

      const statusCode = parseHttpStatus(lastError);
      if (statusCode) {
        throw new Error(`后端通信${statusCode}错误`);
      }

      if (lastError instanceof Error && lastError.message.toLowerCase().includes("network")) {
        throw new Error("后端通信网络错误");
      }

      throw lastError;
    };

    try {
>>>>>>> 0094e2d5a080c20995b33106ae727e8818cbda64
      const authToken = await AsyncStorage.getItem('authCookies');
      if (authToken) {
        let cookieValid = false;
        try {
          cookieValid = await api.validateSession();
        } catch (error) {
          if (error instanceof Error && error.message === "UNAUTHORIZED") {
            cookieValid = false;
          } else {
<<<<<<< HEAD
            // 网络错误或服务器错误，不应继续凭据登录（后端可能不可用）
=======
>>>>>>> 0094e2d5a080c20995b33106ae727e8818cbda64
            throw error;
          }
        }

        if (cookieValid) {
          set({ isLoggedIn: true, isLoginModalVisible: false });
          return;
        }

<<<<<<< HEAD
        // Cookie 已失效，清空
        await AsyncStorage.setItem('authCookies', '');
      }

      // 阶段 2：使用保存的账号密码自动登录
      const credentialResult = await tryCredentialLogin();
      if (credentialResult.success) {
=======
        await AsyncStorage.setItem('authCookies', '');
      }

      const loginSuccess = await tryCredentialLogin();
      if (loginSuccess) {
>>>>>>> 0094e2d5a080c20995b33106ae727e8818cbda64
        set({ isLoggedIn: true, isLoginModalVisible: false });
        return;
      }

<<<<<<< HEAD
      // 阶段 3：根据失败原因处理
      if (credentialResult.reason === 'no_credentials') {
        // 没有保存的凭据，直接显示登录弹窗
        set({ isLoggedIn: false, isLoginModalVisible: true });
        return;
      }

      if (credentialResult.reason === 'unauthorized') {
        // 账号密码错误或后端拒绝认证，清除失效凭据并提示用户
        await LoginCredentialsManager.clear();
        await AsyncStorage.setItem('authCookies', '');
        Toast.show({ type: "error", text1: "登录已过期", text2: "请重新输入账号密码登录" });
        set({ isLoggedIn: false, isLoginModalVisible: true });
        return;
      }

      if (credentialResult.reason === 'network') {
        Toast.show({ type: "error", text1: "网络连接失败", text2: "无法连接到服务器，请检查网络后重试" });
        set({ isLoggedIn: false, isLoginModalVisible: true });
        return;
      }

      if (credentialResult.reason === 'server') {
        Toast.show({ type: "error", text1: "服务器错误", text2: "服务器暂时不可用，请稍后重试" });
        set({ isLoggedIn: false, isLoginModalVisible: true });
        return;
      }

      // 未知错误
      set({ isLoggedIn: false, isLoginModalVisible: true });
    } catch (error) {
      logger.error("Failed to check login status:", error);
      if (error instanceof Error && error.message.toLowerCase().includes("network")) {
        Toast.show({ type: "error", text1: "网络连接失败", text2: "无法连接到服务器，请检查网络后重试" });
      } else if (error instanceof Error && error.message.startsWith("后端通信")) {
        Toast.show({ type: "error", text1: "服务器连接失败", text2: error.message });
      } else if (error instanceof Error) {
        Toast.show({ type: "error", text1: "连接错误", text2: error.message });
=======
      set({ isLoggedIn: false, isLoginModalVisible: true });
    } catch (error) {
      logger.error("Failed to check login status:", error);
      if (error instanceof Error && error.message.startsWith("后端通信")) {
        Toast.show({ type: "error", text1: "Connection Error", text2: "Unable to connect to server. Please check your network and API settings." });
        set({ isLoggedIn: false, isLoginModalVisible: true });
      } else if (error instanceof Error && error.message === "UNAUTHORIZED") {
        set({ isLoggedIn: false, isLoginModalVisible: true });
      } else {
        set({ isLoggedIn: false, isLoginModalVisible: true });
>>>>>>> 0094e2d5a080c20995b33106ae727e8818cbda64
      }
      set({ isLoggedIn: false, isLoginModalVisible: true });
    }
  },

  logout: async () => {
    try {
      await api.logout();
      await LoginCredentialsManager.clear();
      set({ isLoggedIn: false, isLoginModalVisible: true });
    } catch (error) {
      logger.error("Failed to logout:", error);
      // 即使后端登出失败，也要清除本地状态
      await LoginCredentialsManager.clear();
      await AsyncStorage.setItem('authCookies', '');
      set({ isLoggedIn: false, isLoginModalVisible: true });
    }
  },
}));

export default useAuthStore;
