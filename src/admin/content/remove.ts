// "Padam": delete the slide, then its picture files (poster image, Infaq QR, speaker photo) unless
// another slide still uses them (a duplicate shares the file). For posters the database decides:
// media rows cannot be deleted while a slide points at them (foreign key), so a shared poster
// file is kept automatically. Order is unit-tested.
import type { TemplateBackend } from "../editor/save";
import type { ContentRow } from "./logic";

export interface RemoveBackend extends Pick<TemplateBackend, "deleteMedia" | "removeObject" | "isReferenced"> {
  deleteSlide(id: string): Promise<void>;
}

/** filesKept: a file that should have gone could not be deleted (shown as a warning, never an error). */
export async function removeSlide(b: RemoveBackend, r: ContentRow, imageKeys: readonly string[]): Promise<{ filesRemoved: number; filesKept: boolean }> {
  await b.deleteSlide(r.id);
  let filesRemoved = 0;
  let filesKept = false;
  const drop = async (path: string) => {
    try {
      await b.deleteMedia(path);
    } catch (e) {
      // 23503: another slide still uses this poster → keep it, that is correct.
      if ((e as { code?: string })?.code !== "23503") filesKept = true;
      return;
    }
    try {
      await b.removeObject(path);
      filesRemoved++;
    } catch {
      filesKept = true;
    }
  };
  if (r.type === "poster" && r.media?.path) await drop(r.media.path);
  for (const k of imageKeys) {
    const p = r.fields[k];
    if (typeof p !== "string" || !p || p.includes("://")) continue;
    if (await b.isReferenced(k, p, null).catch(() => true)) continue;
    await drop(p);
  }
  return { filesRemoved, filesKept };
}