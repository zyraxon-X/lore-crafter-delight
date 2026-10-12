import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Headphones, Pause, Play, SkipForward, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { toChunks } from "@/lib/speech-text";
import { toLangCode } from "@/lib/tts";

type Props = {
  chapterIndex: number;
  paragraphs: string[];
  autoPlay: boolean;
  hasNext: boolean;
  onEnded: () => void;
  onStop: () => void;
  // The book's own language, so Google is asked for the right voice.
  language?: string;
};

// Google reads every chunk. Each one is fetched as an MP3 from /api/tts and
// played in turn, so a whole chapter never has to be prepared up front.
export function ChapterListener({
  chapterIndex,
  paragraphs,
  autoPlay,
  hasNext,
  onEnded,
  onStop,
  language,
}: Props) {
  const { t } = useLanguage();
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState(1);
  const [progress, setProgress] = useState(0);

  const sessionRef = useRef(0);
  const chunkRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rateRef = useRef(rate);
  rateRef.current = rate;

  const lang = useMemo(() => toLangCode(language), [language]);
  const chunks = useMemo(() => toChunks(paragraphs), [paragraphs]);

  const halt = useCallback(() => {
    sessionRef.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }
    audioRef.current = null;
    setLoading(false);
  }, []);

  const stop = useCallback(
    (notify = true) => {
      halt();
      setSpeaking(false);
      setPaused(false);
      if (notify) onStop();
    },
    [halt, onStop],
  );

  const playChunk = useCallback(
    async (index: number, session: number) => {
      const text = chunks[index];
      if (text === undefined) {
        setSpeaking(false);
        onEnded();
        return;
      }
      chunkRef.current = index;
      setProgress(index + 1);
      setLoading(true);

      let blobUrl: string;
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text, lang }),
        });
        if (!response.ok) throw new Error(String(response.status));
        blobUrl = URL.createObjectURL(await response.blob());
      } catch {
        if (session === sessionRef.current) {
          setSpeaking(false);
          setLoading(false);
        }
        return;
      }

      if (session !== sessionRef.current) {
        URL.revokeObjectURL(blobUrl);
        return;
      }
      setLoading(false);

      const audio = new Audio(blobUrl);
      audio.playbackRate = rateRef.current;
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(blobUrl);
        if (session !== sessionRef.current) return;
        void playChunk(index + 1, session);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        if (session === sessionRef.current) setSpeaking(false);
      };
      try {
        await audio.play();
      } catch {
        if (session === sessionRef.current) setSpeaking(false);
      }
    },
    [chunks, lang, onEnded],
  );

  const speak = useCallback(
    (startChunk: number) => {
      halt();
      const session = (sessionRef.current += 1);
      setSpeaking(true);
      setPaused(false);
      void playChunk(Math.max(0, startChunk), session);
    },
    [halt, playChunk],
  );

  // Auto-advance: when the shown chapter changes while listening is on, the new
  // chapter is read from the top so chapters flow one into the next.
  useEffect(() => {
    if (!autoPlay) return;
    speak(0);
    return () => halt();
  }, [autoPlay, chapterIndex, speak, halt]);

  const playing = speaking && !paused;

  return (
    <div className="listen-bar">
      <div className="listen-left">
        <Headphones size={17} />
        <span className="listen-label">
          {loading
            ? t("reader.listenLoading")
            : playing
              ? t("reader.listenPlaying")
              : t("reader.listen")}
        </span>
      </div>
      <div className="listen-controls">
        <Button
          variant="ghost"
          size="icon"
          aria-label={playing ? t("reader.listenPause") : t("reader.listenResume")}
          onClick={() => {
            if (!speaking) {
              speak(chunkRef.current);
              return;
            }
            const audio = audioRef.current;
            if (!audio) return;
            if (paused) {
              void audio.play();
              setPaused(false);
            } else {
              audio.pause();
              setPaused(true);
            }
          }}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("reader.listenStop")}
          disabled={!speaking}
          onClick={() => stop()}
        >
          <Square />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("reader.listenNext")}
          disabled={!hasNext}
          onClick={() => {
            setSpeaking(false);
            onEnded();
          }}
        >
          <SkipForward />
        </Button>
        <label className="listen-rate">
          {t("reader.listenRate")}
          <input
            type="range"
            min={0.6}
            max={1.6}
            step={0.1}
            value={rate}
            onChange={(event) => {
              const next = Number(event.target.value);
              setRate(next);
              rateRef.current = next;
              if (audioRef.current) audioRef.current.playbackRate = next;
            }}
            aria-label={t("reader.listenRate")}
          />
        </label>
      </div>
      {playing && chunks.length > 0 && (
        <span className="listen-progress" aria-hidden="true">
          {Math.min(progress, chunks.length)}/{chunks.length}
        </span>
      )}
    </div>
  );
}
