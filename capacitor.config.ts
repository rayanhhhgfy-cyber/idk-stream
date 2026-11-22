import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rayyan.idkstream',
  appName: 'idk-stream',
  webDir: 'public',
  server: {
    url: 'https://idk-stream.vercel.app',
    cleartext: false,
  },
};

export default config;
