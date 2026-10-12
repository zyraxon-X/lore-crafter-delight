// Read-aloud uses Google's Translate speech endpoint — the one that actually
// worked when tested. It needs no API key, and the audio is produced by Google
// on the server, so the same voice plays on phones and laptops. The browser's
// own speech engine is deliberately not used.

// Google Translate refuses more than 200 characters, so requests are trimmed to
// a sentence or word boundary first, then to a hard cut as a last resort.
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
  if (/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(label)) {
    const [head, ...rest] = label.split("-");
    return [head, ...rest.map((part) => part.toUpperCase())].join("-");
  }
  return "bn";
}
