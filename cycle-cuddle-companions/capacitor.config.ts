import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hackcache.cyclecuddle',
  appName: 'Cycle Companions',
  webDir: 'dist',
  server: {
    url: 'http://192.168.1.16:8080',
    cleartext: true,
    androidScheme: 'http',
    allowNavigation: [
      '192.168.1.16:8000',
      '192.168.1.16:8080',
      '192.168.1.16',
      '192.168.1.19',
      '192.168.1.*',
      'localhost',
      '127.0.0.1',
    ],
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
