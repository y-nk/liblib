import type { Book } from "./types";
import { openLibrary, googleBooks, openai } from "./providers";

const freeProviders = [openLibrary, googleBooks];

export async function lookupISBN(isbn: string, useAI: boolean = false): Promise<Book | undefined> {
  for (const provider of freeProviders) {
    const result = await provider.getBookFromISBN(isbn);
    if (result) return result;
  }

  if (useAI) {
    const candidates = await openai.getCandidates(isbn);
    return candidates?.[0];
  }

  return undefined;
}

export async function lookupISBNCandidates(isbn: string): Promise<Book[] | undefined> {
  // try free providers first — if they hit, return single result as array
  for (const provider of freeProviders) {
    const result = await provider.getBookFromISBN(isbn);
    if (result) return [result];
  }

  return openai.getCandidates(isbn);
}
