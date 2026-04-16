import type { Book } from "../types";
import { getSettings } from "../storage";
import { fetchCoverAsBase64 } from "./cover";

export async function getBookFromISBN(isbn: string): Promise<Book | undefined> {
  const candidates = await getCandidates(isbn);
  return candidates?.[0];
}

export async function getCandidates(isbn: string): Promise<Book[] | undefined> {
  try {
    const { apiKey } = await getSettings();
    if (!apiKey) {
      console.log("[openai] no API key configured");
      return undefined;
    }

    const prompt = `I have a book with ISBN ${isbn}. Search the web for this ISBN to find the exact book.

If you find a confirmed match, return a JSON array with 1 object.
If you're not sure, return 2-4 best guesses as a JSON array.

Each object must have "title" (string) and "cover" (URL to the book cover image).
Every entry MUST have a cover image URL — skip entries without one.
No markdown, no explanation, just the JSON array.
If you can't find anything, return []`;

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5",
        tools: [{ type: "web_search_preview" }],
        input: prompt,
      }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const text = data.output?.find((o: any) => o.type === "message")?.content
      ?.find((c: any) => c.type === "output_text")?.text ?? "";

    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (!arrMatch) return undefined;
    const arr = JSON.parse(arrMatch[0]);
    if (!Array.isArray(arr) || arr.length === 0) return undefined;

    const books: Book[] = [];
    for (const item of arr) {
      if (!item.title || !item.cover) continue;
      let cover = "";
      try {
        cover = await fetchCoverAsBase64(item.cover);
      } catch {}
      if (!cover) continue;
      books.push({ isbn, title: item.title, cover, addedAt: Date.now() });
    }

    return books.length > 0 ? books : undefined;
  } catch (e) {
    console.log("[openai]", e);
    return undefined;
  }
}
