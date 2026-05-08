import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "../api";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe("API", () => {
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
    // @ts-ignore
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should validate session when getFavorites returns successfully", async () => {
    const api = new API("http://example.com");
    mockedAsyncStorage.getItem.mockResolvedValue("cookie-value");
    const jsonMock = jest.fn().mockResolvedValue({});
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ status: 200, ok: true, json: jsonMock });

    await expect(api.validateSession()).resolves.toBe(true);
    expect(global.fetch).toHaveBeenCalledWith("http://example.com/api/favorites", expect.anything());
  });

  it("should return false when validateSession receives UNAUTHORIZED", async () => {
    const api = new API("http://example.com");
    mockedAsyncStorage.getItem.mockResolvedValue("cookie-value");
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ status: 401, ok: false });

    await expect(api.validateSession()).resolves.toBe(false);
  });
});
