import { CacheService } from "./cacheService";
import { withRetry, ApiError } from "../utils/apiUtils";
import ENV from "../config/env";
import SHA256 from "crypto-js/sha256";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: ENV.OPENAI_API_KEY,
});

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

3. **"language"**: Return the original language in ISO 639-1 format (e.g., "tr", "en", "fr"). If unknown, return "Unknown".

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
            Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini", // gpt-4o-mini kullanmamın sebebi anlama kabiliyeti daha iyi
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: ocrText },
            ],
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
        console.log("Failed to parse GPT response:", content);
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

export async function isSimilarTitle(
  title1: string,
  title2: string
): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // gpt-4o kullanmamın sebebi çok dilli analiz edecek olması
      messages: [
        {
          role: "system",
          content: `You are a strict assistant that determines if two book titles refer to the same work, even if the titles are in different languages. You must only reply with "Yes" or "No" — no other text, no punctuation, no explanations.`,
        },
        {
          role: "user",
          content: `Do the following two book titles refer to the same book, even if they are in different languages?\n\n1. ${title1}\n2. ${title2}\n\nOnly reply with Yes or No.`,
        },
      ],
      temperature: 0,
    });

    const reply = response.choices[0]?.message?.content?.trim();
    return reply === "Yes";
  } catch (error) {
    console.error("[isSimilarTitle] GPT error:", error);
    return false;
  }
}

export async function isSimilarAuthor(author1: string, author2: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // yapılan işlem için yeterli
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are a strict assistant that determines if two author names refer to the same person, even with different name orders, abbreviations, or language variations. You must only reply with "Yes" or "No" — no other text, no punctuation, no explanations.`,
      },
      {
        role: "user",
        content: `Do these two author names refer to the same person?\n\n1. ${author1}\n2. ${author2}\n\nOnly reply with Yes or No.`,
      },
    ],
  });

  const answer = response.choices[0]?.message?.content?.trim();
  return answer === "Yes";
}
