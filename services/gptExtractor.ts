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
Given OCR-extracted text from a book cover, extract and return only the following fields in **strict** JSON format:

{
  "title": "...",
  "authors": ["...","..."],
  "language": "xxx",
  "english_title": "..."
}

Instructions:
1. "title": Only the original title of the book. Exclude any translator names, edition statements, publisher imprint, printing details, subtitles, series names, or other cover text.
   - If the title appears across multiple lines or words (e.g. one word per line), **combine them in the correct order** to reconstruct the full title.
2. "authors": List only the primary author(s). Do not include translators, editors, illustrators, or secondary credits.
3. "language": The ISO 639-1 code of the original language (e.g. "tr" for Turkish, "fr" for French). If unknown, return "und".
4. "english_title": If the book was originally written in English, repeat the title here. If it was originally in another language and an official English title exists, provide it. Otherwise, return "Unknown".

If you are not 100% certain of a value, use:
- "Unknown" for title, authors, or english_title
- "und" for language

✅ Example Output:
{
  "title": "Beyaz Zambaklar Ülkesinde",
  "authors": ["Grigori Petrov"],
  "language": "tr",
  "english_title": "In the Country of White Lilies"
}

Return **only** the JSON object. Do not include any commentary, explanation, or extra formatting.
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
