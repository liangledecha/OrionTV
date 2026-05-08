import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/services/api";
import useAuthStore from "@/stores/authStore";
import { LoginCredentialsManager } from "@/services/storage";
import Toast from "react-native-toast-message";

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

jest.mock("@/services/storage", () => ({
  LoginCredentialsManager: {
    get: jest.fn(),
    save: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock("react-native-toast-message", () => ({
  show: jest.fn(),
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedApi = api as jest.Mocked<typeof api>;
const mockedLoginCredentialsManager = LoginCredentialsManager as jest.Mocked<typeof LoginCredentialsManager>;
const mockedToast = Toast as unknown as { show: jest.Mock };

describe("App Startup Authentication Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isLoggedIn: false, isLoginModalVisible: false });
  });

  it("should complete full startup flow with valid cookie", async () => {
    // Mock valid cookie exists
    mockedAsyncStorage.getItem.mockResolvedValue('{"session":"valid"}');

    // Mock session validation succeeds
    mockedApi.validateSession.mockResolvedValue(true);

    // Execute startup flow
    await useAuthStore.getState().checkLoginStatus("http://test.com");

    // Verify user is logged in
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(true);
    expect(state.isLoginModalVisible).toBe(false);

    // Verify API calls
    expect(mockedApi.validateSession).toHaveBeenCalledWith();
  });

  it("should handle cookie invalidation and fallback to credential login", async () => {
    // Mock invalid cookie
    mockedAsyncStorage.getItem.mockResolvedValue('{"session":"invalid"}');

    // Mock session validation fails with UNAUTHORIZED
    mockedApi.validateSession.mockRejectedValue(new Error("UNAUTHORIZED"));

    // Mock credentials exist
    mockedLoginCredentialsManager.get.mockResolvedValue({
      username: "testuser",
      password: "testpass",
    });

    // Mock credential login succeeds
    mockedApi.login.mockResolvedValue({ ok: true });

    // Execute startup flow
    await useAuthStore.getState().checkLoginStatus("http://test.com");

    // Verify fallback to credentials
    expect(mockedLoginCredentialsManager.get).toHaveBeenCalled();
    expect(mockedApi.login).toHaveBeenCalledWith(undefined, "testpass");

    // Verify user is logged in
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(true);
  });

  it("should show login modal when all authentication methods fail", async () => {
    // Mock no cookie
    mockedAsyncStorage.getItem.mockResolvedValue(null);

    // Mock no credentials
    mockedLoginCredentialsManager.get.mockResolvedValue(null);

    // Execute startup flow
    await useAuthStore.getState().checkLoginStatus("http://test.com");

    // Verify login modal is shown
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.isLoginModalVisible).toBe(true);
  });

  it("should handle backend connectivity errors gracefully", async () => {
    // Mock cookie exists
    mockedAsyncStorage.getItem.mockResolvedValue('{"session":"valid"}');

    // Mock network error
    mockedApi.validateSession.mockRejectedValue(new Error("后端通信网络错误"));

    // Mock credentials exist
    mockedLoginCredentialsManager.get.mockResolvedValue({
      username: "testuser",
      password: "testpass",
    });

    // Mock credential login also fails with network error
    mockedApi.login.mockRejectedValue(new Error("Network Error"));

    // Execute startup flow
    await useAuthStore.getState().checkLoginStatus("http://test.com");

    // Verify graceful failure - shows login modal
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.isLoginModalVisible).toBe(true);

    // Verify error toast was shown
    expect(mockedToast.show).toHaveBeenCalledWith({
      type: "error",
<<<<<<< HEAD
      text1: "服务器连接失败",
      text2: "后端通信网络错误",
=======
      text1: "Connection Error",
      text2: "Unable to connect to server. Please check your network and API settings.",
>>>>>>> 0094e2d5a080c20995b33106ae727e8818cbda64
    });
  });
});