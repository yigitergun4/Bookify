import axios, { AxiosError } from "axios";
import ENV from "../config/env";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_RETRY_COUNT = ENV.API_RETRY_COUNT;
const API_RETRY_DELAY = ENV.API_RETRY_DELAY;

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const withRetry = async <T>(
  operation: () => Promise<T>,
  retryCount: number = API_RETRY_COUNT,
  delay: number = API_RETRY_DELAY
): Promise<T> => {
  let lastError: Error | null = null;

  for (let i = 0; i < retryCount; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if it's not a network error or server error
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response && axiosError.response.status < 500) {
          throw new ApiError(
            axiosError.message,
            axiosError.response.status,
            axiosError
          );
        }
      }

      if (i < retryCount - 1) {
        await sleep(delay * Math.pow(2, i));
      }
    }
  }

  throw new ApiError(
    `Operation failed after ${retryCount} retries`,
    undefined,
    lastError
  );
};

export const handleApiError = (error: unknown): never => {
  if (error instanceof ApiError) {
    throw error;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    throw new ApiError(
      axiosError.message,
      axiosError.response?.status,
      axiosError
    );
  }

  throw new ApiError(
    error instanceof Error ? error.message : "Unknown error occurred"
  );
};
