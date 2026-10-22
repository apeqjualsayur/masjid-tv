"use client";
// Tiny CSS-only picture of a TV per theme and layout (designs/admin/Screens mini previews).
// Not the real theme: just enough to tell Alam, Serambi and Tenang apart at a glance.
import type { Layout, Theme } from "./logic";

function Content({ theme }: { theme: Theme }) {
  if (theme === "serambi") {
    return (
      <div className="flex h-full items-end gap-[6%] p-[6%]">
        {["linear-gradient(180deg,#2F7FC6,#8CC6EE)", "linear-gradient(180deg,#3D7DB8,#E9B36A)", "linear-gradient(180deg,#3B2D6B,#F2A65E)", "linear-gradient(180deg,#050B1A,#0E2A44)"].map((bg, i) => (
          <div key={i} style={{ background: bg, height: i === 1 ? "62%" : "48%", opacity: i === 0 ? 0.45 : 1, boxShadow: i === 1 ? "0 0 0 1.5px #E3B04B" : undefined }} className="flex-1 rounded-t-[8px] rounded-b-[2px]" />
        ))}
      </div>
    );
  }
  if (theme === "tenang") {
    return (
      <div className="flex h-full items-center gap-[8%] px-[9%]">
        <div className="text-[0.95em] leading-none font-light text-[#14303D]">1:20</div>
        <div className="flex flex-1 flex-col gap-[3px]">
          <div className="h-[4px] rounded-sm bg-[#C9DCE6]" />
          <div className="h-[7px] rounded bg-white" />
          <div className="h-[4px] rounded-sm bg-[#C9DCE6]" />
        </div>
      </div>
    );
  }
  return (
    <div className="relative h-full overflow-hidden" style={{ background: "linear-gradient(180deg,#F7CF6A 0%,#F2AE3C 45%,#E58A27 100%)" }}>
      <div className="absolute top-[14%] right-[18%] h-[22%] w-[13%] rounded-full bg-[#FFF4D2]" />
      <div className="absolute -bottom-[30%] -left-[10%] h-[70%] w-[70%] rounded-[50%] bg-[#D9822B]" />
      <div className="absolute -right-[10%] -bottom-[35%] h-[75%] w-[75%] rounded-[50%] bg-[#B5611C]" />
      <div className="absolute inset-x-[22%] top-[34%] h-[16%] rounded-[3px] bg-white/35" />
    </div>
  );
}

const bg: Record<Theme, string> = { alam: "#E58A27", serambi: "#0B1114", tenang: "#EAF3F8" };
const panel: Record<Theme, string> = { alam: "rgba(255,255,255,0.75)", serambi: "#1C262B", tenang: "#FFFFFF" };

export function ThemeThumb({ theme, layout = "full", width = 112 }: { theme: Theme; layout?: Layout; width?: number }) {
  const h = Math.round((width * 9) / 16);
  return (
    <div aria-hidden="true" style={{ width, height: h, background: bg[theme], fontSize: Math.round(width / 6.2) }} className="relative flex flex-none overflow-hidden rounded-lg border-[3px] border-[#1B1B1B]">
      <div className={layout === "side" ? "h-full w-[68%]" : layout === "bottom" ? "h-[72%] w-full" : "h-full w-full"}>
        <Content theme={theme} />
      </div>
      {layout === "bottom" && <div style={{ background: panel[theme] }} className="absolute inset-x-[4%] bottom-[5%] h-[22%] rounded-[3px]" />}
      {layout === "side" && <div style={{ background: panel[theme] }} className="absolute inset-y-[6%] right-[4%] w-[27%] rounded-[3px]" />}
    </div>
  );
}