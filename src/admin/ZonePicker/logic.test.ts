import { describe, expect, it } from "vitest";
import type { Zone } from "@/data/zones";
import { areaName, areasOfState, choiceFromArea, choiceFromZone, parseGpsZone, searchZones, states, zoneAreaText, zoneAreas } from "./logic";

describe("zoneAreas: areas from a zone description", () => {
  it("splits on commas and tidies spaces", () => {
    expect(zoneAreas("Kuala Kangsar, Sg. Siput , Ipoh")).toEqual(["Kuala Kangsar", "Sg. Siput", "Ipoh"]);
  });
  it("splits on ' dan ' but not inside brackets", () => {
    expect(zoneAreas("Pulau Aur dan Pulau Pemanggil")).toEqual(["Pulau Aur", "Pulau Pemanggil"]);
    expect(zoneAreas("Gua Musang (Daerah Galas Dan Bertam), Jeli")).toEqual(["Gua Musang (Daerah Galas Dan Bertam)", "Jeli"]);
  });
  it("opens a bracketed list into separate areas", () => {
    expect(zoneAreas("Zon Khas Daerah Rompin, (Mukim Rompin, Mukim Endau, Mukim Pontian)")).toEqual([
      "Zon Khas Daerah Rompin", "Mukim Rompin", "Mukim Endau", "Mukim Pontian",
    ]);
  });
  it("title-cases descriptions written in capitals", () => {
    expect(zoneAreas("SELURUH NEGERI MELAKA")).toEqual(["Seluruh Negeri Melaka"]);
  });
  it("areaName drops Timur/Barat/Atas/Bawah halves only", () => {
    expect(areaName("Bahagian Sandakan (Timur)")).toBe("Bahagian Sandakan");
    expect(areaName("Bahagian Pendalaman (Bawah)")).toBe("Bahagian Pendalaman");
    expect(areaName("Pokok Sena (Daerah Kecil)")).toBe("Pokok Sena (Daerah Kecil)");
  });
});

describe("area to zone mapping", () => {
  it("lists every state once, sorted", () => {
    const s = states();
    expect(s).toContain("Selangor");
    expect(s).toContain("Wilayah Persekutuan");
    expect(new Set(s).size).toBe(s.length);
    expect([...s].sort((a, b) => a.localeCompare(b, "ms"))).toEqual(s);
  });

  it("an area in one zone sets that zone automatically", () => {
    const gombak = areasOfState("Selangor").find((a) => a.name === "Gombak")!;
    expect(gombak.zones).toEqual(["SGR01"]);
    expect(choiceFromArea("Selangor", gombak)).toEqual({ zone: "SGR01", state: "Selangor", district: "Gombak", source: "area" });
    const klang = areasOfState("Selangor").find((a) => a.name === "Klang")!;
    expect(klang.zones).toEqual(["SGR03"]);
  });

  it("real multi-zone areas in the bundled list need a choice", () => {
    const multi = areasOfState("Sabah").filter((a) => a.zones.length > 1);
    expect(multi.map((a) => [a.name, a.zones])).toEqual([
      ["Bahagian Pendalaman", ["SBH08", "SBH09"]],
      ["Bahagian Sandakan", ["SBH01", "SBH02"]],
      ["Bahagian Tawau", ["SBH03", "SBH04"]],
    ]);
    const sandakan = multi[1];
    expect(choiceFromArea("Sabah", sandakan)).toBeNull();
    expect(choiceFromArea("Sabah", sandakan, "SGR01")).toBeNull();
    expect(choiceFromArea("Sabah", sandakan, "SBH02")).toEqual({ zone: "SBH02", state: "Sabah", district: "Bahagian Sandakan", source: "picked" });
  });

  it("an area named in two zones of the same state is one option with both zones", () => {
    const zones: Zone[] = [
      { jakimCode: "PHG02", negeri: "Pahang", daerah: "Kuantan, Pekan, Rompin" },
      { jakimCode: "PHG03", negeri: "Pahang", daerah: "Temerloh, Rompin" },
      { jakimCode: "JHR03", negeri: "Johor", daerah: "Rompin" },
    ];
    const pahang = areasOfState("Pahang", zones);
    expect(pahang.map((a) => a.name)).toEqual(["Kuantan", "Pekan", "Rompin", "Temerloh"]);
    expect(pahang.find((a) => a.name === "Rompin")!.zones).toEqual(["PHG02", "PHG03"]);
    expect(areasOfState("Johor", zones)).toEqual([{ name: "Rompin", zones: ["JHR03"] }]);
  });

  it("every zone is reachable from the lists", () => {
    const reachable = new Set(states().flatMap((s) => areasOfState(s).flatMap((a) => a.zones)));
    expect(reachable.size).toBe(60);
  });

  it("zone area text and Tukar zon choice", () => {
    expect(zoneAreaText("sgr01")).toBe("Gombak, Petaling, Sepang, Hulu Langat, Hulu Selangor, Shah Alam");
    expect(choiceFromZone("WLY01")).toEqual({ zone: "WLY01", state: "Wilayah Persekutuan", district: "Kuala Lumpur, Putrajaya", source: "picked" });
    expect(choiceFromZone("XXX99")).toBeNull();
  });

  it("search matches code, state and area, ignoring case", () => {
    expect(searchZones("").length).toBe(60);
    expect(searchZones("sgr0").map((z) => z.jakimCode)).toEqual(["SGR01", "SGR02", "SGR03"]);
    expect(searchZones("shah alam").map((z) => z.jakimCode)).toEqual(["SGR01"]);
    expect(searchZones("pahang tioman").map((z) => z.jakimCode)).toEqual(["PHG01"]);
    expect(searchZones("nowhere")).toEqual([]);
  });
});

describe("parseGpsZone: GET /zones/{lat}/{long}", () => {
  it("reads the response shape seen on 2026-10-22 (KL coordinates)", () => {
    expect(parseGpsZone({ zone: "WLY01", state: "KUL", district: "W.P. Kuala Lumpur" })).toEqual({
      zone: "WLY01", state: "Wilayah Persekutuan", district: "W.P. Kuala Lumpur", source: "gps",
    });
  });
  it("accepts lower case and a missing district", () => {
    expect(parseGpsZone({ zone: "sgr01" })).toEqual({ zone: "SGR01", state: "Selangor", district: "Gombak", source: "gps" });
  });
  it("rejects unknown zones and other shapes", () => {
    expect(parseGpsZone({ zone: "ABC99", district: "X" })).toBeNull();
    expect(parseGpsZone({ zone: "SGR1" })).toBeNull();
    expect(parseGpsZone({ message: "Server error" })).toBeNull();
    expect(parseGpsZone(null)).toBeNull();
    expect(parseGpsZone("SGR01")).toBeNull();
  });
});