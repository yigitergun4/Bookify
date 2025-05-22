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
  language: string;
  english_title?: string;
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

    // If not in cache, make API call with retry
    const result = await withRetry(async () => {
      const systemPrompt = `You are an expert bibliographic metadata extractor. 
Given the OCR-extracted text from a book cover, identify and return only the following four fields in strict JSON:

{
  "title": "...",
  "authors": ["...","..."],
  "language": "xxx",
  "english_title": "..."
}

Instructions:
1. **title**: The original book title. Exclude any translator names, edition statements, publisher imprint, printing details, subtitles, series names or other cover text.
2. **authors**: A list of the primary author(s) only. Do not include translator(s), editor(s), illustrator(s), or any secondary credits.
3. **language**: The ISO 639-2 code of the original language (e.g. "tur" for Turkish, "fra" for French). If unknown, use "und".
4. **english_title**: If the book was originally written in English, repeat the title here. If it was in another language and you know the official English translation, provide it; otherwise set this equal to "Unknown".

If any field cannot be determined, use \`"Unknown"\` for title/authors and \`"und"\` for language. 
Do not output any explanatory text—only the JSON object.`;

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
            model: "gpt-4-turbo",
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
          language: parsed.language || "und",
          english_title: parsed.english_title || undefined,
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
