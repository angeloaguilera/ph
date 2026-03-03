// lib/readFileAsDataUrl.ts
export default function readFileAsDataUrl(file: File): Promise<string | null> {
  return new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => res(typeof fr.result === "string" ? fr.result : null);
    fr.onerror = () => res(null);
    fr.readAsDataURL(file);
  });
}
