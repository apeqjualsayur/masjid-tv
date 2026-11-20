// Counts the landing copy shows, read from the code (PRD 70 §3.C: never typed). "{n}" in a copy
// string is the number of templates on offer.
import { PICKER_KEYS } from "@/templates";

export const TEMPLATE_COUNT = PICKER_KEYS.length;

/** Copy with "{n}" filled in. */
export const fill = (s: string) => s.replace(/{n}/g, String(TEMPLATE_COUNT));
