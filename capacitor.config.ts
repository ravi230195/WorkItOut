import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.workouttracker.app',
  appName: 'Workout Tracker',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#f5f2ef',
      showSpinner: false
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#f5f2ef'
    },
    Keyboard: {
      resize: 'ionic'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  ios: {
    contentInset: 'automatic',
    infoPlist: {
      NSHealthShareUsageDescription: 'This app needs access to your step count data to track your daily activity and help you reach your fitness goals.',
      NSHealthUpdateUsageDescription: 'This app needs to write workout data to help track your fitness progress and maintain accurate health records.'
    }
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK'
    }
  }
};

export default config;