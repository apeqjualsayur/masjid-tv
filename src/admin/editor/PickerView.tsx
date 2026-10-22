"use client";
// Kandungan baru (designs/admin/Picker): poster upload, or one of the 10 templates.
import Link from "next/link";
import { TEMPLATE_KEYS } from "@/templates";
import { TEMPLATES } from "@/templates/schema";
import { useT } from "../i18n";
import { ROUTES } from "../routing";
import { ICON, Icon } from "../shell/icons";

export function PickerView() {
  const { t, lang } = useT();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-extrabold tracking-[-0.3px]">{t("picker.title")}</h1>
        <Link href={ROUTES.home} aria-label={t("picker.close")} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-adm-hair">
          <Icon d={ICON.close} size={22} />
        </Link>
      </div>
      <Link href={ROUTES.poster} className="flex items-center gap-4 rounded-[18px] bg-adm-green p-4 text-white shadow-[0_1px_3px_rgba(18,38,30,0.08)] hover:bg-adm-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green lg:max-w-[560px]">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] bg-white/15">
          <Icon d={ICON.poster} size={26} />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-[16px] font-extrabold">{t("picker.poster")}</span>
          <span className="text-[13px] opacity-85">{t("picker.posterHint")}</span>
        </span>
      </Link>
      <h2 className="text-[12px] font-extrabold tracking-[0.08em] text-adm-muted uppercase">{t("picker.orTemplate")}</h2>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
        {TEMPLATE_KEYS.map((k) => {
          const m = TEMPLATES[k];
          return (
            <li key={k}>
              <Link href={`${ROUTES.template}?key=${k}`} className="flex h-full min-h-[118px] flex-col gap-1.5 rounded-[16px] bg-adm-card p-3.5 shadow-[0_1px_3px_rgba(18,38,30,0.08)] hover:ring-2 hover:ring-adm-green focus-visible:outline-2 focus-visible:outline-adm-green">
                <span aria-hidden="true" style={{ background: m.bg, color: m.fg }} className="flex h-9 w-12 items-center justify-center rounded-[10px] text-[12px] font-extrabold">
                  {m.code}
                </span>
                <span className="text-[15px] leading-tight font-extrabold">{m.name[lang]}</span>
                <span className="text-[12px] leading-[1.35] text-adm-muted">{m.desc[lang]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}