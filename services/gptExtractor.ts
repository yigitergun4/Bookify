import { CacheService } from "./cacheService";
import { withRetry, ApiError } from "../utils/apiUtils";
import ENV from "../config/env";
import SHA256 from "crypto-js/sha256";
import OpenAI from "openai";

const openai: OpenAI = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

const cacheService: CacheService = CacheService.getInstance();

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
  try {
    if (typeof ocrText !== "string") {
      throw new GPTError("OCR text is not a string");
    }
    if (!ocrText || ocrText.trim().length === 0) {
      throw new GPTError("OCR text is empty");
    }

    const cacheKey: string = `gpt_${SHA256(ocrText).toString()}`;
    const cachedResult: GPTCacheData | null =
      await cacheService.get<GPTCacheData>(cacheKey);

    if (cachedResult) {
      if (Date.now() - cachedResult.timestamp < ENV.CACHE_DURATION) {
        return cachedResult.data;
      }
      await cacheService.delete(cacheKey);
    }

    const result: BookInfo = await withRetry(async () => {
      const systemPrompt: string = `You are a bibliographic metadata extractor.
Extract only the following fields from the OCR-extracted book cover text and return valid JSON:

{
  "title": "...",
  "authors": ["..."],
  "language": "xx",
  "english_title": "..."
}

Rules:
- Only extract the main book title. Ignore edition info, subtitle, series, publisher, translator, etc.
- Only extract the main author(s), not editors or contributors.
- "language" should be ISO 639-1 (e.g. "tr", "en"). If unknown, use "Unknown".
- "english_title": If original title is English, repeat. If an official English translation exists, use it. Otherwise: "Unknown".
- If uncertain about any value, return "Unknown".
- Response must be valid JSON. No markdown, no explanation, no extra text.`;

      const response: any = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: ocrText },
            ],
            temperature: 0,
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
      const rawContent: string = data.choices?.[0]?.message?.content;

      if (!rawContent) {
        throw new GPTError("Empty response from GPT");
      }

      const cleanJson = rawContent
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      try {
        const parsed: BookInfo = JSON.parse(cleanJson);
        if (!parsed.title || !parsed.authors || !parsed.language) {
          throw new GPTError("Invalid response format from GPT");
        }

        return {
          title: parsed.title || "Unknown Title",
          authors: Array.isArray(parsed.authors)
            ? parsed.authors
            : ["Unknown Author"],
          language: parsed.language || "Unknown",
          english_title: parsed.english_title || "Unknown",
        };
      } catch (e) {
        console.log("Failed to parse GPT response:", cleanJson);
        throw new GPTError("Failed to parse GPT response", undefined, e);
      }
    });

    await cacheService.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  } catch (error) {
    console.error("GPT Service Error:", error);
    if (error instanceof GPTError) {
      throw error;
    }
    throw new GPTError("Failed to extract book information", undefined, error);
  }
}

export async function isSimilarTitle(
  title1: string,
  title2: string
): Promise<boolean> {
  try {
    const response: any = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a precise assistant that determines whether two book titles refer to the same book.
Ignore language differences, word order, and common OCR errors (like "c" instead of "ç", "i" instead of "İ").
Only reply with "Yes" or "No". No punctuation, no explanation.`,
        },
        {
          role: "user",
          content: `Do these two book titles refer to the same book?\n\n1. ${title1}\n2. ${title2}`,
        },
      ],
    });

    const reply = response.choices[0]?.message?.content?.trim();
    return reply === "Yes";
  } catch (error) {
    console.error("[isSimilarTitle] GPT error:", error);
    return false;
  }
}

export async function isSimilarAuthor(author1: string, author2: string) {
  if (author1 === "Unknown" || author2 === "Unknown") {
    return true;
  }

  const response: any = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a strict assistant that decides whether two author names refer to the same person.
Ignore OCR spelling issues, name order changes, abbreviations, or initials.
Only reply with "Yes" or "No". No punctuation, no explanation.`,
      },
      {
        role: "user",
        content: `Do these author names refer to the same person?\n\n1. ${author1}\n2. ${author2}`,
      },
    ],
  });

  const answer = response.choices[0]?.message?.content?.trim();
  return answer === "Yes";
}
