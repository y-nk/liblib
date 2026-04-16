import type { Book } from "../types";
import { fetchCoverAsBase64 } from "./cover";

export async function getBookFromISBN(isbn: string): Promise<Book | undefined> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    const item = data.items?.[0]?.volumeInfo;
    if (!item?.title) return undefined;

    let cover = "";
    const coverUrl = item.imageLinks?.thumbnail || item.imageLinks?.smallThumbnail;
    if (coverUrl) {
      try {
        cover = await fetchCoverAsBase64(coverUrl.replace("http://", "https://"));
      } catch {}
    }

    return { isbn, title: item.title, cover, addedAt: Date.now() };
  } catch (e) {
    console.log("[google-books]", e);
    return undefined;
  }
}
