// Compress a picked poster: Web Worker with OffscreenCanvas when available (keeps the page
// responsive on phones), otherwise the same encoding on the main thread with a <canvas>.
import { encodeScaled, type Encoded } from "./encode";
import { LONG_EDGE } from "./logic";

export type CompressError = "decode" | "tooBig";
export type CompressResult = { ok: true; result: Encoded; worker: boolean } | { ok: false; error: CompressError };

function viaWorker(file: Blob, longEdge: number): Promise<CompressResult | null> {
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./compress.worker.ts", import.meta.url), { type: "module" });
    } catch {
      return resolve(null);
    }
    const done = (v: CompressResult | null) => {
      worker.terminate();
      resolve(v);
    };
    const timer = setTimeout(() => done(null), 60_000);
    worker.onmessage = (e: MessageEvent<{ ok: boolean; result?: Encoded; error?: string }>) => {
      clearTimeout(timer);
      const d = e.data;
      if (d.ok && d.result) done({ ok: true, result: d.result, worker: true });
      else if (d.error === "tooBig") done({ ok: false, error: "tooBig" });
      else done(null); // worker could not do it (e.g. no OffscreenCanvas 2d): try the main thread
    };
    worker.onerror = () => {
      clearTimeout(timer);
      done(null);
    };
    worker.postMessage({ file, longEdge });
  });
}

async function decodeMain(file: Blob): Promise<{ img: CanvasImageSource; w: number; h: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { img: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
    } catch {
      // older Safari: fall through to <img>
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
  return { img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

async function viaMainThread(file: Blob, longEdge: number): Promise<CompressResult> {
  let src: Awaited<ReturnType<typeof decodeMain>>;
  try {
    src = await decodeMain(file);
  } catch {
    return { ok: false, error: "decode" };
  }
  try {
    const result = await encodeScaled(src.w, src.h, (w, h) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(src.img, 0, 0, w, h);
      return (type, quality) => new Promise((r) => canvas.toBlob(r, type, quality));
    }, longEdge);
    return result ? { ok: true, result, worker: false } : { ok: false, error: "tooBig" };
  } catch {
    return { ok: false, error: "decode" };
  } finally {
    src.close();
  }
}

/** Poster: long edge ≤ 1920 px (PRD §6). */
export async function compressPoster(file: Blob): Promise<CompressResult> {
  return compressImage(file, LONG_EDGE);
}

/** Any picture with its own long-edge limit (template QR ≤ 800 px, speaker photo ≤ 512 px). */
export async function compressImage(file: Blob, longEdge: number): Promise<CompressResult> {
  return (await viaWorker(file, longEdge)) ?? viaMainThread(file, longEdge);
}