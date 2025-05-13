export default {
  name: "Bookify",
  slug: "Bookify",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "myapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSCameraUsageDescription: "We need your permission to access the camera.",
    },
    bundleIdentifier: "com.yigitergun.Bookify",
    googleServicesFile: "./GoogleService-Info.plist",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.yigitergun.Bookify",
    googleServicesFile: "./google-services.json",
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
    FIREBASE_API_KEY: "AIzaSyC-4JM54CZZJlfXMQzf7W_YEHt_NIjyPbw",
    FIREBASE_AUTH_DOMAIN: "bookify-98949.firebaseapp.com",
    FIREBASE_PROJECT_ID: "bookify-98949",
    FIREBASE_STORAGE_BUCKET: "bookify-98949.firebasestorage.app",
    FIREBASE_MESSAGING_SENDER_ID: "78369109206",
    FIREBASE_APP_ID: "1:78369109206:web:b2fe28483c217060e90577",
  },
};
