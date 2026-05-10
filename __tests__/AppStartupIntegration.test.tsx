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

  it("should show login modal when credentials are invalid", async () => {
    // Mock credential login fails with UNAUTHORIZED
    mockedApi.login.mockRejectedValue(new Error("UNAUTHORIZED"));

    // Execute startup flow
    await useAuthStore.getState().checkLoginStatus("http://test.com");

    // Verify login modal is shown so user can re-enter credentials
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.isLoginModalVisible).toBe(true);
  });

  it("should show login modal when server returns explicit auth failure", async () => {
    mockedApi.login.mockResolvedValue({ ok: false });

    await useAuthStore.getState().checkLoginStatus("http://test.com");

    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.isLoginModalVisible).toBe(true);
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

    // Verify login modal is NOT shown when no credentials exist
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.isLoginModalVisible).toBe(false);
  });

  it("should handle backend connectivity errors gracefully without showing modal", async () => {
    // Mock network error
    mockedApi.login.mockRejectedValue(new Error("Network Error"));

    // Execute startup flow
    await useAuthStore.getState().checkLoginStatus("http://test.com");

    // Verify graceful failure - no login modal shown for network errors
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.isLoginModalVisible).toBe(false);
  });
});
