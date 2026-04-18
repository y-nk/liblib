import { ExpoConfig, ConfigContext } from "expo/config";

const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || "";

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: "liblib",
  slug: "liblib",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  scheme: "liblib",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.liblib.app",
    infoPlist: {
      NSCameraUsageDescription: "LibLib needs camera access to scan book barcodes",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    package: "com.liblib.app",
    permissions: ["CAMERA"],
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  plugins: [
    "expo-router",
    [
      "expo-camera",
      {
        cameraPermission: "LibLib needs camera access to scan book barcodes",
      },
    ],
    [
      "expo-image-picker",
      {
        colors: {
          cropToolbarColor: "#ffffff",
          cropToolbarIconColor: "#000000",
          cropToolbarActionTextColor: "#000000",
          cropBackButtonIconColor: "#000000",
          cropBackgroundColor: "#000000",
        },
        dark: {
          colors: {
            cropToolbarColor: "#1a1a1a",
            cropToolbarIconColor: "#ffffff",
            cropToolbarActionTextColor: "#ffffff",
            cropBackButtonIconColor: "#ffffff",
            cropBackgroundColor: "#000000",
          },
        },
      },
    ],
  ],
  experiments: {
    baseUrl,
  },
});
