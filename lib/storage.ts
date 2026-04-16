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
  if (books.some((b) => b.isbn === book.isbn)) return false;
  books.unshift(book);
  await saveBooks(books);
  return true;
}

export async function removeBook(isbn: string) {
  const books = await getBooks();
  await saveBooks(books.filter((b) => b.isbn !== isbn));
}

export async function getSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return raw ? JSON.parse(raw) : { apiKey: "", providers: DEFAULT_PROVIDERS };
}

export async function saveSettings(settings: Settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
