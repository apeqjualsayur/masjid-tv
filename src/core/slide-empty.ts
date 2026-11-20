// Per-template "isEmpty" rule for the playlist skip (_specs/60-PRD-enhancements.md §7.2): a slide whose
// content would be empty right now is not shown. Pure; data comes from the bundle (D7).
import { islamicEventsView, type IslamicEvent } from "./islamic-events";
import { rosterIsEmpty, type Roster } from "./roster";

/** The bundle data the rules read. A bundle without the keys = empty arrays (§7.3). */
export interface SlideEmptyData {
  islamicEvents: readonly IslamicEvent[];
  roster: Roster;
}

/**
 * True when the slide has nothing to show at `at`: hari_kebesaran with no greeting, Ramadan or event
 * within leadDays (§5.4.6); jadual_petugas with no slots (§6.4). Every other template → false.
 * "Malam ini" never decides emptiness: its event is tomorrow, so the countdown already applies.
 */
export function slideIsEmpty(templateKey: string | null | undefined, fields: Record<string, unknown>, data: SlideEmptyData, at: number): boolean {
  if (templateKey === "hari_kebesaran") return islamicEventsView(data.islamicEvents, fields, at, null).kind === "empty";
  if (templateKey === "jadual_petugas") return rosterIsEmpty(data.roster);
  return false;
}
