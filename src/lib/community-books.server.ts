import { createServerFn } from "@tanstack/react-start";
import {
  BOOK_FILE_CANDIDATES,
  COVER_CANDIDATES,
  META_FILE_CANDIDATES,
  deriveMeta,
  isTextFile,
  pickFirst,
  splitChapters,
  type CommunityBook,
} from "./community-parse";

// Reads submissions live from the pdf-library folder in the repository at
// request time, so a merged pull request shows up without a rebuild or deploy.
// Results are cached in memory so repeat visits do not hit the GitHub API.
const OWNER = process.env["BOOKS_REPO_OWNER"] ?? "zyraxon-X";
const REPO = process.env["BOOKS_REPO_NAME"] ?? "lore-crafter-delight";
const BRANCH = process.env["BOOKS_REPO_BRANCH"] ?? "main";
const FOLDER = "pdf-library";
const TTL_MS = 5 * 60 * 1000;
const MAX_FOLDERS = 120;

// Older submissions used a differently named folder; keep reading it too so
// nothing published under the previous path disappears from the library.
const LEGACY_FOLDER = "books-submission";

type GithubEntry = { name: string; type: "file" | "dir" };

type CacheEntry = { at: number; books: CommunityBook[] };

let cache: CacheEntry | undefined;

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "lore-crafter-delight",
  };
  const token = process.env["GITHUB_TOKEN"];
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function listFolder(path: string): Promise<GithubEntry[]> {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
  const response = await fetch(url, { headers: githubHeaders() });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`GitHub ${response.status} for ${path}`);
  const payload = (await response.json()) as GithubEntry[];
  return Array.isArray(payload) ? payload : [];
}

async function fetchTextFile(path: string): Promise<string> {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
  const response = await fetch(url, { headers: githubHeaders() });
  if (!response.ok) throw new Error(`GitHub ${response.status} for ${path}`);
  const payload = (await response.json()) as { content?: string };
  if (!payload.content) return "";
  return Buffer.from(payload.content, "base64").toString("utf8");
}

function readMeta(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function loadBook(
  folder: string,
  slug: string,
  files: string[],
): Promise<CommunityBook | undefined> {
  const base = `${folder}/${slug}`;
  // meta.json is mandatory. A folder without it is treated as not submitted,
  // so nothing half-described ever reaches the shelf. Title is required inside.
  const metaName = pickFirst(files, META_FILE_CANDIDATES);
  if (!metaName) return undefined;
  const meta = readMeta(await fetchTextFile(`${base}/${metaName}`));
  if (!String(meta["title"] ?? "").trim()) return undefined;

  // A cover image is compulsory too: either an in-folder cover.* / icon.* file
  // or a cover_url in meta.json. Without one the book stays off the shelf.
  const metaCover = String(meta["cover_url"] ?? meta["cover"] ?? "").trim();
  const coverFile = pickFirst(files, COVER_CANDIDATES);
  if (!metaCover && !coverFile) return undefined;

  const bookFile =
    pickFirst(files, BOOK_FILE_CANDIDATES) ??
    files.find((name) => isTextFile(name) || name.toLowerCase().endsWith(".pdf"));
  if (!bookFile) return undefined;

  const hasText = isTextFile(bookFile);
  const text = hasText ? await fetchTextFile(`${base}/${bookFile}`) : "";
  // Optional fields still fall back to values derived from the manuscript, but
  // the title always comes from meta.json now that it is required.
  const derived = deriveMeta(slug, meta, text);

  const coverUrl = metaCover || `/api/community-file/${slug}/${coverFile}`;

  const chapters = hasText ? splitChapters(text) : [];
  const pdfUrl = hasText ? "" : `/api/community-file/${slug}/${bookFile}`;

  return {
    slug,
    title: derived.title,
    author: derived.author,
    genre: derived.genre,
    description: derived.description,
    language: derived.language,
    coverUrl,
    pdfUrl,
    hasText,
    sourceFile: bookFile,
    chapters,
  };
}

async function collect(folder: string): Promise<CommunityBook[]> {
  const folders = (await listFolder(folder)).filter(
    (entry) => entry.type === "dir" && !entry.name.startsWith("."),
  );
  const books: CommunityBook[] = [];
  for (const entry of folders.slice(0, MAX_FOLDERS)) {
    const files = await listFolder(`${folder}/${entry.name}`);
    const book = await loadBook(
      folder,
      entry.name,
      files.map((file) => file.name),
    );
    if (book) books.push(book);
  }
  return books;
}

// Books fetched from online sources are kept here so they show up instantly,
// before GitHub's listing (and our cache) picks up the new commit.
const globalStore = globalThis as { __freshBooks?: Map<string, CommunityBook> };
const fresh = (globalStore.__freshBooks ??= new Map<string, CommunityBook>());

export function rememberBook(book: CommunityBook): void {
  fresh.set(book.slug, book);
}

export async function loadCommunityBooks(): Promise<CommunityBook[]> {
  const books = await loadFromGithub();
  const seen = new Set(books.map((book) => book.slug));
  return [...books, ...[...fresh.values()].filter((book) => !seen.has(book.slug))];
}

async function loadFromGithub(): Promise<CommunityBook[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.books;

  try {
    const [current, legacy] = await Promise.all([collect(FOLDER), collect(LEGACY_FOLDER)]);
    const seen = new Set(current.map((book) => book.slug));
    const books = [...current, ...legacy.filter((book) => !seen.has(book.slug))];
    books.sort((a, b) => a.title.localeCompare(b.title, "bn"));
    cache = { at: Date.now(), books };
    return books;
  } catch (error) {
    console.warn("[community] লাইভ তালিকা আনা যায়নি:", error);
    // Keep serving the last good snapshot if GitHub is momentarily unavailable.
    return cache?.books ?? [];
  }
}

export const fetchCommunityBooks = createServerFn({ method: "GET" }).handler(() =>
  loadCommunityBooks(),
);
