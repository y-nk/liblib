export type Book = {
  isbn: string;
  title: string;
  cover: string; // data:image/... base64
  addedAt: number;
};

export type ProviderId = "openLibrary" | "googleBooks" | "openai";

export type ProviderConfig = {
  id: ProviderId;
  enabled: boolean;
};

export type Settings = {
  apiKey: string;
  providers: ProviderConfig[];
};

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  { id: "openLibrary", enabled: true },
  { id: "googleBooks", enabled: true },
  { id: "openai", enabled: false },
];

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openLibrary: "Open Library",
  googleBooks: "Google Books",
  openai: "OpenAI (GPT-5)",
};
