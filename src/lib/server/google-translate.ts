import type { VendorPreferredLanguage } from "@/lib/domain/types";

type TranslationResponse = {
  data?: {
    translations?: Array<{
      translatedText?: string;
      detectedSourceLanguage?: string;
    }>;
  };
  error?: {
    message?: string;
  };
};

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function googleTranslateTexts(texts: string[], target: VendorPreferredLanguage) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY is not configured.");
  }

  const nonEmptyTexts = texts.map((text) => text.trim()).filter(Boolean);
  if (nonEmptyTexts.length === 0) return [];

  const body = new URLSearchParams();
  body.set("target", target);
  body.set("format", "text");
  body.set("key", apiKey);
  nonEmptyTexts.forEach((text) => body.append("q", text));

  const response = await fetch("https://translation.googleapis.com/language/translate/v2", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const payload = (await response.json().catch(() => ({}))) as TranslationResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Google Translate request failed.");
  }

  return (payload.data?.translations ?? []).map((entry) => decodeHtmlEntities(entry.translatedText ?? ""));
}

export async function googleTranslateText(text: string, target: VendorPreferredLanguage) {
  const translated = await googleTranslateTexts([text], target);
  return translated[0] ?? text;
}
