import { useSettingsStore } from '@/stores/settingsStore';

export interface ApiConfigStatus {
  isConfigured: boolean;
  isValidating: boolean;
  isValid: boolean | null;
  error: string | null;
  needsConfiguration: boolean;
}

/**
 * 纯派生状态的 Hook，直接基于 settingsStore 的状态计算 API 配置状态。
 * 不发起任何独立的网络请求，避免与 settingsStore.fetchServerConfig() 产生竞态。
 */
export const useApiConfig = () => {
  const { apiBaseUrl, serverConfig, isLoadingServerConfig, serverConfigError } = useSettingsStore();

  const isConfigured = Boolean(apiBaseUrl && apiBaseUrl.trim());

  const status: ApiConfigStatus = {
    isConfigured,
    isValidating: isLoadingServerConfig,
    isValid: serverConfig !== null,
    error: serverConfigError,
    needsConfiguration: !isConfigured,
  };

  return status;
};

export const getApiConfigErrorMessage = (status: ApiConfigStatus): string => {
  if (status.needsConfiguration) {
    return '请点击右上角设置按钮，配置您的服务器地址';
  }

  if (status.error) {
    return status.error;
  }

  if (status.isValidating) {
    return '正在验证服务器配置...';
  }

  if (status.isValid === false) {
    return '服务器配置验证失败，请检查设置';
  }

  return '加载失败，请重试';
};