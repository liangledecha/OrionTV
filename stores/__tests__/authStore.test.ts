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

  it("should retry login three times then fail on backend error", async () => {
    mockedApi.login.mockRejectedValue(new Error("HTTP error! status: 502"));

    await useAuthStore.getState().checkLoginStatus("http://example.com");

    expect(mockedApi.login).toHaveBeenCalledTimes(3);
<<<<<<< HEAD
=======
<<<<<<< HEAD
    expect(mockedToast.show).toHaveBeenCalledWith({ type: "error", text1: "服务器错误", text2: "服务器暂时不可用，请稍后重试" });
=======
<<<<<<< HEAD
    expect(mockedToast.show).toHaveBeenCalledWith({ type: "error", text1: "服务器错误", text2: "服务器暂时不可用，请稍后重试" });
=======
<<<<<<< HEAD
    expect(mockedToast.show).toHaveBeenCalledWith({ type: "error", text1: "服务器错误", text2: "服务器暂时不可用，请稍后重试" });
=======
<<<<<<< HEAD
    expect(mockedToast.show).toHaveBeenCalledWith({ type: "error", text1: "服务器错误", text2: "服务器暂时不可用，请稍后重试" });
=======
    expect(mockedToast.show).toHaveBeenCalledWith({ type: "error", text1: "Connection Error", text2: "Unable to connect to server. Please check your network and API settings." });
>>>>>>> 0094e2d5a080c20995b33106ae727e8818cbda64
>>>>>>> cb37368ed8437040b91ad472c9b787fe495427a7
>>>>>>> e95f1624fed2722898e1f50230f8e54a71aa2c8d
>>>>>>> cf55e7ed14b9bb31c39dc220b7026d8c0269b52d
>>>>>>> 5f8d69c57c0d01b9c7bb8a7c24f319905421faa5
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    // 弹窗已禁用
    expect(useAuthStore.getState().isLoginModalVisible).toBe(false);
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
  });
});
