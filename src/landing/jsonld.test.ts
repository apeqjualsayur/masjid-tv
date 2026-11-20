import { describe, expect, it } from "vitest";
import { jsonForScript } from "./jsonld";

describe("JSON-LD script", () => {
  it("text can never close the <script> tag", () => {
    expect(jsonForScript({ a: "</script><b>" })).not.toContain("<");
    expect(JSON.parse(jsonForScript({ a: "</script>" }))).toEqual({ a: "</script>" });
  });
});
