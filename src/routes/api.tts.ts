import { createFileRoute } from "@tanstack/react-router";
import { clampForGoogle, toLangCode, type TtsGender, type TtsVoice } from "@/lib/tts";

// Google is the voice provider. Two Google systems are supported here:
//   * Google Cloud Text-to-Speech, used when a GOOGLE_TTS_API_KEY is configured.
//     It exposes the named Bengali voices (female bn-IN-Standard-A / বাংলা মেয়ে,
//     male bn-IN-Standard-B / বাংলা ছেলে, plus Wavenet) and every other language.
//   * Google Translate's speech endpoint, used otherwise. It is Google's own
//     server-side voice (not the browser's speechSynthesis) and its limit is 200
//     characters per request, so a long chapter is fetched in 190-char pieces.
//
// The browser never talks to Google directly; this route proxies the audio so
// there is no CORS problem and playback works the same on phones and laptops.

const cacheHeaders = (seconds: number) => ({
  "cache-control": `public, max-age=${seconds}, stale-while-revalidate=86400`,
});

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

function googleHeaders(): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
    Referer: "https://translate.google.com/",
  };
}

async function googleTranslateSpeech(
  text: string,
  lang: string,
  gender: TtsGender | undefined,
): Promise<Response> {
  const params = new URLSearchParams({
    ie: "UTF-8",
    q: clampForGoogle(text),
    tl: lang,
    client: "tw-ob",
    ttsspeed: "1",
  });
  const upstream = await fetch(`https://translate.google.com/translate_tts?${params}`, {
    headers: googleHeaders(),
  });
  if (!upstream.ok || !upstream.body) {
    return new Response("Google TTS unavailable", { status: 502 });
  }
  void gender; // Google Translate has a single voice per language.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "audio/mpeg",
      ...cacheHeaders(86400),
    },
  });
}

type CloudVoice = {
  name: string;
  ssmlGender: TtsGender;
  languageCodes: string[];
};

// Google Cloud voices for the requested language. The list is authoritative —
// this is what the voice picker shows after its first fetch.
export async function listCloudVoices(lang: string, apiKey: string): Promise<TtsVoice[]> {
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/voices?languageCode=${encodeURIComponent(lang)}`,
    { headers: { "x-goog-api-key": apiKey } },
  );
  if (!response.ok) return [];
  const data = (await response.json()) as { voices?: CloudVoice[] };
  return (data.voices ?? [])
    .map((voice) => ({
      id: `cloud:${voice.name}`,
      name: voice.name,
      gender: voice.ssmlGender,
      lang: voice.languageCodes?.[0] ?? lang,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function cloudSpeech(
  text: string,
  lang: string,
  voiceId: string | undefined,
  gender: TtsGender | undefined,
  apiKey: string,
): Promise<Response> {
  const name = voiceId?.startsWith("cloud:") ? voiceId.slice("cloud:".length) : undefined;
  const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: name ? { languageCode: lang, name } : { languageCode: lang, ssmlGender: gender },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1 },
    }),
  });
  if (!response.ok) return new Response("Google Cloud TTS failed", { status: 502 });
  const data = (await response.json()) as { audioContent?: string };
  if (!data.audioContent) return new Response("Google Cloud TTS empty", { status: 502 });
  const audio = Uint8Array.from(atob(data.audioContent), (char) => char.charCodeAt(0));
  return new Response(audio, {
    status: 200,
    headers: { "content-type": "audio/mpeg", ...cacheHeaders(3600) },
  });
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      // The read-aloud bar calls this once to learn which Google voices exist.
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const lang = toLangCode(url.searchParams.get("lang") ?? "bn");
        const apiKey = process.env["GOOGLE_TTS_API_KEY"];
        if (apiKey) {
          const voices = await listCloudVoices(lang, apiKey);
          if (voices.length > 0) return json({ provider: "cloud", lang, voices });
        }
        // Translate TTS serves one Google voice per language; offer it
        // explicitly so the picker is never empty.
        return json({
          provider: "translate",
          lang,
          voices: [
            {
              id: "",
              name: `গুগল কণ্ঠ (${lang})`,
              gender: "NEUTRAL" as TtsGender,
              lang,
            },
          ],
        });
      },

      POST: async ({ request }) => {
        let body: { text?: string; lang?: string; voice?: string; gender?: TtsGender };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return json({ ok: false, error: "JSON পড়া গেল না।" }, 400);
        }
        const text = (body.text ?? "").trim();
        if (!text) return json({ ok: false, error: "কোনো লেখা নেই।" }, 400);
        if (text.length > 1200) return json({ ok: false, error: "লেখা অনেক বড়।" }, 413);

        const lang = toLangCode(body.lang ?? "bn");
        const apiKey = process.env["GOOGLE_TTS_API_KEY"];
        if (apiKey) {
          return cloudSpeech(text, lang, body.voice, body.gender, apiKey);
        }
        return googleTranslateSpeech(text, lang, body.gender);
      },
    },
  },
});
