import { ExpoConfig, ConfigContext } from 'expo/config'

const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || ''

export default ({ config: _config }: ConfigContext): ExpoConfig => ({
  name: 'liblib',
  slug: 'liblib',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  scheme: 'liblib',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#6366F1',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.liblib.app',
    infoPlist: {
      NSCameraUsageDescription: 'LibLib needs camera access to scan book barcodes',
    },
    usesAppleSignIn: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#6366F1',
    },
    edgeToEdgeEnabled: true,
    package: 'com.liblib.app',
    permissions: ['CAMERA'],
  },
  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission: 'LibLib needs camera access to scan book barcodes',
      },
    ],
    [
      'expo-image-picker',
      {
        colors: {
          cropToolbarColor: '#ffffff',
          cropToolbarIconColor: '#000000',
          cropToolbarActionTextColor: '#000000',
          cropBackButtonIconColor: '#000000',
          cropBackgroundColor: '#000000',
        },
        dark: {
          colors: {
            cropToolbarColor: '#1a1a1a',
            cropToolbarIconColor: '#ffffff',
            cropToolbarActionTextColor: '#ffffff',
            cropBackButtonIconColor: '#ffffff',
            cropBackgroundColor: '#000000',
          },
        },
      },
    ],
    'expo-apple-authentication',
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME || 'com.googleusercontent.apps.placeholder',
      },
    ],
    [
      // iCloud container identifier is intentionally configurable rather than
      // hardcoded — the dev-client build needs a real provisioned container
      // (`iCloud.com.liblib.app`), but tsc / prebuild / `expo export` all work
      // against the placeholder so the JS workflow is unblocked.
      '@y_nk/react-native-cloud-sync',
      {
        containerIdentifier:
          process.env.LIBLIB_ICLOUD_CONTAINER || 'iCloud.com.example.placeholder',
      },
    ],
  ],
  experiments: {
    baseUrl,
  },
})
