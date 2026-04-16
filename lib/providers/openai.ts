import type { Book } from "../types";
import { getSettings } from "../storage";
import { fetchCoverAsBase64 } from "./cover";

export async function getBookFromISBN(isbn: string): Promise<Book | undefined> {
  try {
    const { apiKey } = await getSettings();
    if (!apiKey) {
      console.log("[openai] no API key configured");
      return undefined;
    }

    const prompt = `I have a book with ISBN ${isbn}. Search the web for this ISBN to find the exact book. Return ONLY a JSON object with "title" (string) and "cover" (URL to the book cover image). No markdown, no explanation, just the JSON object. If you can't find it, return {"title":"","cover":""}`;

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        tools: [{ type: "web_search_preview" }],
        input: prompt,
      }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const text = data.output?.find((o: any) => o.type === "message")?.content
      ?.find((c: any) => c.type === "output_text")?.text ?? "";

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
