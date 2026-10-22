// Image encoding shared by the Web Worker and the main-thread fallback (no libraries):
// long edge ≤ 1920 px for posters (≤ 800 px QR, ≤ 512 px photos), WebP quality 0.82. Browsers that cannot encode WebP (older Safari) return
// PNG from the canvas; a PNG photo can exceed the 2 MB storage limit, so JPEG is used instead.
import { LONG_EDGE, QUALITY, outputSize } from "./logic";

export const MAX_OUTPUT_BYTES = 2_000_000; // media bucket file_size_limit

export interface Encoded {
  blob: Blob;
  width: number;
  height: number;
  ext: "webp" | "jpg";
  originalWidth: number;
  originalHeight: number;
}

type ToBlob = (type: string, quality: number) => Promise<Blob | null>;

/** Draws the image at output size with `draw`, then encodes with `toBlob` (canvas or OffscreenCanvas). */
export async function encodeScaled(
  originalWidth: number,
  originalHeight: number,
  prepare: (w: number, h: number) => ToBlob,
  longEdge: number = LONG_EDGE,
): Promise<Encoded | null> {
  const { w, h } = outputSize(originalWidth, originalHeight, longEdge);
  const toBlob = prepare(w, h);
  for (const q of [QUALITY, 0.72, 0.6]) {
    let blob = await toBlob("image/webp", q);
    let ext: Encoded["ext"] = "webp";
    if (!blob || blob.type !== "image/webp") {
      blob = await toBlob("image/jpeg", q);
      ext = "jpg";
    }
    if (blob && blob.size <= MAX_OUTPUT_BYTES) return { blob, width: w, height: h, ext, originalWidth, originalHeight };
  }
  return null;
}