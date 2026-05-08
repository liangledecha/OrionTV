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

    const tryCredentialLogin = async (): Promise<boolean> => {
      const savedCredentials = await LoginCredentialsManager.get();
      const isLocalStorage = serverConfig?.StorageType === "localstorage";

      if (!savedCredentials?.password && !isLocalStorage) {
        return false;
      }

      if (isLocalStorage && !savedCredentials?.password) {
        return false;
      }

      const username = isLocalStorage ? undefined : savedCredentials?.username;
      const password = savedCredentials?.password;
      let lastError: unknown;

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const loginResult = await api.login(username, password);
          if (loginResult.ok) {
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
          }
        }
      }

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
      const authToken = await AsyncStorage.getItem('authCookies');
      if (authToken) {
        let cookieValid = false;
        try {
          cookieValid = await api.validateSession();
        } catch (error) {
          if (error instanceof Error && error.message === "UNAUTHORIZED") {
            cookieValid = false;
          } else {
            throw error;
          }
        }

        if (cookieValid) {
          set({ isLoggedIn: true, isLoginModalVisible: false });
          return;
        }

        await AsyncStorage.setItem('authCookies', '');
      }

      const loginSuccess = await tryCredentialLogin();
      if (loginSuccess) {
        set({ isLoggedIn: true, isLoginModalVisible: false });
        return;
      }

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
      }
    }
  },
  logout: async () => {
    try {
      await api.logout();
      set({ isLoggedIn: false, isLoginModalVisible: true });
    } catch (error) {
      logger.error("Failed to logout:", error);
    }
  },
}));

export default useAuthStore;
