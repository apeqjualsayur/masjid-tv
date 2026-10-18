import type { DayTimes } from "@/core";

/** One month of prayer times for a zone, in the engine's format (epoch ms). */
export interface MonthData {
  zone: string;
  year: number;
  /** 1-12 */
  month: number;
  /** Epoch ms when this was fetched from the API. */
  fetchedAt: number;
  /** One entry per day of the month, in order. */
  days: DayTimes[];
}

/** Bundled fallback file: public/data/{zone}-{year}.json (written by scripts/fetch-year.ts). */
export interface YearFile {
  zone: string;
  year: number;
  fetchedAt: number;
  /** The months that were available when the file was built (ideally all 12). */
  months: MonthData[];
}

export type DataSource = "live" | "cache" | "fallback";

export const UNAVAILABLE_MESSAGE = "Data waktu tidak tersedia";

export type DayResult =
  | {
      status: "ok";
      /** Where today's times came from: fetched this session, IndexedDB from earlier, or the bundled file. */
      source: DataSource;
      today: DayTimes;
      /**
       * Tomorrow's Imsak, for the Isyak to Imsak wrap. null if tomorrow's data is not
       * available (e.g. 31 Dec before next year is published). Never guessed.
       */
      tomorrowImsak: number | null;
      /** Tomorrow's Subuh: the next prayer after Isyak. null if not available. */
      tomorrowSubuh: number | null;
      /** When today's month was fetched from the API (epoch ms), for the status overlay. */
      fetchedAt?: number;
    }
  | { status: "unavailable"; message: typeof UNAVAILABLE_MESSAGE };

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
