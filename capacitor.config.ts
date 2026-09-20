import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.azam.paymentmanager',
  appName: 'Payment Manager',
  webDir: 'dist',
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      androidIsEncryption: false
    }
  }
};

export default config;
