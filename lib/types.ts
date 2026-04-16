export type Book = {
  isbn: string;
  title: string;
  cover: string; // data:image/... base64
  addedAt: number;
};

export type ProviderId = "openLibrary" | "googleBooks" | "openai" | "gemini";

export type ProviderConfig = {
  id: ProviderId;
  enabled: boolean;
};

export type Settings = {
  openaiKey: string;
  geminiKey: string;
  providers: ProviderConfig[];
};

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  { id: "openLibrary", enabled: true },
  { id: "googleBooks", enabled: true },
  { id: "gemini", enabled: false },
  { id: "openai", enabled: false },
];

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openLibrary: "Open Library",
  googleBooks: "Google Books",
  gemini: "Gemini",
  openai: "OpenAI (GPT-5)",
};

export const PROVIDER_KEY_FIELD: Partial<Record<ProviderId, keyof Settings>> = {
  openai: "openaiKey",
  gemini: "geminiKey",
};
