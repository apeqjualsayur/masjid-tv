// Inline marks in article text (src/content/artikel/types.ts): **bold** and [label](href). Nothing else:
// plain text otherwise, so content can never inject markup. Site links stay relative; other sites open
// in a new tab with rel="noopener". The mark syntax lives in src/content/artikel/text.ts (pure).
import type { ReactNode } from "react";
import { MARKS } from "@/content/artikel/text";
import { focusRing } from "./sections";

export { plain } from "@/content/artikel/text";

const linkClass = `rounded font-semibold text-lb-deep underline underline-offset-2 ${focusRing}`;

export function Rich({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKS)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={m.index}>{m[1]}</strong>);
    else {
      const href = m[3];
      const external = /^https?:\/\//.test(href);
      out.push(
        <a key={m.index} href={href} className={linkClass} {...(external ? { target: "_blank", rel: "noopener" } : {})}>
          {m[2]}
        </a>,
      );
    }
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
