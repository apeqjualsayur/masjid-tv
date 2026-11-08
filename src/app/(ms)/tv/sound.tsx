"use client";
// Sound cues on the TV (_specs/50-PRD-sound.md D2, D5, D6). The engine decides (src/core/soundCues),
// the player plays (src/audio); this wires them to the display. Playback happens after render and
// is fire-and-forget: a locked, missing or failing sound never delays or blanks anything.
// Settings (bundle in Supabase mode, screen.json with ?local=1, plus debug params) apply as they
// change, without a reload. Only a clock tick runs the cue check: a settings change never plays a cue.
// The speaker-off icon (D6) is drawn here, inside the stage (so the burn-in shift applies), never by
// a theme: bottom-right, only when sound is on, audio is still locked, the screen is not a poster
// screen and the mode is normal (the same quiet rule as the "press OK" hint).
import { useEffect, useRef, useSyncExternalStore } from "react";
import { cueKey, cueToleranceMs, soundCue, type CueTick, type DisplayState, type LayoutKey, type SoundSettings } from "@/core";
import { player } from "@/audio";

const UNLOCK_EVENTS = ["keydown", "pointerdown", "touchstart"] as const;

export function SoundLayer({ s, at, layout, sound, speed, forced }: { s: DisplayState; at: number; layout: LayoutKey; sound: SoundSettings; speed: number; forced: boolean }) {
  const active = sound.enabled && layout !== "poster";
  const prev = useRef<CueTick | null>(null);
  const played = useRef(new Set<string>());
  const locked = useSyncExternalStore(player.subscribe, player.isLocked, () => false);
  // Latest settings for the tick effect, which must not re-run (and so never cue) when they change.
  const live = useRef({ active, sound });
  live.current = { active, sound };

  // Set up the player while sound is on: the context (still locked), the volume, the recording.
  useEffect(() => {
    if (!active) return;
    player.prime();
    if (sound.azan === "hayya" || sound.iqamah === "hayya") void player.preloadHayya();
  }, [active, sound.azan, sound.iqamah]);
  useEffect(() => {
    player.setVolume(sound.volume);
  }, [sound.volume]);
  // Switched off (or the screen became a poster screen): stop a sound still playing.
  useEffect(() => {
    if (!active) player.stop();
  }, [active]);

  // Any key, click or tap unlocks audio (browsers only allow it right after a user gesture).
  useEffect(() => {
    if (!active) return;
    const unlock = () => player.unlock();
    for (const e of UNLOCK_EVENTS) window.addEventListener(e, unlock, { passive: true });
    return () => {
      for (const e of UNLOCK_EVENTS) window.removeEventListener(e, unlock);
    };
  }, [active]);

  // One check per clock tick, after render. The previous tick is kept even while sound is off, so
  // switching it on never plays a cue for a mode that started earlier.
  useEffect(() => {
    const { active: on, sound: cfg } = live.current;
    const cur: CueTick = { at, mode: s.mode, waktu: s.modeTarget?.key, modeStartMs: s.modeStartMs, layout, isFriday: s.isFriday, forced };
    const cue = on ? soundCue(prev.current, cur, { firstTick: prev.current === null, toleranceMs: cueToleranceMs(speed), played: played.current }) : null;
    prev.current = cur;
    if (!cue) return;
    played.current.add(cueKey(cue, cur.modeStartMs ?? at));
    player.setVolume(cfg.volume);
    void player.play(cue.event === "azan" ? cfg.azan : cfg.iqamah);
  }, [at, s.mode, s.modeTarget?.key, s.modeStartMs, s.isFriday, layout, forced, speed]);

  if (!active || !locked || s.mode !== "normal") return null;
  return <SoundLockIcon />;
}

/** Speaker with a cross: sound is on but the browser has not allowed audio yet. No blur (lite-safe). */
function SoundLockIcon() {
  return (
    <div
      data-sound-locked
      role="img"
      aria-label="Bunyi belum aktif: tekan mana-mana butang"
      style={{
        position: "absolute",
        right: 24,
        bottom: 24,
        zIndex: 50,
        width: 44,
        height: 44,
        borderRadius: 999,
        background: "rgba(0,0,0,0.55)",
        opacity: 0.45,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H2v6h4l5 4V5z" fill="#FFFFFF" />
        <path d="m23 9-6 6M17 9l6 6" />
      </svg>
    </div>
  );
}
