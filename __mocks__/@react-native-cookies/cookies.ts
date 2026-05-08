export default {
  set: jest.fn(() => Promise.resolve(true)),
  setFromResponse: jest.fn(() => Promise.resolve(true)),
  get: jest.fn(() => Promise.resolve({})),
  getFromResponse: jest.fn(() => Promise.resolve({})),
  clearAll: jest.fn(() => Promise.resolve(true)),
  flush: jest.fn(() => Promise.resolve()),
  removeSessionCookies: jest.fn(() => Promise.resolve(true)),
  getAll: jest.fn(() => Promise.resolve({})),
  clearByName: jest.fn(() => Promise.resolve(true)),
};
