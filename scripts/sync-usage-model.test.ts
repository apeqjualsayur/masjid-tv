// The usage-digest Edge Function runs a copy of src/admin/usage/{model,types}.ts. Fails when the copy is stale.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HEADER, expected, sharedCopy } from "./sync-usage-model";

describe("supabase/functions/_shared usage model copy", () => {
  it("rewrites the types import for Deno and adds the header", () => {
    expect(sharedCopy('import type { A } from "./types";\n')).toBe(`${HEADER}\nimport type { A } from "./usage-types.ts";\n`);
  });

  for (const f of expected()) {
    it(`${f.path.replace(/\\/g, "/").split("/").slice(-1)[0]} is up to date (run npm run sync:usage-model)`, () => {
      expect(existsSync(f.path)).toBe(true);
      expect(readFileSync(f.path, "utf8")).toBe(f.text);
    });
  }
});
