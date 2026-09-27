import type { RawArticle } from "./types";

const GOOGLE_NEWS_RSS = "https://news.google.com/rss/search";

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "decision-layer-dashboard/0.1 (news ingest)" },
    });
  } finally {
    clearTimeout(timeout);
  }
}

/** Extract the first captured group of `re` from `xml`, or "". */
function pick(xml: string, re: RegExp): string {
  const m = xml.match(re);
  return m?.[1] ?? "";
}

function stripCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function decodeEntities(value: string): string {
  // `&amp;` first: Google News double-encodes descriptions (`&amp;nbsp;`), so the
  // named entities it hides must be decoded in the passes below.
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Remove HTML tags and collapse whitespace. */
function stripHtml(value: string): string {
  return decodeEntities(stripCdata(value))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseItems(xml: string, limit: number): RawArticle[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const out: RawArticle[] = [];

  for (const item of items) {
    if (out.length >= limit) break;

    const rawTitle = stripHtml(pick(item, /<title>([\s\S]*?)<\/title>/));
    const link = decodeEntities(stripCdata(pick(item, /<link>([\s\S]*?)<\/link>/))).trim();
    const guid = decodeEntities(stripCdata(pick(item, /<guid[^>]*>([\s\S]*?)<\/guid>/))).trim() || link;
    const pubDate = stripCdata(pick(item, /<pubDate>([\s\S]*?)<\/pubDate>/)).trim();
    const publisher = stripHtml(pick(item, /<source[^>]*>([\s\S]*?)<\/source>/)) || "Google News";
    const summary = stripHtml(pick(item, /<description>([\s\S]*?)<\/description>/));

    if (!rawTitle || !link) continue;

    // Google News titles are usually "Headline - Publisher"; drop the trailing source.
    const title = rawTitle.replace(new RegExp(`\\s*-\\s*${publisher}\\s*$`), "").trim() || rawTitle;

    const parsedDate = pubDate ? new Date(pubDate) : new Date();
    const publishedAt = Number.isNaN(parsedDate.getTime())
      ? new Date().toISOString()
      : parsedDate.toISOString();

    out.push({ title, link, guid, publishedAt, publisher, summary: summary || title });
  }

  return out;
}

/**
 * Fetches and parses a Google News RSS search feed for `query`.
 * Public, key-free source; returns up to `limit` recent articles.
 */
export async function fetchGoogleNews(query: string, limit = 8): Promise<RawArticle[]> {
  const url = `${GOOGLE_NEWS_RSS}?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetchWithTimeout(url, 12_000);
  if (!res.ok) {
    throw new Error(`Google News RSS failed (${res.status}) for "${query}"`);
  }
  const xml = await res.text();
  return parseItems(xml, limit);
}
