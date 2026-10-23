"use client";
// Any render error: show a calm message and reload after 30 s (PRD section 11).
import { Component, type ReactNode } from "react";

export const ERROR_RELOAD_MS = 30_000;

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  private timer: ReturnType<typeof setTimeout> | undefined;

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[masjid-tv] display crashed; reloading in 30 s", error);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => window.location.reload(), ERROR_RELOAD_MS);
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-black font-jakarta text-white/70">
        <div className="text-5xl">Ralat paparan</div>
        <div className="text-3xl">Memuat semula dalam 30 saat…</div>
      </div>
    );
  }
}