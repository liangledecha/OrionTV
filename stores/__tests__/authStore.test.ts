jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import useAuthStore from "../authStore";
import { api } from "@/services/api";
import Toast from "react-native-toast-message";

jest.mock("@/stores/settingsStore", () => ({
  useSettingsStore: {
    getState: jest.fn(() => ({
      serverConfig: { StorageType: "localstorage" },
      isLoadingServerConfig: false,
    })),
  },
}));

jest.mock("@/services/api", () => ({
  api: {
    validateSession: jest.fn(),
    login: jest.fn(),
    getFavorites: jest.fn(),
  },
}));

jest.mock("react-native-toast-message", () => ({
  show: jest.fn(),
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedApi = api as jest.Mocked<typeof api>;
const mockedToast = Toast as unknown as { show: jest.Mock };

describe("AuthStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isLoggedIn: false, isLoginModalVisible: false });
  });

  it("should set logged out when apiBaseUrl is missing", async () => {
    await useAuthStore.getState().checkLoginStatus(undefined);

    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.isLoginModalVisible).toBe(false);
  });

  it("should accept valid cookie session and not require credential login", async () => {
    mockedAsyncStorage.getItem.mockImplementation(async (key: string) => {
      if (key === "authCookies") return "valid-cookie";
      return null;
    });
    mockedApi.validateSession.mockResolvedValue(true);

    await useAuthStore.getState().checkLoginStatus("http://example.com");

    expect(mockedApi.validateSession).toHaveBeenCalled();
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(useAuthStore.getState().isLoginModalVisible).toBe(false);
  });

  it("should retry credential login when cookie is invalid and save credentials on success", async () => {
    mockedAsyncStorage.getItem.mockImplementation(async (key: string) => {
      if (key === "authCookies") return "invalid-cookie";
      if (key === "mytv_login_credentials") {
        return JSON.stringify({ username: "test-user", password: "test-pass" });
      }
      return null;
    });
    mockedApi.validateSession.mockRejectedValue(new Error("UNAUTHORIZED"));
    mockedApi.login.mockResolvedValue({ ok: true });

    await useAuthStore.getState().checkLoginStatus("http://example.com");

    expect(mockedApi.validateSession).toHaveBeenCalled();
    expect(mockedApi.login).toHaveBeenCalledWith(undefined, "test-pass");
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      "mytv_login_credentials",
      JSON.stringify({ username: "test-user", password: "test-pass" })
    );
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(useAuthStore.getState().isLoginModalVisible).toBe(false);
  });

  it("should retry credentials three times then show backend error when login fails with status code", async () => {
    mockedAsyncStorage.getItem.mockImplementation(async (key: string) => {
      if (key === "authCookies") return "invalid-cookie";
      if (key === "mytv_login_credentials") {
        return JSON.stringify({ username: "test-user", password: "test-pass" });
      }
      return null;
    });
    mockedApi.validateSession.mockRejectedValue(new Error("UNAUTHORIZED"));
    mockedApi.login.mockRejectedValue(new Error("HTTP error! status: 502"));

    await useAuthStore.getState().checkLoginStatus("http://example.com");

    expect(mockedApi.login).toHaveBeenCalledTimes(3);
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
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().isLoginModalVisible).toBe(true);
  });
});
