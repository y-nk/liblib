import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Book, Settings } from "./types";
import { DEFAULT_PROVIDERS } from "./types";
import { getDb } from "./db";
import { deleteCover } from "./covers";

const SETTINGS_KEY = "liblib:settings";

type BookRow = {
  isbn: string;
  title: string;
  cover: string;
  createdAt: number;
  syncedAt: number | null;
  collectionId: string | null;
  metadata: string;
};

function rowToBook(row: BookRow): Book {
  const meta = row.metadata ? JSON.parse(row.metadata) : {};
  return {
    isbn: row.isbn,
    title: row.title,
    cover: row.cover,
    createdAt: new Date(row.createdAt),
    ...(row.syncedAt != null ? { syncedAt: new Date(row.syncedAt) } : {}),
    ...(row.collectionId != null ? { collectionId: row.collectionId } : {}),
    ...(meta.coverUrl ? { coverUrl: meta.coverUrl } : {}),
  };
}

export async function getBooks(): Promise<Book[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BookRow>(
    "SELECT isbn, title, cover, createdAt, syncedAt, collectionId, metadata FROM books ORDER BY createdAt DESC"
  );
  return rows.map(rowToBook);
}

export async function saveBooks(books: Book[]) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync("DELETE FROM books");
    for (const b of books) await insert(db, b);
  });
}

export async function addBook(book: Book) {
  const db = await getDb();
  await insert(db, book);
}

async function insert(db: Awaited<ReturnType<typeof getDb>>, book: Book) {
  const metadata = JSON.stringify(book.coverUrl ? { coverUrl: book.coverUrl } : {});
  await db.runAsync(
    "INSERT OR REPLACE INTO books (isbn, title, cover, createdAt, syncedAt, collectionId, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      book.isbn,
      book.title,
      book.cover ?? "",
      book.createdAt.getTime(),
      book.syncedAt ? book.syncedAt.getTime() : null,
      book.collectionId ?? null,
      metadata,
    ]
  );
}

export async function removeBook(isbn: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM books WHERE isbn = ?", [isbn]);
  deleteCover(isbn);
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
