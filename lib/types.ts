export type Book = {
  isbn: string;
  title: string;
  cover: string; // data:image/... base64
  addedAt: number;
};

export type Settings = {
  apiKey: string;
  model: string;
};
