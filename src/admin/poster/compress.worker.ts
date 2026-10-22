// Web Worker: decode + resize + encode a poster off the main thread (OffscreenCanvas).
import { encodeScaled } from "./encode";

const scope = self as unknown as { onmessage: ((e: MessageEvent<{ file: Blob; longEdge?: number }>) => void) | null; postMessage: (m: unknown) => void };

scope.onmessage = async (e) => {
  try {
    const bmp = await createImageBitmap(e.data.file, { imageOrientation: "from-image" });
    const result = await encodeScaled(bmp.width, bmp.height, (w, h) => {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bmp, 0, 0, w, h);
      return (type, quality) => canvas.convertToBlob({ type, quality });
    }, e.data.longEdge);
    bmp.close();
    scope.postMessage(result ? { ok: true, result } : { ok: false, error: "tooBig" });
  } catch (err) {
    scope.postMessage({ ok: false, error: "worker", message: String(err) });
  }
};