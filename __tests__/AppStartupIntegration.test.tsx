import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/services/api";
import useAuthStore, { __resetCheckLoginStatusForTest } from "@/stores/authStore";

// Mock all external dependencies
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("@/stores/settingsStore", () => ({
  useSettingsStore: {
    getState: jest.fn(() => ({
      serverConfig: { StorageType: "localstorage" },
      isLoadingServerConfig: false,
      username: "",
      password: "testpass",
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

describe("App Startup Authentication Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetCheckLoginStatusForTest();
    useAuthStore.setState({ isLoggedIn: false, isLoginModalVisible: false });
  });

  it("should complete full startup flow with valid credentials", async () => {
    // Mock credential login succeeds
    mockedApi.login.mockResolvedValue({ ok: true });

    // Execute startup flow
    await useAuthStore.getState().checkLoginStatus("http://test.com");

    // Verify old cookie was cleared
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith("authCookies", "");

    // Verify login was called with settings credentials
    expect(mockedApi.login).toHaveBeenCalledWith(undefined, "testpass");

    // Verify user is logged in
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(true);
    expect(state.isLoginModalVisible).toBe(false);
  });

  it("should handle login failure gracefully without showing modal", async () => {
    // Mock credential login fails
    mockedApi.login.mockRejectedValue(new Error("UNAUTHORIZED"));

    // Execute startup flow
    await useAuthStore.getState().checkLoginStatus("http://test.com");

    // Verify graceful failure - no login modal shown
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.isLoginModalVisible).toBe(false);
  });

  it("should set logged out when no credentials in settings", async () => {
    const { useSettingsStore } = require("@/stores/settingsStore");
    useSettingsStore.getState.mockReturnValue({
      serverConfig: { StorageType: "redis" },
      isLoadingServerConfig: false,
      username: "",
      password: "",
    });

    // Execute startup flow
    await useAuthStore.getState().checkLoginStatus("http://test.com");

    // Verify login modal is NOT shown (disabled)
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.isLoginModalVisible).toBe(false);
  });

  it("should handle backend connectivity errors gracefully", async () => {
    // Mock network error
    mockedApi.login.mockRejectedValue(new Error("Network Error"));

    // Execute startup flow
    await useAuthStore.getState().checkLoginStatus("http://test.com");

    // Verify graceful failure - no login modal shown
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
<<<<<<< HEAD
    expect(state.isLoginModalVisible).toBe(false);
=======
    expect(state.isLoginModalVisible).toBe(true);

    // Verify error toast was shown
    expect(mockedToast.show).toHaveBeenCalledWith({
      type: "error",
<<<<<<< HEAD
      text1: "服务器连接失败",
      text2: "后端通信网络错误",
=======
<<<<<<< HEAD
      text1: "服务器连接失败",
      text2: "后端通信网络错误",
=======
<<<<<<< HEAD
      text1: "服务器连接失败",
      text2: "后端通信网络错误",
=======
<<<<<<< HEAD
      text1: "服务器连接失败",
      text2: "后端通信网络错误",
=======
      text1: "Connection Error",
      text2: "Unable to connect to server. Please check your network and API settings.",
>>>>>>> 0094e2d5a080c20995b33106ae727e8818cbda64
>>>>>>> cb37368ed8437040b91ad472c9b787fe495427a7
>>>>>>> e95f1624fed2722898e1f50230f8e54a71aa2c8d
>>>>>>> cf55e7ed14b9bb31c39dc220b7026d8c0269b52d
    });
>>>>>>> 5f8d69c57c0d01b9c7bb8a7c24f319905421faa5
  });
});
