import { createFileRoute } from "@tanstack/react-router";
import { clampForGoogle, toLangCode } from "@/lib/tts";

// Google's Translate speech endpoint, proxied. This is the endpoint that was
// tested and works without any API key: Google synthesises the audio on its own
// servers (not the browser) and we stream the MP3 back. Getting it through our
// own origin avoids CORS and makes phones and laptops behave identically.
//
// The browser never talks to Google directly. A request is capped at 200
// characters by Google, so the reader asks for one 190-character piece at a
// time; see clampForGoogle in src/lib/tts.ts.

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { text?: string; lang?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return json({ ok: false, error: "JSON পড়া গেল না।" }, 400);
        }
        const text = (body.text ?? "").trim();
        if (!text) return json({ ok: false, error: "কোনো লেখা নেই।" }, 400);

        const params = new URLSearchParams({
          ie: "UTF-8",
          q: clampForGoogle(text),
          tl: toLangCode(body.lang),
          client: "tw-ob",
          ttsspeed: "1",
        });

        const upstream = await fetch(
          `https://translate.google.com/translate_tts?${params.toString()}`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
              Referer: "https://translate.google.com/",
            },
          },
        );
        if (!upstream.ok || !upstream.body) {
          return json({ ok: false, error: "গুগলের কণ্ঠ পাওয়া গেল না।" }, 502);
        }
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type": upstream.headers.get("content-type") ?? "audio/mpeg",
            "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      },
    },
  },
});
