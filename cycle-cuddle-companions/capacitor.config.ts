import type { CapacitorConfig } from '@capacitor/cli';

const isLiveDev = process.env.CAPACITOR_LIVE === 'true';

const config: CapacitorConfig = {
  appId: 'com.hackcache.cyclecuddle',
  appName: 'Cycle Companions',
  webDir: 'dist',
  server: isLiveDev
    ? {
        url: process.env.CAPACITOR_SERVER_URL || 'http://localhost:8080',
        cleartext: true,
        androidScheme: 'http',
      }
    : {
        // Production: bundled web assets served securely from local APK storage
        androidScheme: 'https',
      },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#FAF7F2',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FAF7F2',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
