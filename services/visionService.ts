import axios from "axios";
import ENV from "../config/env";
import { CacheService } from "./cacheService";
import { withRetry, ApiError } from "../utils/apiUtils";
import SHA256 from "crypto-js/sha256";

const cacheService = CacheService.getInstance();

export class VisionError extends ApiError {
  constructor(message: string, statusCode?: number, originalError?: any) {
    super(message, statusCode, originalError);
    this.name = "VisionError";
  }
}

export const detectText = async (base64Image: string) => {
  const VISION_API_KEY = ENV.VISION_API_KEY;
  try {
    // Generate cache key from image content (SHA-256 hash)
    const hash = SHA256(base64Image).toString();
    const cacheKey = `vision_${hash}`;

    // Check cache first
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // If not in cache, make API call with retry
    const result = await withRetry(async () => {
      try {
        const response = await axios.post(
          `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
          {
            requests: [
              {
                image: { content: base64Image },
                features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
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

    // Cache the result
    await cacheService.set(cacheKey, result);

    return result;
  } catch (error) {
    if (error instanceof VisionError) {
      throw error;
    }
    throw new VisionError("Failed to detect text in image", undefined, error);
  }
};
