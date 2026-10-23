import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "./i18n/en.json";
import ms from "./i18n/ms.json";
import { translate } from "./i18n";

const keys = (o: object, prefix = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

describe("admin i18n", () => {
  it("BM and English have exactly the same keys", () => {
    expect(keys(en).sort()).toEqual(keys(ms).sort());
  });

  it("no empty strings", () => {
    for (const dict of [ms, en]) for (const k of keys(dict)) expect(translate(dict === ms ? "ms" : "en", k).trim()).not.toBe("");
  });

  it("translate fills placeholders and falls back to the key", () => {
    expect(translate("ms", "home.in", { duration: "2 jam 51 minit" })).toBe("dalam 2 jam 51 minit");
    expect(translate("en", "home.in", { duration: "2 h 51 min" })).toBe("in 2 h 51 min");
    expect(translate("en", "no.such.key")).toBe("no.such.key");
  });

  it("admin components contain no hard-coded UI text (everything goes through t())", () => {
    const files: string[] = [];
    const walk = (d: string) => readdirSync(d).forEach((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : n.endsWith(".tsx") && !n.endsWith(".test.tsx") && files.push(join(d, n))));
    walk(join(process.cwd(), "src", "admin"));
    walk(join(process.cwd(), "src", "app", "(ms)", "admin"));
    files.push(join(process.cwd(), "src", "app", "(ms)", "privasi", "page.tsx"));
    const allowedText = new Set(["G", "←"]);
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      // JSX text: after a tag's ">" (not "=>" or "->"), plain words only. Code (generics etc.)
      // contains ; ( ) = . quotes or brackets and is ignored.
      for (const m of src.matchAll(/(?<![=\-])>([^<>{}]*[A-Za-z][^<>{}]*)</g)) {
        const text = m[1].trim();
        if (text && !allowedText.has(text) && /^[^;(){}=."'`[\]]+$/.test(text)) offenders.push(`${f.split(/[\\/]src[\\/]/)[1]}: "${text}"`);
      }
      for (const m of src.matchAll(/(?:aria-label|placeholder|title)="([^"]*[A-Za-z][^"]*)"/g)) {
        if (m[1] !== "Logo Masjid View") offenders.push(`${f.split(/[\\/]src[\\/]/)[1]}: attribute "${m[1]}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});