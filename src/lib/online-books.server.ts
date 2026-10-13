// Finds a book online when it is not in the library. Project Gutenberg (via
// the free Gutendex API, no account or key) supplies the full public-domain
// text and cover; Open Library fills in a cover when Gutenberg has none.
export type OnlineBook = {
  sourceId: string;
  title: string;
  author: string;
  description: string;
  language: string;
  genre: string;
  coverUrl: string;
  text: string;
};

const LANG_NAMES: Record<string, string> = {
  en: "English",
  bn: "বাংলা",
  hi: "हिन्दी",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  ru: "Русский",
  zh: "中文",
  ja: "日本語",
  nl: "Nederlands",
};

const MAX_CHARS = 380_000;

type GutendexBook = {
  id: number;
  title: string;
  authors: { name: string }[];
  summaries?: string[];
  subjects?: string[];
  languages?: string[];
  formats: Record<string, string>;
};

async function getJson<T>(url: string, ms = 25_000): Promise<T | undefined> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "boikotha-library" },
      signal: AbortSignal.timeout(ms),
    });
    if (!response.ok) return undefined;
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

// "Tagore, Rabindranath" → "Rabindranath Tagore"
function authorName(raw: string | undefined): string {
  if (!raw) return "অজ্ঞাত লেখক";
  const [last, first] = raw.split(",").map((part) => part.trim());
  return first ? `${first} ${last}` : (last ?? raw);
}

export function stripGutenberg(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n");
  const start = text.search(/\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG[^\n]*\n/i);
  if (start >= 0) text = text.slice(text.indexOf("\n", start) + 1);
  const end = text.search(/\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG/i);
  if (end >= 0) text = text.slice(0, end);
  text = text.trim();
  if (text.length > MAX_CHARS) {
    const cut = text.lastIndexOf("\n\n", MAX_CHARS);
    text = text.slice(0, cut > 0 ? cut : MAX_CHARS).trim();
  }
  return text;
}

function guessGenre(subjects: string[]): string {
  const s = subjects.join(" ").toLowerCase();
  if (/ghost|horror|supernatural/.test(s)) return "ভূত";
  if (/love|romance/.test(s)) return "প্রেম";
  if (/detective|mystery|crime/.test(s)) return "রহস্য";
  if (/science fiction/.test(s)) return "বিজ্ঞান কল্পকাহিনি";
  if (/fantasy|fairy/.test(s)) return "ফ্যান্টাসি";
  if (/adventure|voyage/.test(s)) return "অভিযান";
  if (/poetry|poems/.test(s)) return "কবিতা";
  return "অনলাইন সংগ্রহ";
}

function plainTextUrl(formats: Record<string, string>): string | undefined {
  const key = Object.keys(formats).find((k) => k.startsWith("text/plain"));
  return key ? formats[key] : undefined;
}

async function openLibraryCover(title: string, author: string): Promise<string> {
  const q = encodeURIComponent(`${title} ${author}`);
  const data = await getJson<{ docs?: { cover_i?: number }[] }>(
    `https://openlibrary.org/search.json?q=${q}&limit=1&fields=cover_i`,
    12_000,
  );
  const id = data?.docs?.[0]?.cover_i;
  return id ? `https://covers.openlibrary.org/b/id/${id}-L.jpg` : "";
}

export async function findOnlineBook(query: string): Promise<OnlineBook | undefined> {
  const data = await getJson<{ results?: GutendexBook[] }>(
    `https://gutendex.com/books/?search=${encodeURIComponent(query)}`,
    45_000,
  );
  const hit = data?.results?.find((book) => plainTextUrl(book.formats));
  if (!hit) return undefined;

  const textUrl = plainTextUrl(hit.formats)!;
  let raw = "";
  try {
    const response = await fetch(textUrl, { signal: AbortSignal.timeout(30_000) });
    if (response.ok) raw = await response.text();
  } catch {
    raw = "";
  }
  const text = stripGutenberg(raw);
  if (text.length < 500) return undefined;

  const author = authorName(hit.authors[0]?.name);
  const coverUrl = hit.formats["image/jpeg"] || (await openLibraryCover(hit.title, author));
  const lang = hit.languages?.[0] ?? "en";

  return {
    sourceId: `gutenberg-${hit.id}`,
    title: hit.title.slice(0, 180),
    author,
    description: (hit.summaries?.[0] ?? "").replace(/\s*\(This is an automatically generated summary\.\)/, "").slice(0, 900),
    language: LANG_NAMES[lang] ?? lang,
    genre: guessGenre(hit.subjects ?? []),
    coverUrl,
    text,
  };
}
