import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Minus,
  Plus,
  List,
  X,
  Check,
  LockKeyhole,
  FileText,
  Printer,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/components/book-cover";
import { ChapterListener } from "@/components/chapter-listener";
import { LibraryHeader } from "@/components/library-header";
import { genreClass, type Book } from "@/lib/books";
import { formatNumber, useLanguage } from "@/lib/i18n";
import { downloadHtml, downloadTxt, printBook } from "@/lib/export-book";
import { toLibraryBook } from "@/lib/community-to-book";
import { fetchCommunityBooks } from "@/lib/community-books.server";
import { findBookId, loadBook } from "@/lib/manuscripts";

export const Route = createFileRoute("/books/$bookId")({
  loader: async ({ params }) => {
    const segment = decodeURIComponent(params.bookId);
    const id = findBookId(segment);

    let book: Book | undefined;
    if (id !== undefined) {
      book = await loadBook(id);
    } else {
      // Community books live in the repo, not the bundle, so their slug is
      // matched against the live submission list.
      const community = await fetchCommunityBooks();
      const entry = community.find((item) => item.slug === segment);
      if (entry) book = toLibraryBook(entry, community.indexOf(entry));
    }
    if (!book) throw notFound();
    return book;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "উপন্যাস"} — বইকথা` },
      { name: "description", content: loaderData?.subtitle ?? "বইকথার বাংলা উপন্যাস" },
      { property: "og:title", content: `${loaderData?.title ?? "উপন্যাস"} — বইকথা` },
      {
        property: "og:description",
        content: loaderData?.subtitle ?? "বাংলা উপন্যাসের অধ্যায় পড়ুন।",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reader,
});

function Reader() {
  const book = Route.useLoaderData();
  const { lang, t } = useLanguage();
  const [chapterIndex, setChapterIndex] = useState(0);
  const [fontSize, setFontSize] = useState(1);
  const [showContents, setShowContents] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [listen, setListen] = useState(false);

  const chapter = book.chapters[chapterIndex];
  const hasNext = chapterIndex < book.chapters.length - 1;
  const goToChapter = (index: number) => {
    setChapterIndex(index);
    setFinished(false);
  };
  if (!chapter) {
    return (
      <div className={`reader-page ${genreClass(book.genre)}`}>
        <LibraryHeader />
        <div className="page-width reader-toolbar">
          <Button asChild variant="ghost">
            <Link to="/">
              <ArrowLeft /> {t("reader.back")}
            </Link>
          </Button>
        </div>
        <div className="page-width reading-sheet">
          <h1>{book.title}</h1>
          <p className="reader-subtitle">{book.subtitle}</p>
          {book.pdfUrl ? (
            <p className="manuscript-note">
              <a href={book.pdfUrl} target="_blank" rel="noreferrer">
                <FileText size={16} /> {book.sourceFile ?? "PDF"} {t("reader.openFile")}
              </a>
            </p>
          ) : (
            <p className="manuscript-note">{t("community.coverOnly")}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`reader-page ${genreClass(book.genre)}`}>
      <LibraryHeader />
      <div className="page-width reader-toolbar">
        <Button asChild variant="ghost">
          <Link to="/">
            <ArrowLeft /> {t("reader.back")}
          </Link>
        </Button>
        <div className="reader-actions">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("reader.smaller")}
            disabled={fontSize === 0}
            onClick={() => setFontSize((size) => Math.max(0, size - 1))}
          >
            <Minus />
          </Button>
          <span>অ আ</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("reader.larger")}
            disabled={fontSize === 2}
            onClick={() => setFontSize((size) => Math.min(2, size + 1))}
          >
            <Plus />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={t("reader.export")}
            aria-label={t("reader.export")}
            onClick={() => setShowExport((value) => !value)}
          >
            <Download />
          </Button>
          <Button
            variant={listen ? "secondary" : "outline"}
            onClick={() => setListen((value) => !value)}
            aria-pressed={listen}
          >
            <Headphones /> {t("reader.listen")}
          </Button>
          <Button variant="outline" onClick={() => setShowContents((value) => !value)}>
            {showContents ? <X /> : <List />} {t("reader.contents")}
          </Button>
        </div>
      </div>

      {showExport && (
        <div className="page-width export-bar">
          <Button variant="outline" onClick={() => downloadTxt(book)}>
            <FileText /> TXT
          </Button>
          <Button variant="outline" onClick={() => downloadHtml(book)}>
            <FileText /> HTML
          </Button>
          <Button variant="outline" onClick={() => printBook(book)}>
            <Printer /> PDF
          </Button>
        </div>
      )}

      {listen && (
        <div className="page-width">
          <ChapterListener
            chapterIndex={chapterIndex}
            paragraphs={chapter.paragraphs}
            autoPlay={listen}
            hasNext={hasNext}
            onEnded={() => {
              if (hasNext) goToChapter(chapterIndex + 1);
              else setListen(false);
            }}
            onStop={() => setListen(false)}
            language={book.language}
          />
        </div>
      )}

      <div className="reader-layout page-width">
        <aside className={`reader-sidebar ${showContents ? "contents-open" : ""}`}>
          <div className="reader-mini-cover">
            <BookCover book={book} />
          </div>
          <h2>{book.title}</h2>
          {book.author && <p className="reader-author">{book.author}</p>}
          <p className="reader-status">
            {formatNumber(book.chapters.length, lang)}
            {t("collection.chapters")}
          </p>
          <h3 className="contents-heading">{t("reader.chapterPlan")}</h3>
          <nav aria-label={t("reader.contents")}>
            {book.chapters.map((item, i) => (
              <Button
                key={`${item.title}-${i}`}
                variant="ghost"
                className={i === chapterIndex ? "chapter-link selected" : "chapter-link"}
                onClick={() => {
                  goToChapter(i);
                  setShowContents(false);
                }}
              >
                <span>{formatNumber(i + 1, lang).padStart(2, "০")}</span>
                <span>{item.title}</span>
                {i >= book.chapters.length && <LockKeyhole size={12} />}
              </Button>
            ))}
          </nav>
        </aside>

        <article className={`reading-sheet reading-size-${fontSize}`}>
          <div className="reader-kicker">
            বইকথা <span> / </span> {book.genre}
          </div>
          <h1>{book.title}</h1>
          <p className="reader-subtitle">{book.subtitle}</p>
          <div className="chapter-ornament">
            <span />✦<span />
          </div>
          <div className="chapter-number">
            {t("reader.chapter")} {formatNumber(chapterIndex + 1, lang)}
          </div>
          <h2>{chapter.title}</h2>
          <div className="chapter-prose" key={chapterIndex}>
            {chapter.paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          <div className="chapter-ornament end-ornament">
            <span />✦<span />
          </div>
          <div className="reading-end">
            <span>{t("reader.chapterEnd")}</span>
            <div className="reading-end-actions">
              {hasNext && (
                <Button variant="outline" onClick={() => goToChapter(chapterIndex + 1)}>
                  {t("reader.nextChapter")} <ArrowRight />
                </Button>
              )}
              <Button
                variant={finished ? "secondary" : "outline"}
                onClick={() => setFinished((value) => !value)}
              >
                {finished ? <Check /> : <ArrowRight />}
                {finished ? t("reader.finished") : t("reader.markRead")}
              </Button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
