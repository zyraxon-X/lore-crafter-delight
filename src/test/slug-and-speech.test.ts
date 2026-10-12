import { describe, expect, it } from "vitest";
import { bookSlug, slugify } from "../lib/book-slug";
import { findBookId } from "../lib/manuscripts";
import { toChunks } from "../lib/speech-text";
import { toLangCode, clampForGoogle, MAX_TRANSLATE_CHARS } from "../lib/tts";
import bookIndex from "../lib/book-index.json";

describe("book slugs", () => {
  it("keeps Unicode letters so Bangla titles survive", () => {
    expect(slugify("বৃষ্টির পরে")).toBe("বৃষ্টির-পরে");
    expect(slugify("نیشیر ڈاک")).toBe("نیشیر-ڈاک");
  });

  it("derives a name-slug from the title", () => {
    const first = bookIndex[0];
    expect(bookSlug(first)).toBe(slugify(first.title));
  });

  it("prefers a community folder slug when one is present", () => {
    expect(bookSlug({ id: -3, title: "কিছু", slug: "amar-boi" })).toBe("amar-boi");
  });

  it("resolves a title slug back to the numeric id", () => {
    const first = bookIndex[0];
    expect(findBookId(bookSlug(first))).toBe(first.id);
  });

  it("still accepts a plain numeric id", () => {
    expect(findBookId("6")).toBe(6);
    expect(findBookId("9999")).toBeUndefined();
  });
});

describe("chapter chunking for speech", () => {
  it("splits long sentences into separate engine-safe chunks", () => {
    const first = `${"ক".repeat(100)}।`;
    const second = `${"খ".repeat(100)}।`;
    const chunks = toChunks([`${first} ${second}`]);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toBe(first);
    expect(chunks[1]).toBe(second);
  });

  it("keeps the original words, only regrouping them", () => {
    const text = "এক দুই। Three four? পাঁচ ছয়!";
    const joined = toChunks([text]).join(" ").replace(/\s+/g, " ").trim();
    expect(joined).toBe(text);
  });

  it("never emits a chunk longer than the engine-safe limit", () => {
    const long = "শব্দ ".repeat(200);
    const chunks = toChunks([long]);
    expect(chunks.every((chunk) => chunk.length <= 170)).toBe(true);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("merges tiny fragments instead of flooding the queue", () => {
    expect(toChunks(["আ। বা।"])).toEqual(["আ। বা।"]);
  });
});

describe("Google TTS helpers", () => {
  it("maps a Bengali label to bn", () => {
    expect(toLangCode("বাংলা")).toBe("bn");
    expect(toLangCode("Bangla")).toBe("bn");
    expect(toLangCode(undefined)).toBe("bn");
  });

  it("normalises BCP-47 style codes", () => {
    expect(toLangCode("en")).toBe("en");
    expect(toLangCode("zh-cn")).toBe("zh-CN");
    expect(toLangCode("English")).toBe("en");
  });

  it("clamps text to Google's 200-character limit", () => {
    const long = "বাংলা ".repeat(120);
    const clamped = clampForGoogle(long);
    expect(clamped.length).toBeLessThanOrEqual(MAX_TRANSLATE_CHARS);
    expect(clamped.length).toBeLessThan(long.length);
  });

  it("leaves short text untouched", () => {
    expect(clampForGoogle("দুই লাইন।")).toBe("দুই লাইন।");
  });
});
