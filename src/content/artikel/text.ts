// The two inline marks article text may use (types.ts): **bold** and [label](href). Pure helpers shared
// by the renderer (src/landing/rich.tsx), JSON-LD, the RSS feed and the tests.

/** Matches **bold** (group 1) or [label](href) (groups 2, 3). */
export const MARKS = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** The text without marks: bold and link labels kept, URLs dropped. */
export const plain = (text: string) => text.replace(MARKS, (_m, b: string | undefined, label: string | undefined) => b ?? label ?? "");

/** Every link target in a text. */
export const links = (text: string) => [...text.matchAll(MARKS)].flatMap((m) => (m[3] ? [m[3]] : []));
