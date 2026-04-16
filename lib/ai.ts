import type { Book } from "./types";
import { openLibrary, googleBooks, openai } from "./providers";

const providers = [openLibrary, googleBooks, openai];

export async function lookupISBN(isbn: string): Promise<Book | undefined> {
  for (const provider of providers) {
    const result = await provider.getBookFromISBN(isbn);
    if (result) return result;
  }
  return undefined;
}
