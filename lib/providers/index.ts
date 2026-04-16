import type { Book, ProviderId } from "../types";
import { getSettings } from "../storage";
import * as openLibrary from "./open-library";
import * as googleBooks from "./google-books";
import * as openai from "./openai";

export { openLibrary, googleBooks, openai };

const providerMap: Record<ProviderId, { getBookFromISBN: (isbn: string) => Promise<Book[]> }> = {
  openLibrary,
  googleBooks,
  openai,
};

export async function lookupISBN(isbn: string): Promise<Book[]> {
  const { providers } = await getSettings();

  for (const { id, enabled } of providers) {
    if (!enabled) continue;
    const results = await providerMap[id].getBookFromISBN(isbn);
    if (results.length > 0) return results;
  }

  return [];
}
