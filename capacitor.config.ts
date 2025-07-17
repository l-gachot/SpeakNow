import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'AudioRecorderApp',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    allowNavigation: []
  }
};

export default config;
