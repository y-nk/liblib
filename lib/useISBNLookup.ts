import { useState, useRef, useCallback } from "react";
import { addBook } from "@/lib/storage";
import { lookupISBN } from "@/lib/providers";
import { fetchCoverAsBase64 } from "@/lib/providers/cover";
import type { Book } from "@/lib/types";

export type LookupStatus = "idle" | "loading" | "picking" | "saving" | "success" | "error";

export function useISBNLookup(onDone?: () => void) {
  const [status, setStatus] = useState<LookupStatus>("idle");
  const [message, setMessage] = useState("");
  const [candidates, setCandidates] = useState<Book[]>([]);
  const lockRef = useRef(false);

  const search = useCallback(async (isbn: string) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setStatus("loading");
    setMessage("Looking up book...");
    setCandidates([]);
    try {
      const results = await lookupISBN(isbn);
      if (results.length === 0) {
        setStatus("error");
        setMessage("Could not find book info for this ISBN.");
        lockRef.current = false;
      } else if (results.length === 1) {
        await pick(results[0]);
      } else {
        setCandidates(results);
        setStatus("picking");
        setMessage("Multiple matches — pick the correct one:");
      }
    } catch (e: any) {
      setStatus("error");
      setMessage(e.message || "Lookup failed");
      lockRef.current = false;
    }
  }, []);

  const pick = useCallback(async (book: Book) => {
    setStatus("saving");
    setMessage(`Saving: ${book.title}`);

    let cover = book.cover;
    if (!cover && book.coverUrl) {
      try {
        cover = await fetchCoverAsBase64(book.coverUrl);
      } catch {}
    }

    const toSave = { ...book, cover, coverUrl: undefined };
    await addBook(toSave);
    setStatus("success");
    setCandidates([]);
    setMessage(`Added: ${book.title}`);
    onDone?.();
  }, [onDone]);

  const reset = useCallback(() => {
    setStatus("idle");
    setMessage("");
    setCandidates([]);
    lockRef.current = false;
  }, []);

  const isBusy = status === "loading" || status === "saving" || status === "success";

  return { status, message, candidates, isBusy, search, pick, reset };
}
