"use client";
// Privacy notice (PRD §10), BM/EN. Text in ./content.ts. Linked from the sign-in page.
import Link from "next/link";
import { LangProvider, useT } from "@/admin/i18n";
import { ROUTES } from "@/admin/routing";
import { LangToggle } from "@/admin/shell/AdminShell";
import { LogoMark } from "@/admin/shell/icons";
import { PRIVACY, UPDATED } from "./content";

function Privacy() {
  const { lang } = useT();
  const p = PRIVACY[lang === "en" ? "en" : "ms"];
  const [y, m, d] = UPDATED.split("-").map(Number);
  const updated = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(lang === "en" ? "en-MY" : "ms-MY", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[680px] flex-col gap-5 px-5 pt-5 pb-12">
      <div className="flex items-center justify-between">
        <LogoMark size={40} />
        <LangToggle />
      </div>
      <p role="note" className="rounded-xl border border-adm-gold bg-[#FFF6E0] px-4 py-3 text-[14px] font-bold leading-[1.5] text-[#6B4A00]">
        {p.draft}
      </p>
      <h1 className="text-[28px] font-extrabold tracking-[-0.3px]">{p.title}</h1>
      <p className="text-[15px] leading-[1.6]">{p.intro}</p>
      {p.sections.map((s) => (
        <section key={s.heading} className="flex flex-col gap-2">
          <h2 className="text-[18px] font-extrabold">{s.heading}</h2>
          {s.body?.map((b) => (
            <p key={b} className="text-[15px] leading-[1.6]">{b}</p>
          ))}
          {s.list && (
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-[1.6]">
              {s.list.map((li) => (
                <li key={li}>{li}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <p className="text-[13px] text-adm-muted">
        {p.updated}: {updated}
      </p>
      <Link href={ROUTES.signIn} className="inline-flex min-h-11 items-center font-bold text-adm-green">
        ← {p.back}
      </Link>
    </div>
  );
}

export default function PrivasiPage() {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-adm-ground font-jakarta text-adm-ink antialiased">
      <LangProvider>
        <Privacy />
      </LangProvider>
    </div>
  );
}