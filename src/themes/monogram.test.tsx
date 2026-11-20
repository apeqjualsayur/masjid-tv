// The round logo badge without a logo shows two letters, never the whole short name (it overflowed).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { monogram } from "@/core";
import { Logo as AlamLogo } from "./alam/parts";
import { Logo as SerambiLogo } from "./serambi/parts";
import { Logo as TenangLogo } from "./tenang/parts";

const masjid = { fullName: "Masjid Al-Hidayah Taman Harmoni", shortName: "Al-Hidayah" };
const text = (html: string) => html.replace(/<[^>]+>/g, "");

describe("logo monogram", () => {
  it("two letters from the short name (full name when it is empty)", () => {
    expect(monogram("Nur Muhammad")).toBe("NM");
    expect(monogram("Al-Hidayah")).toBe("AL");
    expect(monogram("", "Masjid Nur Muhammad")).toBe("NM");
    expect(monogram("  ", "Surau Al-Ikhlas")).toBe("AL");
    expect(monogram("")).toBe("");
  });

  it("serambi, tenang and alam badges show AL, not Al-Hidayah", () => {
    for (const html of [
      renderToStaticMarkup(<SerambiLogo masjid={masjid} size={56} />),
      renderToStaticMarkup(<TenangLogo masjid={masjid} size={56} color="#000" />),
      renderToStaticMarkup(<AlamLogo masjid={masjid} size={56} lite={false} />),
    ]) {
      expect(text(html)).toBe("AL");
    }
  });

  it("with a logo, the picture is shown", () => {
    expect(renderToStaticMarkup(<SerambiLogo masjid={{ ...masjid, logoUrl: "/x.png" }} size={56} />)).toContain('src="/x.png"');
  });
});
