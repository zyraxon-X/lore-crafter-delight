import type { Book, BookSummary } from "./book-types";
import { bookSlug, slugify } from "./book-slug";

// The light index is safe to import anywhere; the per-book files below are
// loaded on demand, so the library grid never pulls in megabytes of prose.
import index from "./book-index.json";

const modules = import.meta.glob<{ default: Book }>("../content/books/*.json");

export const bookSummaries = index as BookSummary[];

export const bookCount = bookSummaries.length;

export async function loadBook(id: number): Promise<Book | undefined> {
  const key = `../content/books/${String(id).padStart(2, "0")}.json`;
  const load = modules[key];
  if (!load) return undefined;
  return (await load()).default;
}

// Resolve a URL segment to a bundled book. The numeric id still works, and so
// does the book's name-slug; both are looked up against the summary index.
export function findBookId(slugOrId: string): number | undefined {
  let decoded = slugOrId;
  try {
    decoded = decodeURIComponent(slugOrId);
  } catch {
    // A stray "%" is not a valid escape; fall back to the raw segment.
  }
  if (/^\d+$/.test(decoded)) {
    const id = Number(decoded);
    return bookSummaries.some((book) => book.id === id) ? id : undefined;
  }
  const wanted = slugify(decoded);
  const match = bookSummaries.find((book) => bookSlug(book) === wanted);
  return match?.id;
}

export function summaryFor(id: number): BookSummary | undefined {
  return bookSummaries.find((book) => book.id === id);
}
