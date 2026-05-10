jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import useAuthStore, { __resetCheckLoginStatusForTest } from "../authStore";
import { api } from "@/services/api";

jest.mock("@/stores/settingsStore", () => ({
  useSettingsStore: {
    getState: jest.fn(() => ({
      serverConfig: { StorageType: "localstorage" },
      isLoadingServerConfig: false,
      username: "",
      password: "test-pass",
    })),
  },
}));

jest.mock("@/services/api", () => ({
  api: {
    login: jest.fn(),
  },
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedApi = api as jest.Mocked<typeof api>;

describe("AuthStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetCheckLoginStatusForTest();
    useAuthStore.setState({ isLoggedIn: false, isLoginModalVisible: false });
  });

  it("should set logged out when apiBaseUrl is missing", async () => {
    await useAuthStore.getState().checkLoginStatus(undefined);

    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.isLoginModalVisible).toBe(false);
  });

  it("should login successfully with credentials from settings", async () => {
    mockedApi.login.mockResolvedValue({ ok: true });

    await useAuthStore.getState().checkLoginStatus("http://example.com");

    // 应该清除旧 cookie
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith("authCookies", "");
    // 应该使用 settingsStore 中的密码登录
    expect(mockedApi.login).toHaveBeenCalledWith(undefined, "test-pass");
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(useAuthStore.getState().isLoginModalVisible).toBe(false);
  });

  it("should retry login three times then fail on backend error without showing modal", async () => {
    mockedApi.login.mockRejectedValue(new Error("HTTP error! status: 502"));

    await useAuthStore.getState().checkLoginStatus("http://example.com");

    expect(mockedApi.login).toHaveBeenCalledTimes(3);
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    // 服务器错误不弹出登录框，避免打扰用户
    expect(useAuthStore.getState().isLoginModalVisible).toBe(false);
  });

  it("should show login modal when credentials are invalid", async () => {
    mockedApi.login.mockRejectedValue(new Error("UNAUTHORIZED"));

    await useAuthStore.getState().checkLoginStatus("http://example.com");

    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    // 账号密码错误时弹出登录框提示用户重新输入
    expect(useAuthStore.getState().isLoginModalVisible).toBe(true);
  });

  it("should show login modal when server explicitly returns auth failure", async () => {
    mockedApi.login.mockResolvedValue({ ok: false });

    await useAuthStore.getState().checkLoginStatus("http://example.com");

    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().isLoginModalVisible).toBe(true);
  });

  it("should set logged out when no password in settings", async () => {
    const { useSettingsStore } = require("@/stores/settingsStore");
    useSettingsStore.getState.mockReturnValue({
      serverConfig: { StorageType: "redis" },
      isLoadingServerConfig: false,
      username: "",
      password: "",
    });

    await useAuthStore.getState().checkLoginStatus("http://example.com");

    expect(mockedApi.login).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().isLoginModalVisible).toBe(false);
  });
});
