import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { validateSubmission, SubmissionError } from "@/lib/book-submission";
import { splitChapters, type CommunityBook } from "@/lib/community-parse";
import { loadCommunityBooks, rememberBook } from "@/lib/community-books.server";
import { findOnlineBook } from "@/lib/online-books.server";

// Search fallback: when a reader searches for a book the library lacks, this
// finds it online (Project Gutenberg / Open Library), commits meta.json +
// book.txt into pdf-library/<slug>/ on GitHub and returns the new book's slug.
const FOLDER = "pdf-library";
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

const Input = z.object({ query: z.string().trim().min(2).max(120) });

async function commitFiles(files: { path: string; content: string }[], title: string) {
  const token = process.env["GITHUB_TOKEN"];
  if (!token) return { committed: false, reason: "GitHub টোকেন নেই" };
  const owner = process.env["BOOKS_REPO_OWNER"] ?? "zyraxon-X";
  const repo = process.env["BOOKS_REPO_NAME"] ?? "lore-crafter-delight";
  const branch = process.env["BOOKS_REPO_BRANCH"] ?? "main";
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "lore-crafter-delight",
    "content-type": "application/json",
  };
  for (const file of files) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(file.path)}`;
    const current = await fetch(`${url}?ref=${branch}`, { headers });
    const sha = current.ok ? ((await current.json()) as { sha?: string }).sha : undefined;
    const bytes = new TextEncoder().encode(file.content);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    const write = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `অনলাইন থেকে বই যোগ: ${title}`,
        content: btoa(binary),
        branch,
        ...(sha ? { sha } : {}),
      }),
    });
    if (!write.ok) {
      console.warn("[fetch-book] commit failed", file.path, write.status);
      return { committed: false, reason: `GitHub-এ লেখা যায়নি (${write.status})` };
    }
  }
  return { committed: true, reason: "" };
}

export const Route = createFileRoute("/api/fetch-book")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Input.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) return json({ ok: false, error: "বইয়ের নাম লিখুন।" }, 400);
        const query = parsed.data.query;

        const online = await findOnlineBook(query);
        if (!online) return json({ ok: false, error: "অনলাইনেও এই বই পাওয়া যায়নি।" }, 404);

        const existing = (await loadCommunityBooks()).find(
          (book) => book.title.toLowerCase() === online.title.toLowerCase(),
        );
        if (existing) return json({ ok: true, slug: existing.slug, title: existing.title, committed: true });

        let submission;
        try {
          submission = validateSubmission({
            title: online.title,
            author: online.author,
            genre: online.genre,
            description: online.description,
            language: online.language,
            book: online.text,
            ...(online.coverUrl ? { coverUrl: online.coverUrl } : {}),
          });
        } catch (error) {
          if (error instanceof SubmissionError) return json({ ok: false, error: error.message }, 422);
          throw error;
        }

        const base = `${FOLDER}/${submission.slug}`;
        const meta = { ...submission.meta, source: online.sourceId };
        const files = [
          { path: `${base}/meta.json`, content: `${JSON.stringify(meta, null, 2)}\n` },
          { path: `${base}/book.txt`, content: `${submission.bookText}\n` },
          ...(submission.coverFile
            ? [{ path: `${base}/${submission.coverFile.name}`, content: submission.coverFile.content }]
            : []),
        ];

        const book: CommunityBook = {
          slug: submission.slug,
          title: online.title,
          author: online.author,
          genre: online.genre,
          description: online.description,
          language: online.language,
          coverUrl: online.coverUrl || `/api/community-file/${submission.slug}/cover.svg`,
          pdfUrl: "",
          hasText: true,
          sourceFile: "book.txt",
          chapters: splitChapters(submission.bookText),
        };
        rememberBook(book);

        const result = await commitFiles(files, online.title);
        return json({
          ok: true,
          slug: book.slug,
          title: book.title,
          author: book.author,
          committed: result.committed,
          note: result.reason,
        });
      },
    },
  },
});
