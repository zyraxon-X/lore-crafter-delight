export type Chapter = { title: string; paragraphs: string[] };

export type Book = {
  id: number;
  title: string;
  genre: string;
  subtitle: string;
  outline: string[];
  chapters: Chapter[];
  // URL segment for /books/<slug>; community books keep their folder name.
  slug?: string;
  author?: string;
  description?: string;
  coverUrl?: string;
  language?: string;
  // Direct download link for a submitted PDF or EPUB, when one exists.
  pdfUrl?: string;
  // Name of the submitted file the reader is showing; drives "open the PDF"
  // hints and keeps the original format visible.
  sourceFile?: string;
};

// One row of src/lib/book-index.json: everything the collection grid needs,
// without pulling any book's full text into the bundle.
export type BookSummary = Omit<Book, "chapters" | "outline"> & {
  chapterCount: number;
};
