export default {
  name: "Bookify",
  slug: "Bookify",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/splash.png",
  scheme: "myapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "cover",
    backgroundColor: "#FFFEF0",
  },
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSCameraUsageDescription: "We need your permission to access the camera.",
    },
    bundleIdentifier: "com.yigitergun.Bookify",
    googleServicesFile: "./GoogleService-Info.plist",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "cover",
      backgroundColor: "#FFFEF0",
      dark: {
        image: "./assets/images/splash.png",
        resizeMode: "cover",
        backgroundColor: "#FFFEF0",
      },
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.yigitergun.Bookify",
    googleServicesFile: "./google-services.json",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "cover",
      backgroundColor: "#FFFEF0",
      dark: {
        image: "./assets/images/splash.png",
        resizeMode: "cover",
        backgroundColor: "#FFFEF0",
      },
    },
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: ["expo-router"],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    FIREBASE_MEASUREMENT_ID: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  },
};
