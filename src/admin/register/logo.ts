// Logo picked on the phone → WebP at most 512 px, compressed in the browser before upload.
import { fitWithin, type LogoFile } from "./logic";

export const LOGO_MAX_PX = 512;
const MAX_INPUT_BYTES = 20_000_000;
const MAX_OUTPUT_BYTES = 2_000_000; // media.bytes limit

export type LogoError = "type" | "tooBig" | "decode";

async function decode(file: Blob): Promise<{ img: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return { img: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      // fall through to <img> (older Safari)
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export async function compressLogo(file: File): Promise<{ ok: true; logo: LogoFile } | { ok: false; error: LogoError }> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return { ok: false, error: "type" };
  if (file.size > MAX_INPUT_BYTES) return { ok: false, error: "tooBig" };
  let src: Awaited<ReturnType<typeof decode>>;
  try {
    src = await decode(file);
  } catch {
    return { ok: false, error: "decode" };
  }
  try {
    const { width, height } = fitWithin(src.width, src.height, LOGO_MAX_PX);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, error: "decode" };
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src.img, 0, 0, width, height);
    for (const q of [0.85, 0.7, 0.5]) {
      const blob = await toBlob(canvas, "image/webp", q);
      if (!blob) break;
      // Browsers that cannot encode WebP return PNG instead; keep it with an honest extension.
      const ext = blob.type === "image/webp" ? "webp" : "png";
      if (blob.size <= MAX_OUTPUT_BYTES || ext === "png") {
        return blob.size <= MAX_OUTPUT_BYTES ? { ok: true, logo: { blob, width, height, ext } } : { ok: false, error: "tooBig" };
      }
    }
    return { ok: false, error: "decode" };
  } finally {
    src.close();
  }
}