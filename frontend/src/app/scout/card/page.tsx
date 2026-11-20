"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Cloud9Logo } from "@/components/Cloud9Logo";
import { ScoutMap } from "@/components/scout/ScoutMap";
import { titleCase } from "@/components/scout/ScoutWidgets";
import { CounterCard, fetchCard } from "@/lib/scoutApi";

const CONF_STYLE: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-rose-100 text-rose-800",
};

function CardView() {
  const params = useSearchParams();
  const team = params.get("team") ?? "";
  const map = params.get("map") ?? "";
  const [card, setCard] = useState<CounterCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!team || !map) return;
    const ac = new AbortController();
    setError(null);
    fetchCard(team, map, ac.signal)
      .then(setCard)
      .catch((e) => !ac.signal.aborted && setError(e.message));
    return () => ac.abort();
  }, [team, map]);

  if (!team || !map) {
    return (
      <p className="p-6 text-sm">
        Open a counter-card from the <Link href="/scout" className="underline">Scout page</Link> after choosing a team and one map.
      </p>
    );
  }
  if (error) return <p className="p-6 text-sm text-rose-700">{error}</p>;
  if (!card) return <p className="p-6 text-sm text-sky-700">Building card…</p>;

  return (
    <div className="mx-auto max-w-[900px] bg-white p-6 text-slate-800 print:p-0">
      <div className="no-print mb-4 flex items-center justify-between text-sm">
        <Link href="/scout" className="font-semibold text-sky-700 underline underline-offset-2">
          Back to Scout
        </Link>
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-sky-600 px-3 py-1.5 font-semibold text-white">
          Print or save as PDF
        </button>
      </div>

      <header className="flex items-center gap-3 border-b-2 border-sky-700 pb-3">
        <Cloud9Logo size={44} />
        <div>
          <h1 className="text-2xl font-black leading-tight text-sky-900">
            {card.team} on {titleCase(card.map)}
          </h1>
          <p className="text-xs text-slate-500">Counter-card · C9 Oracle · built from official GRID match data</p>
        </div>
      </header>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_300px] print:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {card.sections.map((s) => (
            <section key={s.title} className="break-inside-avoid rounded-lg border border-sky-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-black uppercase tracking-wide text-sky-900">{s.title}</h2>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CONF_STYLE[s.confidence]}`}>{s.confidence} confidence</span>
              </div>
              <p className="text-[11px] text-slate-500">{s.evidence}</p>
              {s.actions.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm font-semibold leading-snug">
                  {s.actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No pattern strong enough to advise on.</p>
              )}
              {s.facts.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-snug text-slate-600">
                  {s.facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="break-inside-avoid">
          <ScoutMap
            map={card.map}
            points={card.attack_points}
            hotspots={card.sites.map((s, i) => ({
              rank: i + 1,
              x: s.x,
              y: s.y,
              nx: s.nx,
              ny: s.ny,
              casts: s.plants,
              share_of_casts_pct: 0,
              rounds_with: 0,
              rounds_total: 0,
              rounds_with_pct: 0,
              median_t: 0,
              p25_t: 0,
              p75_t: 0,
              top_abilities: [],
              top_players: [],
            }))}
            caption="Dots are where they plant the spike. Numbered markers are the sites."
          />
        </div>
      </div>

      <footer className="mt-4 border-t border-sky-200 pt-2 text-[10px] leading-snug text-slate-500">
        {card.caveats.map((c) => (
          <p key={c}>{c}</p>
        ))}
      </footer>
    </div>
  );
}

export default function CounterCardPage() {
  return (
    <main className="min-h-screen bg-white">
      <Suspense fallback={<p className="p-6 text-sm">Loading…</p>}>
        <CardView />
      </Suspense>
    </main>
  );
}
