export type Book = {
  isbn: string;
  title: string;
  cover: string; // url
  addedAt: number;
};

export type Settings = {
  aiProvider: "openai" | "anthropic";
  apiKey: string;
};
