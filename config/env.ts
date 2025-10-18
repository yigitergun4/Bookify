interface Env {
  VISION_API_KEY: string;
  BOOKS_API_KEY: string;
  OPENAI_API_KEY: string;
  API_RETRY_COUNT: number;
  API_RETRY_DELAY: number;
  CACHE_DURATION: number;
  WEB_CLIENT_ID: string;
}

const ENV: Env = {
  VISION_API_KEY: process.env.EXPO_PUBLIC_VISION_API_KEY || "",
  BOOKS_API_KEY: process.env.EXPO_PUBLIC_BOOKS_API_KEY || "",
  OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || "",
  API_RETRY_COUNT: 3,
  API_RETRY_DELAY: 1000,
  CACHE_DURATION: 1000 * 60 * 60,
  WEB_CLIENT_ID: process.env.EXPO_PUBLIC_WEB_CLIENT_ID || "",
};

export default ENV;
