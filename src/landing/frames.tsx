"use client";
// Device frames from the design (Lembut-Full): a CSS TV, phone and laptop. The TV shows its content
// on a fixed 1920×1080 stage scaled to the frame width, so real theme components render exactly as
// on a TV. Frames are decoration around an illustration: the label is on the outside, the inside is
// hidden from assistive technology.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const STAGE_W = 1920;
const STAGE_H = 1080;
/** Stand and foot of the TV (hardware colours, not page palette). */
const STAND: CSSProperties = { background: "linear-gradient(180deg,#2A302D,#1A1E1C)", clipPath: "polygon(30% 0, 70% 0, 100% 100%, 0 100%)" };
const FOOT: CSSProperties = { background: "#1A1E1C" };

/** Scale of a 1920-wide stage inside an element, kept in step with its width. */
function useStageScale<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [scale, setScale] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / STAGE_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, scale };
}

export function TvFrame({
  label,
  children,
  screenBg,
  stand = true,
  shadow = "0 40px 70px rgba(16,36,27,0.22)",
  className = "",
}: {
  label: string;
  /** Rendered on the 1920×1080 stage; nothing is rendered until the frame has been measured. */
  children?: ReactNode;
  /** Shown behind the stage (e.g. while the theme loads). */
  screenBg?: string;
  stand?: boolean;
  shadow?: string;
  className?: string;
}) {
  const { ref, scale } = useStageScale<HTMLDivElement>();
  return (
    <div role="img" aria-label={label} className={className}>
      <div className="rounded-[14px] bg-lb-bezel p-[10px]" style={{ boxShadow: shadow }}>
        <div ref={ref} aria-hidden="true" className="relative aspect-video overflow-hidden rounded-[4px]" style={{ background: screenBg }}>
          {scale !== null && children && (
            <div className="pointer-events-none absolute top-0 left-0 origin-top-left select-none" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
              {children}
            </div>
          )}
        </div>
      </div>
      {stand && (
        <div aria-hidden="true">
          <div className="mx-auto h-[26px] w-[18%]" style={STAND} />
          <div className="mx-auto h-[6px] w-[34%] rounded-[3px]" style={FOOT} />
        </div>
      )}
    </div>
  );
}

/** Phone: hero size 150×300 (radius 28, padding 6) or panel size 210×420 (radius 34, padding 8). */
export function PhoneFrame({ label, size = "sm", children, className = "", style }: { label: string; size?: "sm" | "md"; children: ReactNode; className?: string; style?: CSSProperties }) {
  const md = size === "md";
  return (
    <div
      role="img"
      aria-label={label}
      className={`box-border bg-lb-bezel ${md ? "h-[420px] w-[210px] rounded-[34px] p-2" : "h-[300px] w-[150px] rounded-[28px] p-1.5"} ${className}`}
      style={style}
    >
      <div aria-hidden="true" className={`box-border flex h-full flex-col overflow-hidden bg-lb-ground ${md ? "gap-2.5 rounded-[27px] px-3.5 py-5" : "gap-2 rounded-[22px] px-2.5 py-4"}`}>
        {children}
      </div>
    </div>
  );
}

/** Laptop: screen 16:10 (children sized in cqw of the screen width), bezel and a wider base. */
export function LaptopFrame({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="img" aria-label={label} className={className}>
      <div className="rounded-t-[14px] bg-lb-bezel px-[10px] pt-[10px] pb-3">
        <div aria-hidden="true" className="flex aspect-[16/10] overflow-hidden rounded-[4px] bg-white [container-type:inline-size]">
          {children}
        </div>
      </div>
      <div aria-hidden="true" className="-mx-[4%] h-3.5 rounded-b-[14px]" style={{ background: "linear-gradient(180deg,#D9DEDB,#B9C0BC)" }} />
    </div>
  );
}