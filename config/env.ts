import Constants from "expo-constants";

interface Env {
  VISION_API_KEY: string;
  BOOKS_API_KEY: string;
  OPENAI_API_KEY: string;
  API_RETRY_COUNT: number;
  API_RETRY_DELAY: number;
  CACHE_DURATION: number;
}

const ENV: Env = {
  VISION_API_KEY:
    Constants.expoConfig?.extra?.VISION_API_KEY ||
    "AIzaSyD3wpw7y6jJqL905btvKlscgYku5fZxj_I",
  BOOKS_API_KEY:
    Constants.expoConfig?.extra?.BOOKS_API_KEY ||
    "AIzaSyALRYFWbp8BkrD7ONPPH5TmJ4_oZEUR1yM",
  OPENAI_API_KEY:
    Constants.expoConfig?.extra?.OPENAI_API_KEY ||
    "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",
  API_RETRY_COUNT: 3,
  API_RETRY_DELAY: 1000,
  CACHE_DURATION: 1000 * 60 * 60,
};

export default ENV;
