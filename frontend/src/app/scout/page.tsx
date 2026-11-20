"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Cloud9Logo } from "@/components/Cloud9Logo";
import { ScoutMap } from "@/components/scout/ScoutMap";
import { Bar, Chip, EvidenceBar, FieldLabel, Panel, titleCase } from "@/components/scout/ScoutWidgets";
import {
  AttackResult,
  DefenseResult,
  EMPTY_FILTERS,
  OperatorResult,
  ScoutFilters,
  ScoutOptions,
  TeamSummary,
  UtilityResult,
  fetchAttack,
  fetchDefense,
  fetchOperator,
  fetchOptions,
  fetchTeams,
  fetchUtility,
} from "@/lib/scoutApi";

type Mode = "utility" | "operator" | "defense" | "attack";

const SETUP_TIMES = [10, 15, 20];
const ATTACK_TIMES = [20, 30, 45];

const CATEGORY_HINT: Record<string, string> = {
  placeable: "Cypher traps, Killjoy bots/turrets, Vyse walls, Chamber trips, Deadlock sensors",
  recon: "Dart, drone, cam and similar information tools",
  smoke: "Smokes and vision walls",
  stall: "Reactive stall: concussives, slows, walls",
  flash: "Flashes",
  molly: "Damage-over-time utility",
  other: "Everything else",
};

