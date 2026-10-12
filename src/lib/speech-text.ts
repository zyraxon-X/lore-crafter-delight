// Text helpers for read-aloud. Chrome's speech engine cuts off utterances that
// run longer than about fifteen seconds, so a chapter is split into short,
// sentence-sized chunks that are spoken back to back.

export const MAX_CHUNK = 170;
const SENTENCE_END = /[।॥.!?…]/u;

export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let buffer = "";
  for (const char of text) {
    buffer += char;
    if (SENTENCE_END.test(char)) {
      const trimmed = buffer.trim();
      if (trimmed) out.push(trimmed);
      buffer = "";
    }
  }
  const tail = buffer.trim();
  if (tail) out.push(tail);
  return out;
}

// Groups short sentences and splits over-long ones, so every utterance is small
// enough to survive the engine's cutoff while the words stay in order.
export function toChunks(paragraphs: string[]): string[] {
  const chunks: string[] = [];
  for (const paragraph of paragraphs) {
    for (const sentence of splitSentences(paragraph.trim())) {
      if (sentence.length <= MAX_CHUNK) {
        const last = chunks[chunks.length - 1];
        if (last && last.length + sentence.length + 1 <= MAX_CHUNK) {
          chunks[chunks.length - 1] = `${last} ${sentence}`;
        } else {
          chunks.push(sentence);
        }
        continue;
      }
      let rest = sentence;
      while (rest.length > MAX_CHUNK) {
        let cut = rest.lastIndexOf(" ", MAX_CHUNK);
        if (cut < MAX_CHUNK / 2) cut = MAX_CHUNK;
        chunks.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
      }
      if (rest) chunks.push(rest);
    }
  }
  return chunks;
}
