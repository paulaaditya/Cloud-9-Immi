"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Cloud9Logo } from "@/components/Cloud9Logo";
import { Chip, FieldLabel, Panel, titleCase } from "@/components/scout/ScoutWidgets";
import { ScoutOptions, TeamSummary, TimeoutAdvice, fetchOptions, fetchTeams, fetchTimeout } from "@/lib/scoutApi";

const STREAKS = [-3, -2, -1, 0, 1, 2, 3];
const CONF_STYLE: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-rose-100 text-rose-800",
};
const KIND_LABEL: Record<string, string> = {
  site: "Site",
  tell: "Tell this match",
  weakness: "Weak spot",
  economy: "Economy",
  pace: "Pace",
  operator: "Operator",
};

const streakLabel = (s: number) => (s === 0 ? "Even" : s > 0 ? `Won last ${s}` : `Lost last ${-s}`);

export default function TimeoutPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [teamId, setTeamId] = useState("");
  const [options, setOptions] = useState<ScoutOptions | null>(null);
  const [map, setMap] = useState("");
  const [side, setSide] = useState<"attacker" | "defender">("attacker");
  const [streak, setStreak] = useState(-2);
  const [observed, setObserved] = useState<string[]>([]);
  const [advice, setAdvice] = useState<TimeoutAdvice | null>(null);
  const [useAi, setUseAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetchTeams(ac.signal)
      .then((t) => {
        setTeams(t);
        setTeamId((t.find((x) => x.name === "Cloud9") ?? t[0])?.team_id ?? "");
      })
      .catch((e) => !ac.signal.aborted && setError(`Could not reach the API (${e.message}). Start the backend on port 8000.`));
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (!teamId) return;
    const ac = new AbortController();
    fetchOptions(teamId, ac.signal)
      .then((o) => {
        setOptions(o);
        setMap(o.maps[0]?.map ?? "");
        setObserved([]);
      })
      .catch((e) => !ac.signal.aborted && setError(e.message));
    return () => ac.abort();
  }, [teamId]);

  useEffect(() => {
    if (!teamId || !map) return;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetchTimeout(teamId, map, side, streak, side === "attacker" ? observed : [], useAi, ac.signal)
      .then(setAdvice)
      .catch((e) => !ac.signal.aborted && setError(e.message))
      .finally(() => !ac.signal.aborted && setLoading(false));
    return () => ac.abort();
  }, [teamId, map, side, streak, observed, useAi]);

  const siteCount = map === "haven" || map === "lotus" ? 3 : 2;
  const team = teams.find((t) => t.team_id === teamId);

  return (
    <main className="c9-bg-ethereal h-screen overflow-y-auto print:h-auto print:overflow-visible text-slate-800">
      <header className="no-print flex flex-wrap items-center gap-3 border-b border-sky-200 bg-white/85 px-5 py-3">
        <Cloud9Logo size={44} />
        <div>
          <h1 className="text-lg font-black leading-tight text-sky-900">C9 Oracle · Timeout advisor</h1>
          <p className="text-xs text-slate-500">What to adjust before the next rounds, from how this opponent behaves in this situation</p>
        </div>
        <Link href="/scout" className="ml-auto text-xs font-semibold text-sky-700 underline underline-offset-2">
          Back to Scout
        </Link>
      </header>

      <div className="mx-auto grid max-w-[1100px] gap-4 p-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Panel title="The situation" className="no-print self-start">
          <FieldLabel>Opponent</FieldLabel>
          <select
            className="w-full rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-sm"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            aria-label="Opponent"
          >
            {teams.map((t) => (
              <option key={t.team_id} value={t.team_id}>
                {t.name} ({t.series_count} matches)
              </option>
            ))}
          </select>

          <FieldLabel>Map</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {options?.maps.map((m) => (
              <Chip key={m.map} active={map === m.map} onClick={() => { setMap(m.map); setObserved([]); }} title={`${m.rounds} rounds`}>
                {titleCase(m.map)}
              </Chip>
            ))}
          </div>

          <FieldLabel>Their side next round</FieldLabel>
          <div className="flex gap-1.5">
            <Chip active={side === "attacker"} onClick={() => setSide("attacker")}>Attack</Chip>
            <Chip active={side === "defender"} onClick={() => setSide("defender")}>Defense</Chip>
          </div>

          <FieldLabel>Their run going in</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {STREAKS.map((s) => (
              <Chip key={s} active={streak === s} onClick={() => setStreak(s)}>
                {streakLabel(s)}
              </Chip>
            ))}
          </div>

          {side === "attacker" && (
            <>
              <FieldLabel>Sites they planted recently (oldest first)</FieldLabel>
              <div className="flex flex-wrap items-center gap-1.5">
                {Array.from({ length: siteCount }, (_, i) => `S${i + 1}`).map((id) => (
                  <Chip key={id} active={false} onClick={() => setObserved((o) => [...o, id].slice(-8))}>
                    + Site {id.slice(1)}
                  </Chip>
                ))}
                <Chip active={false} onClick={() => setObserved([])}>Clear</Chip>
              </div>
              <p className="mt-1 text-[11px] text-slate-600">{observed.length ? observed.map((o) => `Site ${o.slice(1)}`).join(", ") : "None entered"}</p>
            </>
          )}

          <FieldLabel>Wording</FieldLabel>
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} className="mt-0.5" />
            <span>
              Also word it as a timeout call with Gemini. Only the lines on the right are sent, never raw match data. Needs a key on the server.
            </span>
          </label>
          {team?.name.startsWith("Cloud9") && <p className="mt-2 text-[11px] text-sky-700">Self-scouting: this is Cloud9&apos;s own behaviour.</p>}
        </Panel>

        <div className="space-y-4">
          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {advice && (
            <>
              <Panel title={`Before the next round: ${team?.name ?? ""} on ${titleCase(advice.map)}, ${advice.opp_side === "attacker" ? "attacking" : "defending"}`}>
                <p className="text-xs text-slate-600">
                  {streakLabel(advice.streak)}
                  {advice.situation_used ? ` · using how they play ${advice.situation_text}` : " · using their overall tendencies on this map and side"}
                </p>
                {advice.adjustments.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">No pattern strong enough to advise on for this situation.</p>
                ) : (
                  <ol className="mt-2 space-y-2">
                    {advice.adjustments.map((a, i) => (
                      <li key={a.text} className="rounded-lg border border-sky-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-black uppercase tracking-wide text-sky-800">
                            {i + 1}. {KIND_LABEL[a.kind] ?? a.kind}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CONF_STYLE[a.confidence]}`}>
                            {a.confidence} · {a.rounds} rounds
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold leading-snug">{a.text}</p>
                      </li>
                    ))}
                  </ol>
                )}
                <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-600">
                  {advice.facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </Panel>

              {advice.ai && (
                <Panel title="Timeout call (Gemini wording)">
                  {advice.ai.available ? (
                    <>
                      <p className="text-sm leading-snug">{advice.ai.call}</p>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                        {advice.ai.priorities?.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[11px] text-slate-500">
                        Written by {advice.ai.model} from the lines above only. Any answer with a number that is not in the data is thrown away.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">Not used: {advice.ai.reason}. The advice above is unchanged.</p>
                  )}
                </Panel>
              )}

              <div className="text-[11px] leading-snug text-slate-500">
                {advice.caveats.map((c) => (
                  <p key={c}>{c}</p>
                ))}
              </div>
              <button type="button" onClick={() => window.print()} className="no-print rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white">
                Print or save as PDF
              </button>
            </>
          )}
          {loading && <p className="no-print text-xs text-sky-700">Updating…</p>}
        </div>
      </div>
    </main>
  );
}
