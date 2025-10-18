import { COUNTRIES } from "@/contexts/LibraryContext";

// Country to ISO 3166-1 Alpha-2 code mapping
export const COUNTRY_TO_ISO_CODE: { [key: string]: string } = {
  "United States": "US",
  "United Kingdom": "GB",
  Canada: "CA",
  Australia: "AU",
  Germany: "DE",
  France: "FR",
  Spain: "ES",
  Italy: "IT",
  Japan: "JP",
  "South Korea": "KR",
  India: "IN",
  Brazil: "BR",
  Mexico: "MX",
  Turkey: "TR",
  Netherlands: "NL",
  Sweden: "SE",
  Norway: "NO",
  Denmark: "DK",
  Finland: "FI",
  Russia: "RU",
  China: "CN",
  Singapore: "SG",
  "New Zealand": "NZ",
  "South Africa": "ZA",
  Argentina: "AR",
};

// Country to language code mapping for Google Books API
export const COUNTRY_TO_LANGUAGE: { [key: string]: string } = {
  "United States": "en",
  "United Kingdom": "en",
  Canada: "en",
  Australia: "en",
  Germany: "de",
  France: "fr",
  Spain: "es",
  Italy: "it",
  Japan: "ja",
  "South Korea": "ko",
  India: "en",
  Brazil: "pt",
  Mexico: "es",
  Turkey: "tr",
  Netherlands: "nl",
  Sweden: "sv",
  Norway: "no",
  Denmark: "da",
  Finland: "fi",
  Russia: "ru",
  China: "zh",
  Singapore: "en",
  "New Zealand": "en",
  "South Africa": "en",
  Argentina: "es",
};

/**
 * Get ISO country code for a given country name
 */
export const getCountryCode = (countryName: string): string => {
  return COUNTRY_TO_ISO_CODE[countryName] || "TR"; // Default to Turkey
};

/**
 * Get language code for a given country name
 */
export const getLanguageCode = (countryName: string): string => {
  return COUNTRY_TO_LANGUAGE[countryName] || "tr"; // Default to Turkish
};

/**
 * Get all supported countries
 */
export const getSupportedCountries = (): string[] => {
  return COUNTRIES;
};

/**
 * Check if a country is supported
 */
export const isCountrySupported = (countryName: string): boolean => {
  return COUNTRIES.includes(countryName);
};
