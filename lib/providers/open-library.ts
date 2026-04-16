import type { Book } from "../types";
import { fetchCoverAsBase64 } from "./cover";

export async function getBookFromISBN(isbn: string): Promise<Book[]> {
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const entry = data[`ISBN:${isbn}`];
    if (!entry?.title) return [];

    let cover = "";
    try {
      cover = await fetchCoverAsBase64(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`);
    } catch {}

    return [{ isbn, title: entry.title, cover, addedAt: Date.now() }];
  } catch (e) {
    console.log("[open-library]", e);
    return [];
  }
}
