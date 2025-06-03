import { CacheService } from "./cacheService";
import { withRetry, ApiError } from "../utils/apiUtils";
import ENV from "../config/env";
import SHA256 from "crypto-js/sha256";

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
  language: string;
  english_title?: string;
}

interface GPTCacheData {
  data: BookInfo;
  timestamp: number;
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

    // more secure cache key
    const cacheKey = `gpt_${SHA256(ocrText).toString()}`;

    // check cache
    const cachedResult = await cacheService.get<GPTCacheData>(cacheKey);
    if (cachedResult) {
      // if cache is not expired, return it
      if (Date.now() - cachedResult.timestamp < ENV.CACHE_DURATION) {
        return cachedResult.data;
      }
      // if cache is expired, delete it
      await cacheService.delete(cacheKey);
    }

    // If not in cache, make API call with retry
    const result = await withRetry(async () => {
      const systemPrompt = `You are an expert bibliographic metadata extractor.
Given OCR-extracted text from a book cover, extract and return only the following fields in strict JSON format:

{
  "title": "...",
  "authors": ["...","..."],
  "language": "xxx",
  "english_title": "..."
}

Instructions:

1. **"title"**: Extract the original book title only.
   - Combine multiple lines if the title is broken across lines (e.g., "BEYAZ", "ZAMBAKLAR", "ÜLKESİNDE" → "Beyaz Zambaklar Ülkesinde")
   - The title is usually the largest or most central text, often in all-caps, and may span multiple lines.
   - **Do not include** translator names, subtitles, series names, edition info, publisher imprint, or print details.

2. **"authors"**: Identify the primary author(s) only.
   - Do **not** include translators, editors, illustrators, or contributors.
   - Author names may appear above or below the title. Common known authors should be preferred.

3. **"language"**: Return the original language in ISO 639-1 format (e.g., "tr", "en", "fr"). If unknown, return "und".

4. **"english_title"**: 
   - If the original title is in English, repeat it here.
   - If not, and an official English translation exists, provide it.
   - Otherwise, return "Unknown".

If you are not 100% certain of a value, use:
- "Unknown" for title, authors, or english_title
- "Unknown" for language
`;

      console.log(
        "Sending request to GPT with text:",
        ocrText.substring(0, 100) + "..."
      );

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
      }

      const data = await response.json();

      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new GPTError("Empty response from GPT");
      }

      try {
        const parsed = JSON.parse(content);
        if (!parsed.title || !parsed.authors || !parsed.language) {
          throw new GPTError("Invalid response format from GPT");
        }
        return {
          title: parsed.title || "Unknown Title",
          authors: Array.isArray(parsed.authors)
            ? parsed.authors
            : ["Unknown Author"],
          language: parsed.language || "Unknown",
          english_title: parsed.english_title || undefined,
        };
      } catch (e) {
        console.error("Failed to parse GPT response:", content);
        throw new GPTError("Failed to parse GPT response", undefined, e);
      }
    });

    // save to cache
    const cacheData: GPTCacheData = {
      data: result,
      timestamp: Date.now(),
    };
    await cacheService.set(cacheKey, cacheData);

    return result;
  } catch (error) {
    console.error("GPT Service Error:", error);
    if (error instanceof GPTError) {
      throw error;
    }
    throw new GPTError("Failed to extract book information", undefined, error);
  }
}
