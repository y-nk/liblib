import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Book, Settings } from "./types";
import { DEFAULT_PROVIDERS } from "./types";

const BOOKS_KEY = "liblib:books";
const SETTINGS_KEY = "liblib:settings";

export async function getBooks(): Promise<Book[]> {
  const raw = await AsyncStorage.getItem(BOOKS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveBooks(books: Book[]) {
  await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}

export async function addBook(book: Book) {
  const books = await getBooks();
  const safeCover = book.cover && book.cover.length > 500_000 ? "" : book.cover;
  const safeBook = { ...book, cover: safeCover };
  const idx = books.findIndex((b) => b.isbn === book.isbn);
  if (idx >= 0) {
    books[idx] = { ...books[idx], title: safeBook.title || books[idx].title, cover: safeBook.cover || books[idx].cover };
  } else {
    books.unshift(safeBook);
  }
  await saveBooks(books);
}

export async function removeBook(isbn: string) {
  const books = await getBooks();
  await saveBooks(books.filter((b) => b.isbn !== isbn));
}

export async function getSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  const defaults: Settings = { openaiKey: "", geminiKey: "", providers: DEFAULT_PROVIDERS };
  if (!raw) return defaults;
  const parsed = JSON.parse(raw);
  return { ...defaults, ...parsed, providers: parsed.providers ?? defaults.providers };
}

export async function saveSettings(settings: Settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
