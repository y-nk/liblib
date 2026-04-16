import type { Settings } from "./types";

type BookResult = { title: string; cover: string } | null;

const DEFAULTS = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  anthropic: { baseUrl: "https://api.anthropic.com", model: "claude-sonnet-4-20250514" },
};

export async function lookupISBN(isbn: string, settings: Settings): Promise<BookResult> {
  if (!settings.apiKey) throw new Error("No API key configured. Go to Settings.");

  const prompt = `I have a book with ISBN ${isbn}. Return ONLY a JSON object with "title" (string) and "cover" (URL to the book cover image). No markdown, no explanation, just the JSON object. If you can't find it, return {"title":"","cover":""}`;

  const defaults = DEFAULTS[settings.aiProvider];
  const baseUrl = (settings.baseUrl || defaults.baseUrl).replace(/\/+$/, "");
  const model = settings.model || defaults.model;

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
    return parseResponse(data.content?.[0]?.text ?? "");
  }

  // openai-compatible
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${settings.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: 256 }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return parseResponse(data.choices?.[0]?.message?.content ?? "");

}

function parseResponse(text: string): BookResult {
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
