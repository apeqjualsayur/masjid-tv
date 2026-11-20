"use client";
// Jadual Imam & Bilal editor extras (PRD enhancements §6.4, E15): the names come from the Petugas page,
// never typed here. A link to manage them, the "Hari ini" hint when the week view would hide per-waktu
// exceptions, and an empty state when the roster has nothing to show (the TV then skips the slide).
import Link from "next/link";
import { hasWaktuExceptions, rosterIsEmpty, type Roster } from "@/core";
import type { Fields } from "@/templates/schema";
import { useT } from "../i18n";
import { DAYS } from "../petugas/logic";
import { ROUTES } from "../routing";

const box = "rounded-xl px-3.5 py-3 text-[13px] leading-[1.5]";

export function PetugasFields({ fields, roster, error }: { fields: Fields; roster: Roster | null; error: string | null }) {
  const { t } = useT();
  const manage = (
    <Link href={ROUTES.petugas} className="flex min-h-11 items-center self-start text-[14px] font-bold text-adm-green">
      {t("editor.petugas.manage")}
    </Link>
  );
  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <p role="alert" className={`${box} bg-[#FDECE8] text-adm-danger`}>{t("editor.petugas.loadError", { message: error })}</p>
        {manage}
      </div>
    );
  }
  if (!roster) return <p className="text-[13px] text-adm-muted">{t("app.loading")}</p>;

  if (rosterIsEmpty(roster)) {
    const noPeople = roster.petugas.length === 0;
    return (
      <div data-petugas-empty className={`${box} flex flex-col gap-2 bg-[#FFF4DF] text-[#6B4A12]`}>
        <p>{t(noPeople ? "editor.petugas.emptyNoPeople" : "editor.petugas.emptyNoSlots")}</p>
        <Link href={`${ROUTES.petugas}?tab=${noPeople ? "senarai" : "jadual"}`} className="flex min-h-11 items-center self-start font-bold text-adm-green">
          {t(noPeople ? "editor.petugas.addPeople" : "editor.petugas.fillRoster")}
        </Link>
      </div>
    );
  }

  const exceptions = fields.view !== "hari_ini" && DAYS.some((d) => hasWaktuExceptions(roster, d));
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] leading-[1.5] text-adm-muted">{t("editor.petugas.source")}</p>
      {exceptions && <p data-petugas-hint className={`${box} bg-[#EEF4F1] text-[#2F4A3E]`}>{t("editor.petugas.weekHint")}</p>}
      {manage}
    </div>
  );
}
