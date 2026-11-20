// Sample content for the template gallery renders (/templat, _specs/70-PRD-seo.md §3.F). TV content,
// so Malay. No "[ … ]" placeholders and no real people: the death notice uses "Fulan bin Fulan", the
// customary name for an unnamed person; the roster uses generic names. Ayat has no sample on purpose
// (its verse list awaits review): its page shows the layout thumbnail instead.
import type { IslamicEvent, Roster } from "@/core";
import type { PickerKey } from "@/templates";
import { LANDING_SAMPLES } from "./template-samples";

/** The day each render is drawn (bundled WLY01 2026 prayer data; Thursday unless noted). */
export const GALLERY_DATE = "2026-10-22";
/** Hari Kebesaran is drawn on 10 Dec 2026: 27 days before Israk dan Mikraj. */
export const KEBESARAN_DATE = "2026-12-10";

/**
 * The platform takwim for 1448H as the TVs receive it (bundle_islamic_events, 20 Nov 2026): JAKIM's
 * dates, Ramadan to Aidiladha still "jangkaan". A frozen copy for the sample render only; the TVs read
 * the live table.
 */
export const GALLERY_EVENTS: IslamicEvent[] = [
  { key: "israk_mikraj", hijriYear: 1448, date: "2027-01-06", status: "rasmi" },
  { key: "nisfu_syaaban", hijriYear: 1448, date: "2027-01-24", status: "rasmi" },
  { key: "awal_ramadan", hijriYear: 1448, date: "2027-02-08", status: "jangkaan" },
  { key: "nuzul_quran", hijriYear: 1448, date: "2027-02-24", status: "jangkaan" },
  { key: "aidilfitri", hijriYear: 1448, date: "2027-03-10", status: "jangkaan" },
  { key: "hari_arafah", hijriYear: 1448, date: "2027-05-16", status: "jangkaan" },
  { key: "aidiladha", hijriYear: 1448, date: "2027-05-17", status: "jangkaan" },
  { key: "awal_muharram", hijriYear: 1449, date: "2027-06-06", status: "rasmi" },
  { key: "maulidur_rasul", hijriYear: 1449, date: "2027-08-15", status: "rasmi" },
];

const P = (id: string, title: string | null, name: string, roles: ("imam" | "bilal")[]) => ({ id, title, name, roles });
export const GALLERY_ROSTER: Roster = {
  petugas: [P("i1", "Ust.", "Ahmad", ["imam"]), P("i2", "Hj.", "Hafiz", ["imam", "bilal"]), P("i3", "Ust.", "Khairul", ["imam"]), P("b1", null, "Rahim", ["bilal"]), P("b2", null, "Syafiq", ["bilal"])],
  slots: [
    ...[1, 2, 3].flatMap((day) => [{ day, waktu: null, role: "imam" as const, petugasId: "i1" }, { day, waktu: null, role: "bilal" as const, petugasId: "b1" }]),
    ...[4, 5].flatMap((day) => [{ day, waktu: null, role: "imam" as const, petugasId: "i3" }, { day, waktu: null, role: "bilal" as const, petugasId: "b2" }]),
    { day: 5, waktu: "zohor" as const, role: "imam" as const, petugasId: "i2" },
    ...[6, 7].flatMap((day) => [{ day, waktu: null, role: "imam" as const, petugasId: "i2" }, { day, waktu: null, role: "bilal" as const, petugasId: "b1" }]),
  ],
};

/** Fields for each template's render (the landing samples where they exist). */
export const GALLERY_FIELDS: Record<Exclude<PickerKey, "ayat">, object> = {
  ...LANDING_SAMPLES,
  kematian: {
    name: "Allahyarham Fulan bin Fulan",
    solatJenazah: { time: "Selepas Zohor", place: "Masjid ini" },
    burialPlace: "Tanah Perkuburan Islam kariah",
  },
  penangguhan: {
    title: "Kuliah Dhuha: Adab Bertetangga",
    kind: "tangguh",
    date: "Sabtu, 24 Oktober 2026",
    dateIso: "2026-10-24",
    time: "10:45 pagi",
    newDate: "Sabtu, 31 Oktober 2026",
    newDateIso: "2026-10-31",
    newTime: "10:45 pagi",
    person: "Penceramah jemputan",
    reason: "Penceramah uzur",
    note: "",
  },
  hari_kebesaran: { leadDays: 60, showMore: 2 },
  jadual_petugas: { view: "minggu", title: "Jadual Imam & Bilal" },
};
