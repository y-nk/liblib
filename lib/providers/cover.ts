export async function fetchCoverAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) return "";
  const blob = await res.blob();
  if (blob.size < 1000) return "";
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(blob);
  });
}
