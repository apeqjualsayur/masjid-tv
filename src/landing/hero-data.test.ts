import { describe, expect, it } from "vitest";
import { localParts, parseLocalDateTime } from "@/core";
import type { YearFile } from "@/data";
import file from "../../public/data/WLY01-2026.json";
import { heroDateKey, heroDay, heroSlide, heroState, heroTime, simFromSearch } from "./hero-data";

const year = file as unknown as YearFile;
const at = (s: string) => parseLocalDateTime(s)!;

describe("landing hero TV data", () => {
  it("?sim= is read in Malaysia time; anything else is ignored", () => {
    expect(simFromSearch("?sim=2026-10-23T13:20")).toBe(at("2026-10-23T13:20"));
    expect(simFromSearch("?sim=nonsense")).toBeNull();
    expect(simFromSearch("")).toBeNull();
  });

  it("uses the bundled WLY01 day, and the phase follows the clock", async () => {
    const t = at("2026-10-23T13:20");
    const day = await heroDay(year, heroDateKey(t, year.year));
    expect(day.status).toBe("ok");
    const s = heroState(day, t, false)!;
    expect(s.masjid.fullName).toBe("Masjid Al-Hidayah");
    expect(s.phase).toBe("zohor");
    expect(s.waktu.find((w) => w.key === "zohor")?.time).toBe("1:00");
    expect(heroState(await heroDay(year, "2026-10-23"), at("2026-10-23T05:45"), false)!.phase).toBe("subuh");
    expect(heroState(await heroDay(year, "2026-10-23"), at("2026-10-23T21:00"), false)!.phase).toBe("isyak");
  });

  it("outside the data year: same date and time of day in that year (never blank)", async () => {
    const t = heroTime(at("2027-03-05T16:30"), 2026);
    const p = localParts(t);
    expect([p.year, p.month, p.day, p.hour, p.minute]).toEqual([2026, 3, 5, 16, 30]);
    expect(localParts(heroTime(at("2028-02-29T09:00"), 2026)).day).toBe(28);
    expect((await heroDay(year, heroDateKey(at("2027-03-05T16:30"), 2026))).status).toBe("ok");
  });

  it("no data for that day: no state (the frame stays empty, nothing is guessed)", async () => {
    expect(heroState(await heroDay({ ...year, months: [] }, "2026-10-23"), at("2026-10-23T13:20"), false)).toBeNull();
  });

  it("one Kuliah slide, dated the day shown", () => {
    const s = heroSlide(at("2026-10-23T13:20"));
    expect(s.kind).toBe("template");
    expect(s.kind === "template" && s.template).toBe("kuliah");
    expect(s.kind === "template" && (s.fields as { topic: string; date: string })).toMatchObject({ topic: "Adab Menuntut Ilmu", date: "Jumaat, 23 Oktober" });
  });
});