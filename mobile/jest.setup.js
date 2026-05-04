jest.mock('@react-native-firebase/messaging', () => {
  const fn = () => ({
    onMessage: jest.fn(() => jest.fn()),
    requestPermission: jest.fn(async () => 1),
    getToken: jest.fn(async () => 'test-token'),
  });
  fn.AuthorizationStatus = { AUTHORIZED: 1, DENIED: 0 };
  return { __esModule: true, default: fn };
});

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(async () => {}),
    displayNotification: jest.fn(async () => {}),
  },
  AndroidImportance: { HIGH: 4 },
}));
