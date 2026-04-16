import type { Book, Settings } from "../types";
import { getSettings } from "../storage";
import { fetchCoverAsBase64 } from "./cover";

const DEFAULTS = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  anthropic: { baseUrl: "https://api.anthropic.com", model: "claude-sonnet-4-20250514" },
};

export async function getBookFromISBN(isbn: string): Promise<Book | undefined> {
  try {
    const settings = await getSettings();
    if (!settings.apiKey) {
      console.log("[openai] no API key configured");
      return undefined;
    }

    const prompt = `I have a book with ISBN ${isbn}. Search the web for this ISBN to find the exact book. Return ONLY a JSON object with "title" (string) and "cover" (URL to the book cover image). No markdown, no explanation, just the JSON object. If you can't find it, return {"title":"","cover":""}`;

    const defaults = DEFAULTS[settings.aiProvider];
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
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${settings.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: 256 }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      text = data.choices?.[0]?.message?.content ?? "";
    }

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return undefined;
    const obj = JSON.parse(match[0]);
    if (!obj.title) return undefined;

    let cover = "";
    if (obj.cover) {
      try {
        cover = await fetchCoverAsBase64(obj.cover);
      } catch {}
    }

    return { isbn, title: obj.title, cover, addedAt: Date.now() };
  } catch (e) {
    console.log("[openai]", e);
    return undefined;
  }
}
