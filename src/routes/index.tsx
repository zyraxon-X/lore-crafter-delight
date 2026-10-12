import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Bookmark, Check, Search, Sparkles, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/components/book-cover";
import { LibraryHeader } from "@/components/library-header";
import { genres, type BookSummary } from "@/lib/books";
import { formatNumber, useLanguage } from "@/lib/i18n";
import { toBookSummary } from "@/lib/community-to-book";
import { fetchCommunityBooks } from "@/lib/community-books.server";
import { bookSummaries } from "@/lib/manuscripts";
import { bookSlug } from "@/lib/book-slug";

export const Route = createFileRoute("/")({
  loader: async () => ({ community: await fetchCommunityBooks() }),
  head: () => ({
    meta: [
      { title: "বইকথা — গল্পের নতুন জগৎ" },
      {
        name: "description",
        content: "ভূত, প্রেম, রহস্য ও কল্পনার স্বতন্ত্র অধ্যায়ভিত্তিক উপন্যাসের সংগ্রহ।",
      },
      { property: "og:title", content: "বইকথা — গল্পের ভেতর, নিজের মতো" },
      {
        property: "og:description",
        content: "স্বতন্ত্র প্রচ্ছদ ও নিজস্ব আবহে বাংলা উপন্যাস পড়ুন।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { community } = Route.useLoaderData();
  const { lang, t } = useLanguage();
  const [genre, setGenre] = useState("all");
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState<number[]>([]);
  const [view, setView] = useState("collection");

  const communityBooks = useMemo(
    () => community.map((entry, index) => toBookSummary(entry, index)),
    [community],
  );
  const books = useMemo<BookSummary[]>(
    () => [...bookSummaries, ...communityBooks],
    [communityBooks],
  );

  const visible = books.filter(
    (book) =>
      (genre === "all" || book.genre === genre) &&
      (view !== "saved" || saved.includes(book.id)) &&
      `${book.title} ${book.subtitle} ${book.genre} ${book.author ?? ""}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

  const featured = [books[5], books[0], books[15]].filter((book): book is BookSummary =>
    Boolean(book),
  );
  const genreTabs = ["all", ...genres];

  return (
    <>
      <LibraryHeader />
      <main>
        <section className="intro-band">
          <div className="ambient ambient-one" aria-hidden="true" />
          <div className="ambient ambient-two" aria-hidden="true" />
          <div className="page-width intro-inner">
            <div className="intro-copy">
              <div className="eyebrow">
                <span className="small-line" /> {t("intro.eyebrow")}
              </div>
              <h1>
                বইকথা<span className="intro-title-sub">{t("intro.titleSub")}</span>
              </h1>
              <p>{t("intro.body")}</p>
              <Button
                className="explore-button"
                onClick={() =>
                  document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                {t("intro.cta")} <ArrowRight />
              </Button>
              <div className="intro-facts">
                <span>
                  <BookOpen size={15} /> {formatNumber(books.length, lang)}
                  {t("intro.books")}
                </span>
                <span className="fact-dot">·</span>
                <span>
                  {formatNumber(genres.length, lang)}
                  {t("intro.worlds")}
                </span>
                <span className="fact-dot">·</span>
                <span>{t("intro.lang")}</span>
              </div>
            </div>
            <div className="featured-books" aria-label="নির্বাচিত বইয়ের প্রচ্ছদ">
              {featured.map((book, i) => (
                <Link
                  key={book.id}
                  to="/books/$bookId"
                  params={{ bookId: bookSlug(book) }}
                  className={`featured-book featured-${i}`}
                >
                  <BookCover book={book} priority />
                </Link>
              ))}
              <div className="featured-caption">
                <Sparkles size={14} /> {t("featured.caption")}
              </div>
            </div>
          </div>
        </section>

        {communityBooks.length > 0 && (
          <section className="page-width community-section">
            <div className="community-head">
              <div>
                <div className="eyebrow section-eyebrow">{t("community.eyebrow")}</div>
                <h2>
                  {t("community.title")} <span>{formatNumber(communityBooks.length, lang)}</span>
                </h2>
              </div>
              <p>{t("community.body")}</p>
            </div>
            <div className="community-grid">
              {communityBooks.slice(0, 8).map((book) => (
                <article className="community-card" key={book.id}>
                  <div className="community-art">
                    <Link to="/books/$bookId" params={{ bookId: bookSlug(book) }}>
                      <BookCover book={book} />
                    </Link>
                  </div>
                  <span className="genre-label">{book.genre}</span>
                  <Link
                    to="/books/$bookId"
                    params={{ bookId: bookSlug(book) }}
                    className="book-title"
                  >
                    {book.title}
                  </Link>
                  <p className="community-author">
                    {t("community.author")}: {book.author}
                  </p>
                  <p className="community-desc">{book.description}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section id="collection" className="page-width collection-section">
          <div className="collection-heading">
            <div>
              <div className="eyebrow section-eyebrow">{t("collection.eyebrow")}</div>
              <h2>
                {t("collection.title")} <span>{formatNumber(books.length, lang)}</span>
              </h2>
            </div>
            <div className="collection-views">
              <Button
                variant="ghost"
                className={view === "collection" ? "view-active" : ""}
                onClick={() => setView("collection")}
              >
                <BookOpen /> {t("collection.all")}
              </Button>
              <Button
                variant="ghost"
                className={view === "saved" ? "view-active" : ""}
                onClick={() => setView("saved")}
              >
                <Bookmark /> {t("collection.saved")}{" "}
                {saved.length > 0 && <span>{formatNumber(saved.length, lang)}</span>}
              </Button>
            </div>
          </div>
          <div className="filter-row">
            <div className="genre-tabs">
              {genreTabs.map((item) => (
                <Button
                  key={item}
                  variant="ghost"
                  aria-pressed={genre === item}
                  className={genre === item ? "genre-tab active" : "genre-tab"}
                  onClick={() => setGenre(item)}
                >
                  {item === "all" ? t("collection.allGenres") : item}
                </Button>
              ))}
            </div>
            <div className="search-box">
              <Search size={17} />
              <input
                aria-label={t("collection.search")}
                placeholder={t("collection.search")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("collection.searchClear")}
                  onClick={() => setSearch("")}
                >
                  <X />
                </Button>
              )}
            </div>
          </div>
          <div className="collection-summary">
            <span>
              {genre === "all" ? t("collection.allGenres") : genre}{" "}
              <span className="summary-dot">/</span> {formatNumber(visible.length, lang)}
              {t("collection.count")}
            </span>
            <span>
              {t("collection.status")} <span className="status-dot" />
            </span>
          </div>
          <div className="books-grid">
            {visible.map((book) => (
              <article className="book-item" key={book.id}>
                <div className="book-art">
                  <Link
                    to="/books/$bookId"
                    params={{ bookId: bookSlug(book) }}
                    aria-label={`${book.title} ${t("collection.read")}`}
                  >
                    <BookCover book={book} />
                  </Link>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="save-button"
                    aria-label={`${book.title} ${
                      saved.includes(book.id) ? t("collection.unsave") : t("collection.save")
                    }`}
                    title={t("collection.saved")}
                    onClick={() =>
                      setSaved((current) =>
                        current.includes(book.id)
                          ? current.filter((id) => id !== book.id)
                          : [...current, book.id],
                      )
                    }
                  >
                    {saved.includes(book.id) ? <Check /> : <Bookmark />}
                  </Button>
                </div>
                <div className="book-meta">
                  <span className="genre-label">{book.genre}</span>
                  <span>{book.author ?? t("collection.novel")}</span>
                </div>
                <Link
                  to="/books/$bookId"
                  params={{ bookId: bookSlug(book) }}
                  className="book-title"
                >
                  {book.title}
                </Link>
                <p className="book-subtitle">{book.subtitle}</p>
                <div className="book-bottom">
                  <span>
                    {formatNumber(book.chapterCount, lang)}
                    {t("collection.chapters")}
                  </span>
                  <Link
                    to="/books/$bookId"
                    params={{ bookId: bookSlug(book) }}
                    aria-label={`${book.title} ${t("collection.read")}`}
                  >
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {!visible.length && (
            <div className="empty-library">
              <BookOpen size={36} />
              <h3>
                {view === "saved" ? t("collection.empty.saved") : t("collection.empty.search")}
              </h3>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setGenre("all");
                  setView("collection");
                }}
              >
                {t("collection.empty.cta")} <ArrowRight />
              </Button>
            </div>
          )}
        </section>

        <section className="page-width contribute-section">
          <div className="contribute-card">
            <Users size={26} />
            <div>
              <h3>{t("community.title")}</h3>
              <p>{t("community.body")}</p>
            </div>
            <a
              className="contribute-link"
              href="https://github.com/ZYRAXON-AI/lore-crafter-delight/tree/main/pdf-library"
              target="_blank"
              rel="noreferrer"
            >
              {t("community.cta")} <ArrowRight size={16} />
            </a>
          </div>
        </section>
      </main>
      <footer className="page-width library-footer">
        <span className="footer-brand">বইকথা.</span>
        <span>{t("footer.note")}</span>
        <span>{t("footer.tag")}</span>
      </footer>
    </>
  );
}
