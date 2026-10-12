import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Headphones, Pause, Play, SkipForward, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { toChunks } from "@/lib/speech-text";

type Props = {
  chapterIndex: number;
  paragraphs: string[];
  autoPlay: boolean;
  hasNext: boolean;
  onEnded: () => void;
  onStop: () => void;
  // The book's own language, when known, so the closest voice is preferred.
  language?: string;
};

// Words that usually mark a female voice in the engines that name them. The
// browser does not expose gender, so this is the best signal available.
const FEMALE_HINT =
  /\b(female|woman|girl|zira|susan|samantha|victoria|karen|moira|tessa|fiona|veena|lekha|heera|swara|kalpana|nabanita|tanishaa|priya|ria)\b/i;
const MALE_HINT = /\b(male|man|boy|david|mark|daniel|alex|fred|rishi|ravi|hemant)\b/i;

function langRoot(tag?: string): string {
  return (tag ?? "").toLowerCase().split(/[-_]/)[0];
}

function voiceScore(voice: SpeechSynthesisVoice, wantedRoot: string): number {
  let score = 0;
  if (wantedRoot && langRoot(voice.lang) === wantedRoot) score += 100;
  if (FEMALE_HINT.test(voice.name)) score += 50;
  if (MALE_HINT.test(voice.name)) score -= 40;
  if (voice.default) score += 5;
  if (voice.localService) score += 2;
  return score;
}

function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  wantedRoot: string,
  chosenURI: string | null,
): SpeechSynthesisVoice | undefined {
  if (chosenURI) {
    const chosen = voices.find((voice) => voice.voiceURI === chosenURI);
    if (chosen) return chosen;
  }
  if (voices.length === 0) return undefined;
  return [...voices].sort((a, b) => voiceScore(b, wantedRoot) - voiceScore(a, wantedRoot))[0];
}

export function ChapterListener({
  chapterIndex,
  paragraphs,
  autoPlay,
  hasNext,
  onEnded,
  onStop,
  language,
}: Props) {
  const { t, lang } = useLanguage();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [chosenURI, setChosenURI] = useState<string | null>(null);

  const sessionRef = useRef(0);
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  // Bangla books prefer a Bengali voice; other languages fall back to whatever
  // matches the book's language or the browser's own locale.
  const wantedRoot = useMemo(() => {
    const label = (language ?? "").toLowerCase();
    if (label.includes("bangla") || label.includes("bengali") || label.startsWith("bn")) {
      return "bn";
    }
    return langRoot(typeof navigator !== "undefined" ? navigator.language : "en");
  }, [language]);

  const chunks = useMemo(() => toChunks(paragraphs), [paragraphs]);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  // Voices load asynchronously (and later in Chrome), so keep refreshing them.
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener("voiceschanged", load);
    const timer = window.setInterval(load, 1000);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      window.clearInterval(timer);
    };
  }, [supported]);

  // Chrome silently pauses long speech; nudging resume keeps it alive. A no-op
  // resume is harmless, and it is skipped while the reader paused on purpose.
  useEffect(() => {
    if (!speaking) return;
    const synth = window.speechSynthesis;
    const id = window.setInterval(() => {
      if (!pausedRef.current && synth.speaking) synth.resume();
    }, 5000);
    return () => window.clearInterval(id);
  }, [speaking]);

  const stop = useCallback(
    (notify = true) => {
      sessionRef.current += 1;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setSpeaking(false);
      setPaused(false);
      if (notify) onStop();
    },
    [onStop],
  );

  const speak = useCallback(
    (startChunk: number) => {
      if (!supported) return;
      const synth = window.speechSynthesis;
      synth.cancel();

      const session = (sessionRef.current += 1);
      const selected = pickBestVoice(synth.getVoices(), wantedRoot, chosenURI);
      const from = Math.max(0, startChunk);
      const queue = chunks.slice(from);
      setCurrentChunk(from);
      setSpeaking(true);
      setPaused(false);

      queue.forEach((text, i) => {
        const utterance = new SpeechSynthesisUtterance(text);
        if (selected) utterance.voice = selected;
        utterance.lang = selected?.lang ?? (wantedRoot === "bn" ? "bn-BD" : navigator.language);
        utterance.rate = rateRef.current;
        utterance.pitch = 1.02;
        utterance.onstart = () => {
          if (session === sessionRef.current) setCurrentChunk(from + i);
        };
        utterance.onend = () => {
          if (session !== sessionRef.current) return;
          if (i === queue.length - 1) {
            setSpeaking(false);
            onEnded();
          }
        };
        utterance.onerror = () => {
          if (session === sessionRef.current) setSpeaking(false);
        };
        synth.speak(utterance);
      });
    },
    [supported, chunks, wantedRoot, chosenURI, onEnded],
  );

  // Auto-advance: whenever the shown chapter changes while listening is on, the
  // new chapter is read from the top, so chapters flow one into the next.
  useEffect(() => {
    if (!supported || !autoPlay) return;
    speak(0);
    return () => {
      sessionRef.current += 1;
      window.speechSynthesis.cancel();
    };
  }, [supported, autoPlay, chapterIndex, speak]);

  if (!supported) {
    return (
      <div className="listen-bar listen-unsupported">
        <Headphones size={16} /> {t("reader.listenUnsupported")}
      </div>
    );
  }

  const playing = speaking && !paused;

  return (
    <div className="listen-bar">
      <div className="listen-left">
        <Headphones size={17} />
        <span className="listen-label">
          {playing ? t("reader.listenPlaying") : t("reader.listen")}
        </span>
      </div>
      <div className="listen-controls">
        <Button
          variant="ghost"
          size="icon"
          aria-label={playing ? t("reader.listenPause") : t("reader.listenResume")}
          onClick={() => {
            const synth = window.speechSynthesis;
            if (!speaking) {
              speak(currentChunk);
              return;
            }
            if (paused) {
              synth.resume();
              setPaused(false);
            } else {
              synth.pause();
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
              if (speaking) speak(currentChunk);
            }}
            aria-label={t("reader.listenRate")}
          />
        </label>
        {voices.length > 0 && (
          <select
            className="listen-voice"
            aria-label={t("reader.listenVoice")}
            value={chosenURI ?? ""}
            onChange={(event) => {
              const uri = event.target.value || null;
              setChosenURI(uri);
              if (speaking) speak(currentChunk);
            }}
          >
            <option value="">{t("reader.listenAuto")}</option>
            {voices.map((option) => (
              <option key={option.voiceURI} value={option.voiceURI}>
                {option.name} ({option.lang})
              </option>
            ))}
          </select>
        )}
      </div>
      {playing && chunks.length > 0 && (
        <span className="listen-progress" aria-hidden="true">
          {Math.min(currentChunk + 1, chunks.length)}/{chunks.length}
        </span>
      )}
    </div>
  );
}