export default function ScoutPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [teamId, setTeamId] = useState<string>("");
  const [options, setOptions] = useState<ScoutOptions | null>(null);
  const [mode, setMode] = useState<Mode>("utility");
  const [filters, setFilters] = useState<ScoutFilters>({ ...EMPTY_FILTERS, side: "defender", categories: ["placeable"] });
  const [util, setUtil] = useState<UtilityResult | null>(null);
  const [op, setOp] = useState<OperatorResult | null>(null);
  const [def, setDef] = useState<DefenseResult | null>(null);
  const [setupAt, setSetupAt] = useState(15);
  const [att, setAtt] = useState<AttackResult | null>(null);
  const [attackAt, setAttackAt] = useState(45);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetchTeams(ac.signal)
      .then((t) => {
        setTeams(t);
        const c9 = t.find((x) => x.name === "Cloud9");
        setTeamId((c9 ?? t[0])?.team_id ?? "");
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
        setFilters((f) => ({ ...f, maps: o.maps[0]?.map ?? "", agents: "", players: "", abilities: [], patches: "" }));
      })
      .catch((e) => !ac.signal.aborted && setError(e.message));
    return () => ac.abort();
  }, [teamId]);

  useEffect(() => {
    if (!teamId || !options) return;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    if ((mode === "defense" || mode === "attack") && !filters.maps) {
      setLoading(false);
      return;
    }
    const run =
      mode === "utility"
        ? fetchUtility(teamId, filters, ac.signal).then(setUtil)
        : mode === "operator"
          ? fetchOperator(teamId, filters, ac.signal).then(setOp)
          : mode === "attack"
            ? fetchAttack(teamId, filters, attackAt, ac.signal).then(setAtt)
            : fetchDefense(teamId, filters, setupAt, ac.signal).then(setDef);
    run
      .catch((e) => !ac.signal.aborted && setError(e.message))
      .finally(() => !ac.signal.aborted && setLoading(false));
    return () => ac.abort();
  }, [teamId, options, mode, filters, setupAt, attackAt]);

  const set = <K extends keyof ScoutFilters>(k: K, v: ScoutFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  // Utility scouting starts from the brief's priority (defensive placeables on one map); the
  // Operator profile starts team-wide so the sample is not accidentally tiny.
  const switchMode = (next: Mode) => {
    setMode(next);
    setFilters((f) =>
      next === "attack"
        ? { ...f, maps: f.maps || options?.maps[0]?.map || "", side: "attacker", categories: [], abilities: [] }
        : next === "defense"
        ? { ...f, maps: f.maps || options?.maps[0]?.map || "", side: "defender", categories: [], abilities: [] }
        : next === "operator"
          ? { ...f, maps: "", side: "", categories: [], abilities: [] }
          : { ...f, maps: f.maps || options?.maps[0]?.map || "", side: f.side || "defender", categories: f.categories.length ? f.categories : ["placeable"] }
    );
  };
  const toggle = (k: "abilities" | "categories", v: string) =>
    setFilters((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));

  const team = teams.find((t) => t.team_id === teamId);
  const maxTiming = useMemo(() => Math.max(1, ...(util?.timing.map((t) => t.casts) ?? [1])), [util]);

  return (
    <main className="c9-bg-ethereal h-screen overflow-y-auto text-slate-800">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-sky-200 bg-white/85 px-5 py-3 backdrop-blur">
        <Cloud9Logo size={44} />
        <div>
          <h1 className="text-lg font-black leading-tight text-sky-900">C9 Oracle · Scout</h1>
          <p className="text-xs text-slate-500">VALORANT utility, Operator, defensive-setup and attack scouting from official GRID match data</p>
        </div>
        <nav className="ml-auto flex items-center gap-2 text-sm">
          <Chip active={mode === "utility"} onClick={() => switchMode("utility")}>
            Utility placement
          </Chip>
          <Chip active={mode === "operator"} onClick={() => switchMode("operator")}>
            Operator profiler
          </Chip>
          <Chip active={mode === "defense"} onClick={() => switchMode("defense")}>
            Defensive setups
          </Chip>
          <Chip active={mode === "attack"} onClick={() => switchMode("attack")}>
            Attack executes
          </Chip>
          <Link
            href="/scout/replay"
            className="rounded-full border border-sky-300 bg-white px-3 py-1 text-xs font-bold text-sky-800"
            title="Round-by-round 2D replay of a match"
          >
            2D replay
          </Link>
          <Link
            href="/scout/timeout"
            className="rounded-full border border-sky-300 bg-white px-3 py-1 text-xs font-bold text-sky-800"
            title="What to adjust at a timeout, from the opponent's behaviour in the current situation"
          >
            Timeout advisor
          </Link>
          {teamId && filters.maps && !filters.maps.includes(",") && (
            <Link
              href={`/scout/card?team=${encodeURIComponent(teamId)}&map=${encodeURIComponent(filters.maps)}`}
              className="rounded-full border border-sky-300 bg-white px-3 py-1 text-xs font-bold text-sky-800"
              title="Printable one-page counter-card for this team and map"
            >
              Counter-card
            </Link>
          )}
          <Link href="/coach" className="ml-3 text-xs font-semibold text-sky-700 underline underline-offset-2">
            Post-match coach
          </Link>
        </nav>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-4 p-4 lg:grid-cols-[300px_minmax(0,1fr)_380px]">
        {/* Filters */}
        <Panel title="Scouting target and filters" className="self-start">
          <FieldLabel>Team</FieldLabel>
          <select
            className="w-full rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-sm"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            aria-label="Team to scout"
          >
            {teams.map((t) => (
              <option key={t.team_id} value={t.team_id}>
                {t.name} ({t.series_count} matches{t.events[0] ? `, ${t.events[0].split(" - ")[0]}` : ""})
              </option>
            ))}
          </select>
          {team?.name.startsWith("Cloud9") && (
            <p className="mt-1 text-[11px] text-sky-700">Self-scouting: these are Cloud9&apos;s own tendencies.</p>
          )}

          <FieldLabel>Map (pick one for the heatmap)</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {mode !== "defense" && mode !== "attack" && (
              <Chip active={filters.maps === ""} onClick={() => set("maps", "")}>
                All
              </Chip>
            )}
            {options?.maps.map((m) => (
              <Chip key={m.map} active={filters.maps === m.map} onClick={() => set("maps", m.map)} title={`${m.rounds} rounds`}>
                {titleCase(m.map)} · {m.rounds}
              </Chip>
            ))}
          </div>

          {mode !== "defense" && mode !== "attack" ? (
            <>
              <FieldLabel>Side</FieldLabel>
              <div className="flex gap-1.5">
                <Chip active={filters.side === ""} onClick={() => set("side", "")}>Both</Chip>
                <Chip active={filters.side === "attacker"} onClick={() => set("side", "attacker")}>Attack</Chip>
                <Chip active={filters.side === "defender"} onClick={() => set("side", "defender")}>Defense</Chip>
              </div>
            </>
          ) : mode === "attack" ? (
            <>
              <FieldLabel>Read the attacker spread at</FieldLabel>
              <div className="flex gap-1.5">
                {ATTACK_TIMES.map((t) => (
                  <Chip key={t} active={attackAt === t} onClick={() => setAttackAt(t)}>
                    ~{t}s
                  </Chip>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Seconds after freezetime ends. Attacking rounds only.</p>
            </>
          ) : (
            <>
              <FieldLabel>Read the setup at</FieldLabel>
              <div className="flex gap-1.5">
                {SETUP_TIMES.map((t) => (
                  <Chip key={t} active={setupAt === t} onClick={() => setSetupAt(t)}>
                    ~{t}s
                  </Chip>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Seconds after freezetime ends. Defender rounds only.</p>
            </>
          )}

          {mode === "utility" && (
            <>
              <FieldLabel>Utility type</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {options?.categories.map((c) => (
                  <Chip key={c} active={filters.categories.includes(c)} onClick={() => toggle("categories", c)} title={CATEGORY_HINT[c]}>
                    {titleCase(c)}
                  </Chip>
                ))}
              </div>
              <FieldLabel>Specific ability</FieldLabel>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {options?.abilities.slice(0, 24).map((a) => (
                  <Chip key={a.ability} active={filters.abilities.includes(a.ability)} onClick={() => toggle("abilities", a.ability)} title={`${a.casts} casts`}>
                    {titleCase(a.ability)}
                  </Chip>
                ))}
              </div>
            </>
          )}

          <FieldLabel>Agent</FieldLabel>
          <select className="w-full rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-sm" value={filters.agents} onChange={(e) => set("agents", e.target.value)} aria-label="Agent">
            <option value="">Any agent</option>
            {options?.agents.map((a) => (
              <option key={a.agent} value={a.agent}>
                {titleCase(a.agent)} ({a.rounds} rounds)
              </option>
            ))}
          </select>

          <FieldLabel>Player</FieldLabel>
          <select className="w-full rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-sm" value={filters.players} onChange={(e) => set("players", e.target.value)} aria-label="Player">
            <option value="">Any player</option>
            {options?.players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.rounds} rounds)
              </option>
            ))}
          </select>

          <FieldLabel>Patch</FieldLabel>
          <select className="w-full rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-sm" value={filters.patches} onChange={(e) => set("patches", e.target.value)} aria-label="Patch">
            <option value="">Any patch</option>
            {options?.patches.map((p) => (
              <option key={p.patch} value={p.patch}>
                {p.patch} ({p.rounds} rounds)
              </option>
            ))}
          </select>

          <FieldLabel>Recent form</FieldLabel>
          <select className="w-full rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-sm" value={filters.lastN} onChange={(e) => set("lastN", e.target.value ? Number(e.target.value) : "")} aria-label="Matches to include">
            <option value="">All matches</option>
            <option value="3">Last 3 matches</option>
            <option value="5">Last 5 matches</option>
            <option value="10">Last 10 matches</option>
          </select>

          <label className="mt-3 flex items-start gap-2 text-xs text-slate-600">
            <input type="checkbox" className="mt-0.5" checked={filters.excludeLowRate} onChange={(e) => set("excludeLowRate", e.target.checked)} />
            <span>Exclude VCT Americas 2025 (positions sampled once per second, so less precise)</span>
          </label>
          <button type="button" className="mt-3 text-xs font-semibold text-sky-700 underline" onClick={() => setFilters({ ...EMPTY_FILTERS, maps: options?.maps[0]?.map ?? "" })}>
            Reset filters
          </button>
          {options && (
            <p className="mt-3 text-[11px] text-slate-500">
              {options.series} matches, {options.rounds} rounds in the dataset for this team ({options.date_range[0]?.slice(0, 10)} to {options.date_range[1]?.slice(0, 10)}).
            </p>
          )}
        </Panel>

        {/* Map + evidence */}
        <div className="min-w-0 space-y-3">
          {error && <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-800">{error}</div>}

          {mode === "utility" && util && (
            <>
              <EvidenceBar
                confidence={util.evidence.confidence}
                items={[
                  { label: "rounds analyzed", value: util.evidence.rounds_analyzed },
                  { label: "matches", value: util.evidence.series },
                  { label: "casts", value: util.evidence.casts },
                  { label: `rounds with the event (${util.evidence.rounds_with_event_pct}%)`, value: util.evidence.rounds_with_event },
                ]}
              />
              <ScoutMap
                map={util.map}
                points={util.points}
                hotspots={util.hotspots}
                caption="Where this team casts the selected utility. Position is where the caster stood, not where the ability landed."
              />
            </>
          )}

          {mode === "operator" && op && (
            <>
              <EvidenceBar
                confidence={op.evidence.confidence}
                items={[
                  { label: "rounds analyzed", value: op.evidence.rounds_analyzed },
                  { label: "matches", value: op.evidence.series },
                  { label: `rounds with an Operator (${op.evidence.rounds_with_operator_pct}%)`, value: op.evidence.rounds_with_operator },
                  { label: "Operator kills", value: op.evidence.operator_kills },
                ]}
              />
              {op.map ? (
                <ScoutMap map={op.map} points={op.points} hotspots={op.hotspots} caption="Where Operator kills were made from (killer position)." />
              ) : (
                <Panel title="Operator rounds by map (pick a map on the left for the kill heatmap)">
                  {op.by_map.map((m) => (
                    <Bar key={m.map} label={`${titleCase(m.map)} (${m.with_op}/${m.rounds} rounds)`} value={m.pct} max={Math.max(1, ...op.by_map.map((x) => x.pct))} suffix="%" />
                  ))}
                </Panel>
              )}
            </>
          )}
          {(mode === "defense" || mode === "attack") && !filters.maps && (
            <Panel title="Pick one map">Setups and executes are map-specific. Choose a map on the left.</Panel>
          )}
          {mode === "attack" && att && filters.maps && (
            <>
              <EvidenceBar
                confidence={att.evidence.confidence}
                items={[
                  { label: "attacking rounds", value: att.evidence.rounds_analyzed },
                  { label: `rounds with a plant (${att.evidence.plant_pct}%)`, value: att.evidence.rounds_planted },
                  { label: "matches", value: att.evidence.series },
                  { label: "attack round win rate", value: `${att.evidence.attack_win_pct}%` },
                ]}
              />
              <ScoutMap
                map={att.map}
                points={att.points}
                hotspots={att.sites.map((s, i) => ({
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
                caption="Each dot is where the spike was planted. Numbered markers are the sites (Site 1, 2, 3), found from plant positions across the dataset."
              />
            </>
          )}
          {mode === "defense" && def && filters.maps && (
            <>
              <EvidenceBar
                confidence={def.evidence.confidence}
                items={[
                  { label: "defender rounds", value: def.evidence.rounds_analyzed },
                  { label: `rounds with a setup read (${def.evidence.rounds_with_setup_pct}%)`, value: def.evidence.rounds_with_setup },
                  { label: "matches", value: def.evidence.series },
                  { label: "defense round win rate", value: `${def.evidence.defense_win_pct}%` },
                ]}
              />
              <ScoutMap
                map={def.map}
                points={def.points}
                hotspots={def.sites.map((s, i) => ({
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
                caption={`Where defenders stand ~${def.snapshot_seconds}s after freezetime. Numbered markers are the sites (Site 1, 2, 3), found from where attackers plant the spike.`}
              />
            </>
          )}
          {loading && <p className="text-xs text-sky-700">Updating…</p>}
        </div>

        {/* Insights */}
        <div className="space-y-4 self-start">
          {mode === "utility" && util && (
            <>
              <Panel title="Data-backed insights">
                <ul className="list-disc space-y-2 pl-4 text-sm leading-snug">
                  {util.insights.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </Panel>
              {util.counter_notes.length > 0 && (
                <Panel title="Counter-play suggestions for Cloud9">
                  <ul className="list-disc space-y-2 pl-4 text-sm leading-snug">
                    {util.counter_notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </Panel>
              )}
              <Panel title="When it happens (seconds into round)">
                {util.timing.map((t) => (
                  <Bar key={t.bucket_start} label={`${t.bucket_start}-${t.bucket_start + 10}s`} value={t.casts} max={maxTiming} />
                ))}
              </Panel>
              <Panel title="Who and what">
                {util.by_player.slice(0, 5).map((p) => (
                  <Bar key={p.player} label={p.player} value={p.casts} max={util.by_player[0]?.casts ?? 1} />
                ))}
                <div className="my-2 border-t border-sky-100" />
                {util.by_ability.slice(0, 6).map((a) => (
                  <Bar key={a.ability} label={titleCase(a.ability)} value={a.casts} max={util.by_ability[0]?.casts ?? 1} />
                ))}
              </Panel>
            </>
          )}

          {mode === "defense" && def && filters.maps && (
            <>
              <Panel title="Data-backed insights">
                <ul className="list-disc space-y-2 pl-4 text-sm leading-snug">
                  {def.insights.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </Panel>
              {def.counter_notes.length > 0 && (
                <Panel title="Counter-play suggestions">
                  <ul className="list-disc space-y-2 pl-4 text-sm leading-snug">
                    {def.counter_notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </Panel>
              )}
              <Panel title="Setups and how they went">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-sky-800/70">
                      <th className="pb-1">Setup</th>
                      <th className="pb-1">Rounds</th>
                      <th className="pb-1">Won</th>
                    </tr>
                  </thead>
                  <tbody>
                    {def.setups.slice(0, 8).map((s) => (
                      <tr key={s.key} className="border-t border-sky-100">
                        <td className="py-1 font-semibold">{s.label}</td>
                        <td className="tabular-nums">
                          {s.rounds} ({s.share_pct}%)
                        </td>
                        <td className="tabular-nums">{s.win_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-slate-500">Exact splits are fragmented on small samples. The next table pools them per site.</p>
              </Panel>
              <Panel title="Defenders on a zone vs round win rate">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-sky-800/70">
                      <th className="pb-1">Zone</th>
                      {["0", "1", "2", "3+"].map((n) => (
                        <th key={n} className="pb-1">
                          {n}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {def.site_load.map((sl) => (
                      <tr key={sl.zone} className="border-t border-sky-100">
                        <td className="py-1 font-semibold">{sl.name}</td>
                        {sl.rows.map((r) => (
                          <td key={r.defenders} className="tabular-nums" title={`${r.rounds} rounds`}>
                            {r.rounds ? `${Math.round(r.win_pct)}%` : "–"}
                            <span className="text-slate-400"> ({r.rounds})</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-slate-500">
                  Descriptive only: round win rate with that many defenders on the zone at the chosen time, rounds in brackets. Small cells are noise.
                </p>
              </Panel>
              <Panel title="Who stands where">
                <table className="w-full text-left text-xs">
                  <tbody>
                    {def.players.map((p) => (
                      <tr key={p.id} className="border-t border-sky-100 align-top">
                        <td className="py-1 font-semibold">
                          {p.name}
                          {p.main_agent ? <span className="font-normal text-slate-500"> · {titleCase(p.main_agent)}</span> : null}
                        </td>
                        <td className="py-1 tabular-nums">
                          {p.zones.map((z) => (
                            <div key={z.zone}>
                              {def.sites.find((x) => x.id === z.zone)?.name ?? "Mid / other"} {z.pct}%
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </>
          )}

          {mode === "attack" && att && filters.maps && (
            <>
              <Panel title="Data-backed insights">
                <ul className="list-disc space-y-2 pl-4 text-sm leading-snug">
                  {att.insights.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </Panel>
              {att.counter_notes.length > 0 && (
                <Panel title="Counter-play suggestions">
                  <ul className="list-disc space-y-2 pl-4 text-sm leading-snug">
                    {att.counter_notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </Panel>
              )}
              <Panel title="Where they plant">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-sky-800/70">
                      <th className="pb-1">Site</th>
                      <th className="pb-1">Rounds</th>
                      <th className="pb-1">Plant at</th>
                      <th className="pb-1">Won</th>
                    </tr>
                  </thead>
                  <tbody>
                    {att.targets.map((t) => (
                      <tr key={t.zone} className="border-t border-sky-100 align-top">
                        <td className="py-1 font-semibold">
                          {t.name}
                          <div className="font-normal text-slate-500">
                            ~{t.avg_utility} abilities before plant
                            {t.top_abilities.slice(0, 2).map((a) => ` · ${titleCase(a.ability)} ${a.per_round}`)}
                          </div>
                        </td>
                        <td className="tabular-nums">
                          {t.rounds} ({t.share_pct}%)
                        </td>
                        <td className="tabular-nums">{t.median_plant_t}s</td>
                        <td className="tabular-nums">{t.win_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-slate-500">
                  {att.no_plant.rounds} rounds had no plant (won {att.no_plant.win_pct}%). Win rate after a plant is naturally high, so compare sites with each other, not with the team average.
                </p>
              </Panel>
              <Panel title="Pace of the plant">
                <table className="w-full text-left text-xs">
                  <tbody>
                    {att.pace.map((p) => (
                      <tr key={p.pace} className="border-t border-sky-100">
                        <td className="py-1 font-semibold">{p.label}</td>
                        <td className="tabular-nums">
                          {p.rounds} ({p.share_pct}%)
                        </td>
                        <td className="tabular-nums">{p.win_pct}% won</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
              <Panel title={`Attacker spread at ~${att.snapshot_seconds}s`}>
                <table className="w-full text-left text-xs">
                  <tbody>
                    {att.leans.slice(0, 8).map((l) => (
                      <tr key={l.key} className="border-t border-sky-100 align-top">
                        <td className="py-1 font-semibold">{l.label}</td>
                        <td className="tabular-nums">
                          {l.rounds} ({l.share_pct}%)
                          <div className="text-slate-500">{l.planted_on.map((x) => `${x.name} ${x.pct}%`).join(", ")}</div>
                        </td>
                        <td className="tabular-nums">{l.win_pct}% won</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-slate-500">
                  Players within 45 m of a site count toward it; the rest are uncommitted. The line under each shows where that spread went on to plant.
                </p>
              </Panel>
              <Panel title="Who plants">
                <table className="w-full text-left text-xs">
                  <tbody>
                    {att.planters.map((p) => (
                      <tr key={p.id} className="border-t border-sky-100">
                        <td className="py-1 font-semibold">
                          {p.name}
                          {p.main_agent ? <span className="font-normal text-slate-500"> · {titleCase(p.main_agent)}</span> : null}
                        </td>
                        <td className="tabular-nums">
                          {p.plants} ({p.share_pct}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </>
          )}

          {mode === "operator" && op && (
            <>
              <Panel title="Data-backed insights">
                <ul className="list-disc space-y-2 pl-4 text-sm leading-snug">
                  {op.insights.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </Panel>
              {op.counter_notes.length > 0 && (
                <Panel title="Counter-play suggestions for Cloud9">
                  <ul className="list-disc space-y-2 pl-4 text-sm leading-snug">
                    {op.counter_notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </Panel>
              )}
              <Panel title="Operator rounds by side">
                {Object.entries(op.by_side).map(([side, v]) => (
                  <Bar key={side} label={`${titleCase(side)} (${v.with_op}/${v.rounds} rounds)`} value={v.pct} max={100} suffix="%" />
                ))}
              </Panel>
              <Panel title="Who holds it">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-sky-800/70">
                      <th className="pb-1">Player</th>
                      <th className="pb-1">Op rounds</th>
                      <th className="pb-1">Share</th>
                      <th className="pb-1">Kills</th>
                    </tr>
                  </thead>
                  <tbody>
                    {op.players.slice(0, 6).map((p) => (
                      <tr key={p.id} className="border-t border-sky-100">
                        <td className="py-1 font-semibold">
                          {p.name}
                          {p.main_op_agent ? <span className="font-normal text-slate-500"> · {titleCase(p.main_op_agent)}</span> : null}
                        </td>
                        <td className="tabular-nums">
                          {p.op_rounds}/{p.rounds_played}
                        </td>
                        <td className="tabular-nums">{p.op_share_of_team_op_rounds_pct}%</td>
                        <td className="tabular-nums">{p.op_kills}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
              {op.evidence.operator_kills > 0 && (
                <Panel title="Operator kills by player">
                  {[...op.players]
                    .filter((p) => p.op_kills > 0)
                    .sort((a, b) => b.op_kills - a.op_kills)
                    .map((p) => (
                      <Bar
                        key={p.id}
                        label={`${p.name} (${p.op_rounds} Operator rounds, ${p.op_rounds ? (p.op_kills / p.op_rounds).toFixed(2) : "–"} kills each)`}
                        value={p.op_kills}
                        max={Math.max(1, ...op.players.map((x) => x.op_kills))}
                      />
                    ))}
                  <p className="mt-2 text-[11px] text-slate-500">
                    Operator rounds are counted from each player&apos;s start-of-round inventory. A kill can also come from an Operator
                    picked up mid-round, so kills per round can exceed what the round count suggests.
                  </p>
                </Panel>
              )}
              {op.by_buy.length > 0 && (
                <Panel title="Operator by buy type">
                  {op.by_buy.map((b) => (
                    <Bar
                      key={b.buy}
                      label={`${titleCase(b.buy)} (${b.with_op}/${b.rounds} rounds)`}
                      value={b.pct}
                      max={100}
                      suffix="%"
                      hint={`${b.op_kills} kills`}
                    />
                  ))}
                </Panel>
              )}
              <Panel title="Operator kill timing">
                {op.kill_timing.map((b) => (
                  <Bar key={b.bucket} label={b.bucket} value={b.pct} max={100} suffix="%" hint={`${b.kills} kills`} />
                ))}
                {op.kill_distance_from_spawn_m.median != null && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Median kill is {op.kill_distance_from_spawn_m.median} m from the round-start position (n={op.kill_distance_from_spawn_m.n}).
                  </p>
                )}
              </Panel>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
