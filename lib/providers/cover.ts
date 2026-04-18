const MAX_BASE64_LENGTH = 500_000;

export async function fetchCoverAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) return "";
  const blob = await res.blob();
  if (blob.size < 1000) return "";
  const dataUrl = await blobToDataUrl(blob);
  if (dataUrl.length > MAX_BASE64_LENGTH) return "";
  return dataUrl;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(blob);
  });
}
