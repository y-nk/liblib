import type { Book } from "./types";
import { openLibrary, googleBooks, openai } from "./providers";

const freeProviders = [openLibrary, googleBooks];

export async function lookupISBN(isbn: string, useAI: boolean = false): Promise<Book[]> {
  for (const provider of freeProviders) {
    const results = await provider.getBookFromISBN(isbn);
    if (results.length > 0) return results;
  }

  if (useAI) return openai.getBookFromISBN(isbn);

  return [];
}
