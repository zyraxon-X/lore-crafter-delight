// Google-served text to speech. The browser's own speech engine is deliberately
// not used: every utterance is synthesised by Google on the server and streamed
// back as MP3, so the same Google voices play on phone, laptop and tablet.

export type TtsGender = "MALE" | "FEMALE" | "NEUTRAL";

export type TtsVoice = {
  // Feed back to /api/tts as the `voice` parameter. Empty means the default
  // Google Translate voice for the language.
  id: string;
  name: string;
  gender: TtsGender;
  lang: string;
};

const LANG_NAMES: Record<string, string> = {
  bangla: "bn",
  bengali: "bn",
  english: "en",
  hindi: "hi",
  urdu: "ur",
  arabic: "ar",
  persian: "fa",
  farsi: "fa",
  tamil: "ta",
  telugu: "te",
  marathi: "mr",
  nepali: "ne",
  spanish: "es",
  french: "fr",
  german: "de",
  portuguese: "pt",
  russian: "ru",
  japanese: "ja",
  korean: "ko",
  chinese: "zh-CN",
  indonesian: "id",
  malay: "ms",
  thai: "th",
  vietnamese: "vi",
  turkish: "tr",
};

// Turns a book's language label ("বাংলা", "Bangla", "bn", "English", ...) into
// the code Google expects.
export function toLangCode(language?: string): string {
  const label = (language ?? "").trim().toLowerCase();
  if (!label) return "bn";
  if (LANG_NAMES[label]) return LANG_NAMES[label];
  // Already looks like a BCP-47 tag (bn, en-GB, zh-CN).
  if (/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(label)) {
    const [head, ...rest] = label.split("-");
    return [head, ...rest.map((part) => part.toUpperCase())].join("-");
  }
  return "bn";
}

export const GENDER_LABEL: Record<TtsGender, string> = {
  MALE: "ছেলে",
  FEMALE: "মেয়ে",
  NEUTRAL: "নিরপেক্ষ",
};

// Google Translate's speech endpoint refuses more than 200 characters, so cut
// to a sentence or word boundary first, then to a hard cut as a last resort.
export const MAX_TRANSLATE_CHARS = 190;

export function clampForGoogle(text: string): string {
  if (text.length <= MAX_TRANSLATE_CHARS) return text;
  const window = text.slice(0, MAX_TRANSLATE_CHARS);
  const boundary = Math.max(
    window.lastIndexOf("।"),
    window.lastIndexOf("॥"),
    window.lastIndexOf("."),
    window.lastIndexOf("!"),
    window.lastIndexOf("?"),
    window.lastIndexOf(" "),
  );
  return (boundary > MAX_TRANSLATE_CHARS / 2 ? window.slice(0, boundary + 1) : window).trim();
}
