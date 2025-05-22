import { CacheService } from "./cacheService";
import { withRetry, ApiError } from "../utils/apiUtils";
import ENV from "../config/env";

const cacheService = CacheService.getInstance();

export class GPTError extends ApiError {
  constructor(message: string, statusCode?: number, originalError?: any) {
    super(message, statusCode, originalError);
    this.name = "GPTError";
  }
}

export interface BookInfo {
  title: string;
  authors: string[];
}

export async function extractBookInfoWithGPT(
  ocrText: string
): Promise<BookInfo> {
  const OPENAI_API_KEY = ENV.OPENAI_API_KEY;

  try {
    if (typeof ocrText !== "string") {
      throw new GPTError("OCR text is not a string");
    }
    if (!ocrText || ocrText.trim().length === 0) {
      throw new GPTError("OCR text is empty");
    }
    // Generate cache key from OCR text
    const cacheKey = `gpt_${ocrText.substring(0, 50)}`;
    // Check cache first
    const cachedResult = await cacheService.get<BookInfo>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const result = await withRetry(async () => {
      const systemPrompt = `Extract book title and author(s) from the following OCR text. Return only JSON: {"title": "...", "authors": ["...", "..."]}. If you can't determine the information, use "Unknown" as the value.`;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: ocrText },
            ],
            temperature: 0.2,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("GPT API Error:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new GPTError(
          `GPT API error: ${response.statusText} (${response.status})`,
          response.status,
          errorData
        );
        console.log(errorData, "errorData");
      }

      const data = await response.json();
      console.log("GPT Response:", data);

      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new GPTError("Empty response from GPT");
      }

      try {
        const parsed = JSON.parse(content);
        if (!parsed.title || !parsed.authors) {
          throw new GPTError("Invalid response format from GPT");
        }
        return {
          title: parsed.title || "Unknown Title",
          authors: Array.isArray(parsed.authors)
            ? parsed.authors
            : ["Unknown Author"],
        };
      } catch (e) {
        console.error("Failed to parse GPT response:", content);
        throw new GPTError("Failed to parse GPT response", undefined, e);
      }
    });

    // Cache the result
    await cacheService.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error("GPT Service Error:", error);
    if (error instanceof GPTError) {
      throw error;
    }
    throw new GPTError("Failed to extract book information", undefined, error);
  }
}
