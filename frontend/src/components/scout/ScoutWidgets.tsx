"use client";

import React from "react";

export function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? "c9-pill-active"
          : "border-sky-200 bg-white/80 text-slate-600 hover:border-sky-400 hover:text-sky-800"
      }`}
    >
      {children}
    </button>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 mt-3 text-[11px] font-bold uppercase tracking-wider text-sky-800/70">{children}</div>;
}

export function Bar({ label, value, max, suffix, hint }: { label: string; value: number; max: number; suffix?: string; hint?: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="mb-1.5" title={hint}>
      <div className="flex justify-between text-xs text-slate-600">
        <span className="truncate pr-2">{label}</span>
        <span className="tabular-nums font-semibold text-slate-800">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sky-100">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const CONF_STYLE: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-800 border-emerald-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  low: "bg-rose-100 text-rose-800 border-rose-300",
};

export function EvidenceBar({
  items,
  confidence,
}: {
  items: { label: string; value: string | number }[];
  confidence: "high" | "medium" | "low";
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-sky-200 bg-white/80 px-4 py-2 text-sm">
      <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800/70">Evidence</span>
      {items.map((i) => (
        <span key={i.label} className="text-slate-600">
          <b className="tabular-nums text-slate-900">{i.value}</b> {i.label}
        </span>
      ))}
      <span
        className={`ml-auto rounded-full border px-2.5 py-0.5 text-xs font-bold ${CONF_STYLE[confidence]}`}
        title="High: 80+ rounds, Medium: 25+ rounds, Low: fewer"
      >
        {confidence} confidence
      </span>
    </div>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`glass-panel rounded-2xl p-4 ${className}`}>
      {title && <h2 className="mb-2 text-sm font-extrabold tracking-wide text-sky-900">{title}</h2>}
      {children}
    </section>
  );
}

export function titleCase(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
