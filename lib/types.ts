export type Book = {
  isbn: string;
  title: string;
  cover: string; // data:image/... base64
  addedAt: number;
};

export type Settings = {
  aiProvider: "openai" | "anthropic";
  apiKey: string;
  baseUrl: string;
  model: string;
};
