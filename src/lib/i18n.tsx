import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "bn" | "en";

export type Dict = Record<string, string>;

// UI copy for both languages. Book prose stays in its original language; only
// interface text is translated.
const translations: Record<Lang, Dict> = {
  bn: {
    "brand.tagline": "গল্পের ভেতর, নিজের মতো।",
    "header.collection": "বইয়ের সংগ্রহ",
    "header.language": "ভাষা",
    "intro.eyebrow": "কল্পনার কোনো শেষ নেই",
    "intro.titleSub": "এক মলাটে, হাজার অনুভূতি।",
    "intro.body":
      "কখনো গা ছমছমে অন্ধকার, কখনো একটুখানি ভালোবাসা। প্রতিটি বই আলাদা জগৎ। আপনার পরের গল্পটি কোথায়?",
    "intro.cta": "গল্পের জগতে প্রবেশ",
    "intro.books": "টি বই",
    "intro.worlds": "টি ভিন্ন জগৎ",
    "intro.lang": "যেকোনো ভাষা",
    "featured.caption": "পাতায় পাতায় নতুন পৃথিবী",
    "collection.eyebrow": "আপনার গল্প, আপনার পছন্দ",
    "collection.title": "গল্পের সংগ্রহ",
    "collection.all": "সব বই",
    "collection.saved": "আমার তালিকা",
    "collection.search": "আপনার গল্প খুঁজুন...",
    "collection.searchClear": "অনুসন্ধান মুছুন",
    "collection.allGenres": "সব ধরনের গল্প",
    "collection.count": "টি বই",
    "collection.status": "প্রথম অধ্যায় প্রকাশিত",
    "collection.read": "পড়ুন",
    "collection.save": "তালিকায় রাখুন",
    "collection.unsave": "তালিকা থেকে সরান",
    "collection.chapters": "টি অধ্যায়",
    "collection.empty.saved": "আপনার তালিকা এখনো খালি",
    "collection.empty.search": "এই নামে কোনো বই পাওয়া যায়নি",
    "collection.empty.cta": "সব বই দেখুন",
    "collection.novel": "উপন্যাস",
    "footer.note": "পূর্ণাঙ্গ পাণ্ডুলিপি · নতুন অধ্যায় যোগ হচ্ছে",
    "footer.tag": "গল্পে বাঁচুক কল্পনা।",
    "reader.back": "সংগ্রহে ফিরুন",
    "reader.smaller": "অক্ষর ছোট করুন",
    "reader.larger": "অক্ষর বড় করুন",
    "reader.export": "ডাউনলোড",
    "reader.openFile": "খুলুন",
    "reader.contents": "সূচিপত্র",
    "reader.chapterPlan": "অধ্যায়",
    "reader.chapter": "অধ্যায়",
    "reader.chapterEnd": "এই অধ্যায়ের সমাপ্তি",
    "reader.finished": "অধ্যায় পড়া হয়েছে",
    "reader.markRead": "পড়া শেষ",
    "reader.nextChapter": "পরের অধ্যায়",
    "reader.listen": "শুনুন",
    "reader.listenPlaying": "পড়ে শোনানো হচ্ছে",
    "reader.listenPause": "বিরতি",
    "reader.listenResume": "চালু করুন",
    "reader.listenStop": "বন্ধ করুন",
    "reader.listenNext": "পরের অধ্যায়",
    "reader.listenRate": "গতি",
    "reader.listenVoice": "কণ্ঠ",
    "reader.listenAuto": "স্বয়ংক্রিয় (মেয়ে কণ্ঠ)",
    "reader.listenUnsupported": "এই ব্রাউজারে পড়ে শোনানোর সুবিধা নেই।",
    "community.eyebrow": "আপনার লেখা, সবার পড়া",
    "community.title": "কমিউনিটি বই",
    "community.body":
      "আপনার লেখা বই এই লাইব্রেরিতে যোগ করতে চান? যেকোনো ভাষায় লিখুন — শুধু বাংলা বা ইংরেজি নয়। ফোল্ডারে জমা দিন, বা এজেন্ট দিয়ে সরাসরি API-তে পাঠান — অনুমোদনের সঙ্গে সঙ্গে এখানে প্রকাশিত হবে।",
    "community.cta": "জমা দেওয়ার নিয়ম",
    "community.author": "লেখক",
    "community.empty": "নতুন কমিউনিটি বই শীঘ্রই আসছে।",
    "community.readOnline": "অনলাইনে পড়ুন",
    "community.coverOnly": "প্রচ্ছদ ও বিবরণ",
  },
  en: {
    "brand.tagline": "Inside a story, on your own terms.",
    "header.collection": "Book collection",
    "header.language": "Language",
    "intro.eyebrow": "Imagination has no end",
    "intro.titleSub": "One cover, a thousand feelings.",
    "intro.body":
      "Sometimes a chilling dark, sometimes a touch of love. Every book is a separate world. Where is your next story?",
    "intro.cta": "Enter the story worlds",
    "intro.books": " books",
    "intro.worlds": " distinct worlds",
    "intro.lang": "Any language",
    "featured.caption": "A new world on every page",
    "collection.eyebrow": "Your story, your choice",
    "collection.title": "Story collection",
    "collection.all": "All books",
    "collection.saved": "My list",
    "collection.search": "Find your story...",
    "collection.searchClear": "Clear search",
    "collection.allGenres": "All genres",
    "collection.count": " books",
    "collection.status": "Opening chapter published",
    "collection.read": "Read",
    "collection.save": "Save to my list",
    "collection.unsave": "Remove from my list",
    "collection.chapters": " chapters",
    "collection.empty.saved": "Your list is still empty",
    "collection.empty.search": "No book found with that name",
    "collection.empty.cta": "See all books",
    "collection.novel": "Novel",
    "footer.note": "Full manuscripts · new chapters being added",
    "footer.tag": "Let imagination live in stories.",
    "reader.back": "Back to collection",
    "reader.smaller": "Smaller text",
    "reader.larger": "Larger text",
    "reader.export": "Download",
    "reader.openFile": "Open",
    "reader.contents": "Contents",
    "reader.chapterPlan": "Chapters",
    "reader.chapter": "Chapter",
    "reader.chapterEnd": "End of this chapter",
    "reader.finished": "Chapter read",
    "reader.markRead": "Mark as read",
    "reader.nextChapter": "Next chapter",
    "reader.listen": "Listen",
    "reader.listenPlaying": "Reading aloud",
    "reader.listenPause": "Pause",
    "reader.listenResume": "Resume",
    "reader.listenStop": "Stop",
    "reader.listenNext": "Next chapter",
    "reader.listenRate": "Speed",
    "reader.listenVoice": "Voice",
    "reader.listenAuto": "Automatic (female voice)",
    "reader.listenUnsupported": "This browser cannot read text aloud.",
    "community.eyebrow": "Your writing, everyone reading",
    "community.title": "Community books",
    "community.body":
      "Want your own book in this library? Write in any language — not just Bangla or English. Submit a folder, or send it straight to the API from an agent — it appears here as soon as it is approved.",
    "community.cta": "Submission guide",
    "community.author": "Author",
    "community.empty": "New community books are coming soon.",
    "community.readOnline": "Read online",
    "community.coverOnly": "Cover and details",
  },
};

const STORAGE_KEY = "bookkotha-language";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function readStoredLang(): Lang {
  if (typeof window === "undefined") return "bn";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "bn" || stored === "en") return stored;
  } catch {
    // Ignore storage access failures (private mode, disabled storage).
  }
  return "bn";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage access failures.
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: string) => translations[lang][key] ?? translations.bn[key] ?? key,
    }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}

// Locale-aware number formatting: Bangla digits for bn, grouped for en.
export function formatNumber(value: number, lang: Lang): string {
  return value.toLocaleString(lang === "bn" ? "bn-BD" : "en-US");
}
