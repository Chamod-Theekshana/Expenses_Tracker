import { Platform } from 'react-native';

// Cloudinary (unsigned uploads)
// 1) Create an unsigned upload preset in Cloudinary
// 2) Put your cloud name + preset here
export const CLOUDINARY_CLOUD_NAME = 'dkw8nqukp';
export const CLOUDINARY_UPLOAD_PRESET = 'PROFILE';

export const API_PORT = 5001;

// 🔥 CHANGE THIS when using a physical phone
export const REAL_DEVICE_HOST = '10.16.153.85';

const ANDROID_EMULATOR_HOST = '10.0.2.2';
const IOS_SIMULATOR_HOST = 'localhost';

// Set to true if you are running the app on a real phone.
// If you're on an emulator/simulator, keep this false.
export const USE_REAL_DEVICE = false;

const SIMULATOR_HOST = Platform.OS === 'android' ? ANDROID_EMULATOR_HOST : IOS_SIMULATOR_HOST;
const DEV_HOST = USE_REAL_DEVICE ? REAL_DEVICE_HOST : SIMULATOR_HOST;

const DEV_BASE_URL = `http://${DEV_HOST}:${API_PORT}`;

export const API_URL = DEV_BASE_URL

// Socket.io is hosted on the same origin in this backend
export const SOCKET_URL = API_URL;
