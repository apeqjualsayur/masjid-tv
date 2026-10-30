"use client";
// Section 9, Cuba sekarang: type a name, pick a theme, see the REAL theme's full layout with that
// name and monogram. State lives in this component only: nothing is stored, sent or logged.
import { useId, useState } from "react";
import type { ThemeId } from "@/core";
import { TvFrame } from "./frames";
import { ADMIN_HREF } from "./Header";
import { copy, type Lang } from "./i18n";
import { InView, useSnapshot } from "./lazy";
import { NAME_MAX, tryMonogram } from "./monogram";
import { Eyebrow, focusRing, h2Class, sectionPad } from "./sections";
import { SHOWCASE_DATE } from "./showcase";
import { landingThemes } from "./themes-list";

/** 3 launch themes, or all 7 once round 2 is switched on (same switch as the admin). */
const THEMES = landingThemes();
/** Asar, 4:42 pm on the showcase Thursday (as in the design). */
const TRY_AT = Date.UTC(2026, 9, 22, 16 - 8, 42);

function TryTv({ theme, name, label }: { theme: ThemeId; name: string; label: string }) {
  const snap = useSnapshot(theme, SHOWCASE_DATE, () => TRY_AT);
  const Full = snap?.theme.layouts.full;
  const s = snap && { ...snap.s, masjid: { fullName: name.trim(), shortName: tryMonogram(name) } };
  return (
    <TvFrame label={label} screenBg="#121614" shadow="0 30px 60px rgba(16,36,27,0.18)">
      {s && Full && <Full s={s} />}
    </TvFrame>
  );
}

export function TrySection({ lang }: { lang: Lang }) {
  const c = copy(lang);
  const k = c.try;
  const [name, setName] = useState(k.defaultName);
  const [theme, setTheme] = useState<ThemeId>("tenang");
  const inputId = useId();
  const themeLabelId = useId();
  return (
    <section id="cuba" aria-labelledby="cuba-title" className={sectionPad}>
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-5">
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
          <Eyebrow>{k.eyebrow}</Eyebrow>
          <h2 id="cuba-title" className={h2Class}>
            {k.title}
          </h2>
          <label htmlFor={inputId} className="text-[14px] font-semibold text-lb-muted">
            {k.nameLabel}
          </label>
          <input
            id={inputId}
            value={name}
            maxLength={NAME_MAX}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
            className="box-border h-[52px] rounded-xl border border-lb-field bg-white px-4 text-[17px] text-lb-ink focus-visible:border-lb-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lb-deep"
          />
          <p id={themeLabelId} className="m-0 text-[14px] font-semibold text-lb-muted">
            {k.themeLabel}
          </p>
          <div role="group" aria-labelledby={themeLabelId} className="flex flex-wrap gap-2">
            {THEMES.map((id) => {
              const on = id === theme;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTheme(id)}
                  className={`h-11 rounded-full border px-[18px] text-[15px] font-semibold ${on ? "border-lb-deep bg-lb-deep text-white" : "border-lb-field bg-white text-lb-ink hover:border-lb-primary"} ${focusRing}`}
                >
                  {k.themes[id]}
                </button>
              );
            })}
          </div>
          <a href={ADMIN_HREF} className={`mt-1.5 self-start rounded text-[16px] font-bold text-lb-deep underline-offset-4 hover:underline ${focusRing}`}>
            {k.cta}
          </a>
        </div>
        <div className="min-w-0 flex-[1_1_560px]">
          <InView placeholder={<TvFrame label={c.a11y.tryPreview} screenBg="#121614" shadow="0 30px 60px rgba(16,36,27,0.18)" />}>
            <TryTv theme={theme} name={name} label={c.a11y.tryPreview} />
          </InView>
        </div>
      </div>
    </section>
  );
}