// Numbers band (PRD §4 row 3): heading, line, 4 figures. With the hero chip, the only place that
// says "free" (RM0).
import { copy, type Lang } from "./i18n";
import { LineIcon, STAT_ICONS } from "./icons";

export function Numbers({ lang }: { lang: Lang }) {
  const c = copy(lang);
  const n = c.numbers;
  return (
    <section id="angka" aria-labelledby="angka-title" className="pt-[clamp(40px,5vw,64px)]">
      <div className="mx-auto flex max-w-[1000px] flex-col items-center gap-3 px-5 text-center">
        <h2 id="angka-title" className="m-0 text-[clamp(28px,3.2vw,38px)] font-bold tracking-[-0.6px]">
          {n.title}
        </h2>
        <p className="m-0 max-w-[620px] text-[17px] leading-[1.6] text-lb-muted">{n.body}</p>
      </div>
      <div className="mx-auto mt-8 max-w-[1000px] px-5">
        <ul aria-label={c.a11y.numbers} className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-6 rounded-3xl border border-lb-line bg-gradient-to-b from-white to-lb-soft px-5 py-8 text-center">
          {n.stats.map((s, i) => (
            <li key={s.l} className="flex flex-col items-center gap-1.5">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-lb-mint text-lb-deep">
                <LineIcon d={STAT_ICONS[i]} size={15} strokeWidth={2.2} />
              </span>
              <span className="text-[40px] font-semibold tracking-[-1px] text-lb-deep">{s.v}</span>
              <span className="text-[14px] font-semibold">{s.l}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}