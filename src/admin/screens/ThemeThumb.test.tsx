// Thumbnails are real theme renders, but only once visible (IntersectionObserver runs after mount):
// the first render is just the frame, so a page full of thumbnails costs nothing up front.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeThumb } from "./ThemeThumb";

describe("ThemeThumb", () => {
  it("renders only the 16:9 frame until it is on screen", () => {
    const out = renderToStaticMarkup(<ThemeThumb theme="kerawang" layout="poster" width={112} />);
    expect(out).toContain('data-thumb="kerawang-poster"');
    expect(out).toContain("width:112px;height:63px");
    expect(out).not.toContain("width:1920px");
  });
});
