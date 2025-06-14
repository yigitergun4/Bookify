import axios from "axios";
import ENV from "../config/env";
import { CacheService } from "./cacheService";
import { withRetry, ApiError } from "../utils/apiUtils";
import SHA256 from "crypto-js/sha256";

const cacheService = CacheService.getInstance();

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export class VisionError extends ApiError {
  constructor(message: string, statusCode?: number, originalError?: any) {
    super(message, statusCode, originalError);
    this.name = "VisionError";
  }
}

interface VisionCacheKey {
  userId: string;
  imageHash: string;
  operationType: string;
  timestamp: number;
}

interface VisionCacheData {
  data: any;
  timestamp: number;
}

export const detectText = async (base64Image: string, userId: string) => {
  const VISION_API_KEY = ENV.VISION_API_KEY;
  try {
    // create cache key
    const cacheKey: VisionCacheKey = {
      userId,
      imageHash: SHA256(base64Image).toString(),
      operationType: "text_detection",
      timestamp: Date.now(),
    };

    const cacheKeyString = JSON.stringify(cacheKey);

    // check cache
    const cachedResult = (await cacheService.get(
      cacheKeyString
    )) as VisionCacheData | null;
    if (cachedResult) {
      // if cache is not expired, return it
      if (Date.now() - cachedResult.timestamp < CACHE_DURATION) {
        return cachedResult.data;
      }
      // if cache is expired, delete it
      await cacheService.delete(cacheKeyString);
    }

    // API call
    const result = await withRetry(async () => {
      try {
        const response = await axios.post(
          `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
          {
            requests: [
              {
                image: { content: base64Image },
                features: [{ type: "TEXT_DETECTION" }],
              },
            ],
          }
        );
        if (!response.data.responses?.[0]) {
          throw new VisionError("No text detected in image");
        }
        return response.data.responses[0];
      } catch (error: any) {
        if (error.response) {
          console.error("Vision API error response:", error.response.data);
          throw new VisionError(
            "Vision API request failed",
            error.response.status,
            error.response.data
          );
        } else {
          console.error("Vision API error:", error);
          throw new VisionError("Vision API request failed", undefined, error);
        }
      }
    });

    // save result to cache
    const cacheData: VisionCacheData = {
      data: result,
      timestamp: Date.now(),
    };
    await cacheService.set(cacheKeyString, cacheData);

    return result;
  } catch (error) {
    if (error instanceof VisionError) {
      throw error;
    }
    throw new VisionError("Failed to detect text in image", undefined, error);
  }
};
