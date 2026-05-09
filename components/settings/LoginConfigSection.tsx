import React, { useState, useRef } from "react";
import { View, TextInput, StyleSheet, Animated, Platform } from "react-native";
import { useTVEventHandler } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { SettingsSection } from "./SettingsSection";
import { useSettingsStore } from "@/stores/settingsStore";
import { useButtonAnimation } from "@/hooks/useAnimation";
import { Colors } from "@/constants/Colors";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { StyledButton } from "@/components/StyledButton";
import { api } from "@/services/api";
import Toast from "react-native-toast-message";

interface LoginConfigSectionProps {
  onChanged: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const LoginConfigSection: React.FC<LoginConfigSectionProps> = ({
  onChanged,
  onFocus,
  onBlur,
}) => {
  const { username, password, setUsername, setPassword, serverConfig } = useSettingsStore();
  const [isSectionFocused, setIsSectionFocused] = useState(false);
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const usernameInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const inputAnimationStyle = useButtonAnimation(isSectionFocused, 1.01);
  const deviceType = useResponsiveLayout().deviceType;
  const isLocalStorage = serverConfig?.StorageType === "localstorage";

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    onChanged();
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    onChanged();
  };

  const handleSectionFocus = () => {
    setIsSectionFocused(true);
    onFocus?.();
  };

  const handleSectionBlur = () => {
    setIsSectionFocused(false);
    onBlur?.();
  };

  const handleTestLogin = async () => {
    if (!password && !isLocalStorage) {
      Toast.show({ type: "error", text1: "请输入密码" });
      return;
    }
    if (isLocalStorage && !password) {
      Toast.show({ type: "error", text1: "请输入密码" });
      return;
    }

    setIsTesting(true);
    try {
      const loginResult = await api.login(isLocalStorage ? undefined : username, password);
      if (loginResult.ok) {
        Toast.show({ type: "success", text1: "登录成功", text2: "账号密码验证通过" });
      } else {
        Toast.show({ type: "error", text1: "登录失败", text2: "账号或密码错误" });
      }
    } catch (error) {
      let errorText1 = "登录失败";
      let errorText2 = "请检查服务器地址和网络连接";
      if (error instanceof Error) {
        if (error.message === "UNAUTHORIZED") {
          errorText2 = "账号或密码错误";
        } else if (error.message.toLowerCase().includes("network")) {
          errorText2 = "网络连接失败，请检查网络";
        } else if (error.message.includes("HTTP error! status:")) {
          const match = error.message.match(/HTTP error! status: (\d{3})/);
          const status = match ? match[1] : "";
          errorText2 = `服务器返回错误 (${status})`;
        } else {
          errorText2 = error.message;
        }
      }
      Toast.show({ type: "error", text1: errorText1, text2: errorText2 });
    } finally {
      setIsTesting(false);
    }
  };

  // TV遥控器事件处理
  const handleTVEvent = React.useCallback(
    (event: any) => {
      if (isSectionFocused && event.eventType === "select") {
        usernameInputRef.current?.focus();
      }
    },
    [isSectionFocused]
  );

  useTVEventHandler(handleTVEvent);

  return (
    <SettingsSection focusable onFocus={handleSectionFocus} onBlur={handleSectionBlur}
      {...Platform.isTV || deviceType !== 'tv' ? undefined : { onPress: () => usernameInputRef.current?.focus() }}
    >
      <View style={styles.inputContainer}>
        <View style={styles.titleContainer}>
          <ThemedText style={styles.sectionTitle}>登录配置</ThemedText>
          <ThemedText style={styles.subtitle}>
            {isLocalStorage ? "localstorage 模式只需密码" : "请输入后端认证账号和密码"}
          </ThemedText>
        </View>

        {!isLocalStorage && (
          <Animated.View style={inputAnimationStyle}>
            <TextInput
              ref={usernameInputRef}
              style={[styles.input, isUsernameFocused && styles.inputFocused]}
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="用户名"
              placeholderTextColor="#888"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setIsUsernameFocused(true)}
              onBlur={() => setIsUsernameFocused(false)}
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />
          </Animated.View>
        )}

        <Animated.View style={[inputAnimationStyle, { marginTop: 8 }]}>
          <TextInput
            ref={passwordInputRef}
            style={[styles.input, isPasswordFocused && styles.inputFocused]}
            value={password}
            onChangeText={handlePasswordChange}
            placeholder={isLocalStorage ? "密码" : "密码"}
            placeholderTextColor="#888"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={() => setIsPasswordFocused(false)}
            returnKeyType="done"
          />
        </Animated.View>

        <View style={styles.buttonContainer}>
          <StyledButton
            text={isTesting ? "验证中..." : "测试登录"}
            onPress={handleTestLogin}
            variant="secondary"
            disabled={isTesting}
            style={[styles.loginButton, isTesting && styles.disabledButton]}
          />
        </View>
      </View>
    </SettingsSection>
  );
};

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 12,
  },
  subtitle: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    height: 50,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#3a3a3c",
    color: "white",
    borderColor: "transparent",
  },
  inputFocused: {
    borderColor: Colors.dark.primary,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonContainer: {
    marginTop: 12,
    alignItems: "flex-start",
  },
  loginButton: {
    minHeight: 44,
    paddingHorizontal: 24,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
