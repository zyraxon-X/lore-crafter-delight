// Book URLs carry the book's name, not its number: /books/বৃষ্টির-পরে.
// Letters, digits and combining marks are kept — the marks matter for scripts
// like Bangla, where vowel signs are separate code points (বৃ is ব + ৃ). Every
// other run of characters collapses to a single hyphen.

export function slugify(input: string): string {
  const normalized = input.normalize("NFC").toLowerCase().trim();
  return normalized.replace(/[^\p{L}\p{N}\p{M}]+/gu, "-").replace(/^-+|-+$/g, "");
}

// The segment to put in the URL for a book. A community submission keeps the
// slug of its own folder; a bundled book derives it from its title. When a
// title has no usable characters at all we fall back to the numeric id so a
// link is always produced.
export function bookSlug(book: { id: number; title: string; slug?: string }): string {
  const fromTitle = slugify(book.title);
  if (book.slug) return book.slug;
  if (fromTitle) return fromTitle;
  return String(book.id);
}
