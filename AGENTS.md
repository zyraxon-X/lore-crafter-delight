<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Keep fiction manuscripts as typed static content separate from library and reader routes, so writing can be extended without changing presentation.
- Use individual bundled cover illustrations in a shared BookCover component, so the collection and reading pages share each book's visual identity.
- Represent manuscript availability from actual chapter data rather than planned length, so unfinished books cannot appear complete.
- Read community submissions live from the `pdf-library/` folder in this repository at runtime (see `src/lib/community-books.server.ts`), instead of a build-time ingest, so published books appear without a redeploy. The older `books-submission/` folder is still read for backwards compatibility.
- Require a `meta.json` (or `metadata.json`/`book.json`) with at least `title` in every submission folder; author, genre and description fall back to values derived from the manuscript, but the title never does.
- Require a cover image too: a `cover.*`/`icon.*` file in the folder or a `cover_url` in meta.json. The API generates and commits a title-card `cover.svg` when a payload omits `coverUrl`, so every published book has a cover.
- The reader speaks a chapter with the browser's Web Speech API (`src/components/chapter-listener.tsx`): a Bangla voice is preferred, and when a chapter ends it auto-advances to the next one, so a whole book can be listened to hands-free.
- Regenerate manuscripts with `node tools/generate-manuscripts.mjs`; it rebuilds all 60 books from `tools/seed-books.json` (thirty seeds), the horror-romance block in the generator, and `tools/extra-books.mjs` (fifteen romance/social/comedy novels), writing one file per book under `src/content/books/` plus `src/lib/book-index.json`, so reruns are idempotent.
- Keep each chapter at roughly five thousand words (fifteen to twenty printed pages); the prose layers live in `tools/manuscript-sections.mjs` and `tools/manuscript-deep.mjs`, and `buildBook` accepts any number of chapters.
- Keep the root README in English and maintain one `README.<lang>.md` per language (forty: en, bn, hi, ur, ar, fa, tr, id, ms, th, vi, zh, ja, ko, ru, uk, de, fr, es, pt, it, nl, pl, sv, da, nb, fi, cs, el, he, ro, hu, sw, am, ha, yo, ta, te, mr, ne). The main README opens with a language gate listing all forty; each localized file teaches the same upload steps and ends with the same gate, so a reader in any language finds the guide.
- Accept submissions in any language and script; the reader renders whatever text a book contains and TTS speaks it with a matching browser voice when one exists.
- Keep `Book` and `BookSummary` types in `src/lib/book-types.ts` (re-exported from `books.ts`) so server loaders and components can share them without circular imports.
- Accept community submissions either as a `pdf-library/<slug>/` folder or via `POST /api/books` (`src/lib/book-submission.ts` validates both); the `auto-merge-submission.yml` workflow merges folder-only, meta-valid PRs automatically.
- Book URLs are name-based: `/books/<slug>` where the slug comes from `src/lib/book-slug.ts`. Bundled books derive it from their title (Unicode letters, digits and combining marks are kept, so Bangla paths like `/books/বৃষ্টির-পরে` work); community submissions use their folder slug. `findBookId` in `src/lib/manuscripts.ts` maps a segment back to a book and still accepts a plain numeric id.
- Read-aloud uses Google, never the browser's speech engine and never an API-key service. `src/routes/api.tts.ts` proxies Google Translate's speech endpoint (the one that was tested and works without a key); it caps a request at 200 characters, trimmed by `clampForGoogle` in `src/lib/tts.ts`. `src/components/chapter-listener.tsx` fetches one 190-char chunk at a time as MP3 and plays it in turn, so long chapters stream. `toLangCode` maps a book's language label to a Google code.
- Route all interface copy through `src/lib/i18n.tsx` (`useLanguage().t`); book prose itself is never translated.
