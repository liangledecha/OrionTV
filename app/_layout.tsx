import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { Platform, View, StyleSheet, AppState, type AppStateStatus } from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CookieManager from "@react-native-cookies/cookies";

import { useSettingsStore } from "@/stores/settingsStore";
import { useRemoteControlStore } from "@/stores/remoteControlStore";
import { useAppStore } from "@/stores/appStore";
import LoginModal from "@/components/LoginModal";
import useAuthStore from "@/stores/authStore";
import { useUpdateStore, initUpdateStore } from "@/stores/updateStore";
import { UpdateModal } from "@/components/UpdateModal";
import { UPDATE_CONFIG } from "@/constants/UpdateConfig";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import Logger from '@/utils/Logger';

const logger = Logger.withTag('RootLayout');

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = "dark";
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const { remoteInputEnabled, apiBaseUrl } = useSettingsStore();
  const { startServer, stopServer } = useRemoteControlStore();
  const { isAppReady, initializeApp } = useAppStore();
  const { checkForUpdate, lastCheckTime } = useUpdateStore();
  const responsiveConfig = useResponsiveLayout();

  // 初始化更新存储
  initUpdateStore();

  // 应用启动时执行统一的初始化序列：
  // 加载设置 → 获取服务器配置 → 登录 → isAppReady = true
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // 应用进入后台时清除 cookie，回到前台时重新登录
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        logger.info('App going to background, clearing cookies');
        await AsyncStorage.setItem('authCookies', '');
        try {
          await CookieManager.clearAll();
        } catch {
          // 忽略
        }
      } else if (nextAppState === 'active' && (prevState === 'background' || prevState === 'inactive')) {
        // 应用从后台回到前台，重新检查登录状态
        logger.info('App returning to foreground, re-checking login status');
        const currentApiBaseUrl = useSettingsStore.getState().apiBaseUrl;
        if (currentApiBaseUrl) {
          await AsyncStorage.setItem('authCookies', '');
          try {
            await CookieManager.clearAll();
          } catch {
            // 忽略
          }
          await useAuthStore.getState().checkLoginStatus(currentApiBaseUrl);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if ((loaded || error) && isAppReady) {
      SplashScreen.hideAsync();
      if (error) {
        logger.warn(`Error in loading fonts: ${error}`);
      }
    }
  }, [loaded, error, isAppReady]);

  // 检查更新
  useEffect(() => {
    if (loaded && UPDATE_CONFIG.AUTO_CHECK && Platform.OS === 'android') {
      // 检查是否需要自动检查更新
      const shouldCheck = Date.now() - lastCheckTime > UPDATE_CONFIG.CHECK_INTERVAL;
      if (shouldCheck) {
        checkForUpdate(true); // 静默检查
      }
    }
  }, [loaded, lastCheckTime, checkForUpdate]);

  useEffect(() => {
    // 只有在非手机端才启动远程控制服务器
    if (remoteInputEnabled && responsiveConfig.deviceType !== "mobile") {
      startServer();
    } else {
      stopServer();
    }
  }, [remoteInputEnabled, startServer, stopServer, responsiveConfig.deviceType]);

  if ((!loaded && !error) || !isAppReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <View style={styles.container}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="detail" options={{ headerShown: false }} />
            {Platform.OS !== "web" && <Stack.Screen name="play" options={{ headerShown: false }} />}
            <Stack.Screen name="search" options={{ headerShown: false }} />
            <Stack.Screen name="live" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="favorites" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </View>
        <Toast />
        <LoginModal />
        <UpdateModal />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
