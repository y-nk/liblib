import type { Settings } from "./types";

type BookResult = { title: string; cover: string } | null;

// Pass 1: Open Library (free, no key needed, deterministic)
async function lookupOpenLibrary(isbn: string): Promise<BookResult> {
  const res = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`
  );
  if (!res.ok) return null;
  const data = await res.json();
  const entry = data[`ISBN:${isbn}`];
  if (!entry?.title) return null;

  let cover = "";
  const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
  try {
    cover = await fetchCoverAsBase64(coverUrl);
  } catch {}

  return { title: entry.title, cover };
}

// Pass 2: AI with web search (OpenAI Responses API) or plain chat
const AI_DEFAULTS = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  anthropic: { baseUrl: "https://api.anthropic.com", model: "claude-sonnet-4-20250514" },
};

async function lookupAI(isbn: string, settings: Settings): Promise<BookResult> {
  if (!settings.apiKey) throw new Error("No API key configured. Go to Settings.");

  const prompt = `I have a book with ISBN ${isbn}. Search the web for this ISBN to find the exact book. Return ONLY a JSON object with "title" (string) and "cover" (URL to the book cover image). No markdown, no explanation, just the JSON object. If you can't find it, return {"title":"","cover":""}`;

  const defaults = AI_DEFAULTS[settings.aiProvider];
  const baseUrl = (settings.baseUrl || defaults.baseUrl).replace(/\/+$/, "");
  const model = settings.model || defaults.model;

  let text = "";

  if (settings.aiProvider === "anthropic") {
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": settings.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model, max_tokens: 256, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    text = data.content?.[0]?.text ?? "";
  } else if (!settings.baseUrl && settings.aiProvider === "openai") {
    // Native OpenAI: use Responses API with web search
    const res = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${settings.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        tools: [{ type: "web_search_preview" }],
        input: prompt,
      }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    text = data.output?.find((o: any) => o.type === "message")?.content
      ?.find((c: any) => c.type === "output_text")?.text ?? "";
  } else {
    // OpenAI-compatible (LiteLLM, etc): plain chat completions
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${settings.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: 256 }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    text = data.choices?.[0]?.message?.content ?? "";
  }

  const result = parseJSON(text);
  if (!result) return null;

  // Convert cover URL to base64
  if (result.cover) {
    try {
      result.cover = await fetchCoverAsBase64(result.cover);
    } catch {
      result.cover = "";
    }
  }
  return result;
}

function parseJSON(text: string): { title: string; cover: string } | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const obj = JSON.parse(match[0]);
    if (!obj.title) return null;
    return { title: obj.title, cover: obj.cover || "" };
  } catch {
    return null;
  }
}

async function fetchCoverAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) return "";
  const blob = await res.blob();
  // 1x1 pixel placeholder returned by Open Library when no cover exists
  if (blob.size < 1000) return "";
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(blob);
  });
}

// Main entry: Open Library first, AI fallback
export async function lookupISBN(isbn: string, settings: Settings): Promise<BookResult> {
  const olResult = await lookupOpenLibrary(isbn);
  if (olResult) return olResult;

  return lookupAI(isbn, settings);
}
