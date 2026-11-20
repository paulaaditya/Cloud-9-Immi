"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Cloud9Logo } from "@/components/Cloud9Logo";
import { MAP_SIZE, isTrustedMap, toPixel } from "@/components/scout/ScoutMap";
import { Chip, Panel, titleCase } from "@/components/scout/ScoutWidgets";
import { ReplayData, ReplayRound, SeriesRow, TeamSummary, fetchReplay, fetchSeries, fetchTeams } from "@/lib/scoutApi";
import { clock, dotsAt, normalise } from "@/lib/replayMath";

const TEAM_COLORS = ["#0ea5e9", "#f43f5e"];
const SPEEDS = [1, 2, 4, 8];
const KILL_LINE_SECONDS = 2.5;
const END_LABEL: Record<string, string> = { elimination: "Elim", detonation: "Boom", defuse: "Defuse", time: "Time", unknown: "?" };

function Viewer({ rep }: { rep: ReplayData }) {
  const teamIds = useMemo(() => Object.keys(rep.teams), [rep]);
  const colorOf = useCallback((tid: string) => TEAM_COLORS[Math.max(0, teamIds.indexOf(tid)) % 2], [teamIds]);
  const [roundN, setRoundN] = useState(1);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const round: ReplayRound = rep.rounds.find((r) => r.n === roundN) ?? rep.rounds[0];
  const players = useMemo(() => Object.fromEntries(round.players.map((p) => [p.id, p])), [round]);
  const trusted = isTrustedMap(rep.map);

  useEffect(() => {
    setRoundN(rep.rounds[0]?.n ?? 1);
  }, [rep]);
  // Selecting a round (or opening a match) starts it playing from the start of the live round.
  useEffect(() => {
    setT(0);
    setPlaying(true);
  }, [roundN, rep]);

  useEffect(() => {
    setImg(null);
    if (!trusted) return;
    const im = new Image();
    im.onload = () => setImg(im);
    im.src = `/maps/${rep.map}.png`;
  }, [rep.map, trusted]);

  // Playback clock (a timer, not requestAnimationFrame, so it keeps running in background tabs).
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      setT((cur) => Math.min(round.duration, cur + dt * speed));
    }, 40);
    return () => window.clearInterval(id);
  }, [playing, speed, round.duration]);

  useEffect(() => {
    if (playing && t >= round.duration) setPlaying(false);
  }, [playing, t, round.duration]);

  // Draw the map, the players and the recent kills.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const px = (x: number, y: number): [number, number] | null => {
      const n = normalise(rep.bounds, x, y);
      return n ? toPixel(rep.map, n[0], n[1]) : null;
    };
    ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
    if (img) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(img, 0, 0, MAP_SIZE, MAP_SIZE);
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = "rgba(148,163,184,0.2)";
      for (let g = 0; g <= MAP_SIZE; g += MAP_SIZE / 10) {
        ctx.beginPath();
        ctx.moveTo(g, 0);
        ctx.lineTo(g, MAP_SIZE);
        ctx.moveTo(0, g);
        ctx.lineTo(MAP_SIZE, g);
        ctx.stroke();
      }
    }

    if (round.plant && t >= round.plant.t) {
      const p = px(round.plant.x, round.plant.y);
      if (p) {
        ctx.fillStyle = "#facc15";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.rect(p[0] - 9, p[1] - 9, 18, 18);
        ctx.fill();
        ctx.stroke();
      }
    }

    for (const k of round.kills) {
      if (t < k.t || t > k.t + KILL_LINE_SECONDS || k.kx == null || k.ky == null || k.vx == null || k.vy == null) continue;
      const a = px(k.kx, k.ky);
      const b = px(k.vx, k.vy);
      if (!a || !b) continue;
      ctx.strokeStyle = colorOf(k.ktid);
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1 - (t - k.t) / KILL_LINE_SECONDS;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const d of dotsAt(round, t)) {
      const p = px(d.xy[0], d.xy[1]);
      const info = players[d.id];
      if (!p || !info) continue;
      const color = colorOf(info.tid);
      if (d.alive) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 13, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "800 12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((info.agent || info.name || "?").slice(0, 2).toUpperCase(), p[0], p[1] + 1);
      } else {
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p[0] - 7, p[1] - 7);
        ctx.lineTo(p[0] + 7, p[1] + 7);
        ctx.moveTo(p[0] + 7, p[1] - 7);
        ctx.lineTo(p[0] - 7, p[1] + 7);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }, [rep, round, t, img, players, colorOf]);

  const winnerName = round.winner ? rep.teams[round.winner] : null;
  const kills = [...round.kills].sort((a, b) => a.t - b.t);
  const noTrack = round.frames.length < 2;

  return (
    <div className="space-y-3">
      {/* Round strip */}
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Rounds">
        {rep.rounds.map((r) => (
          <button
            key={r.n}
            type="button"
            role="tab"
            aria-selected={r.n === round.n}
            onClick={() => setRoundN(r.n)}
            title={`Round ${r.n}: ${r.winner ? rep.teams[r.winner] : "?"} won (${r.end.type}, inferred)`}
            className={`h-9 w-9 rounded-md border text-[11px] font-bold leading-none text-white ${r.n === round.n ? "ring-2 ring-sky-900" : ""}`}
            style={{ background: r.winner ? colorOf(r.winner) : "#94a3b8", borderColor: "rgba(255,255,255,0.6)" }}
          >
            {r.n}
            <span className="block text-[8px] font-semibold opacity-90">{END_LABEL[r.end.type]}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">
        <span style={{ color: TEAM_COLORS[0] }}>■</span> {rep.teams[teamIds[0]]} <span style={{ color: TEAM_COLORS[1] }}>■</span> {rep.teams[teamIds[1]]} · How a round ended is inferred from the plant, the
        winner and who died, since the feed does not keep it.
      </p>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <canvas ref={canvasRef} width={MAP_SIZE} height={MAP_SIZE} className="h-auto w-full rounded-xl border border-slate-700 bg-slate-900" aria-label={`2D replay of round ${round.n} on ${rep.map}`} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setPlaying((p) => !p)} className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-bold text-white">
              {playing ? "Pause" : t >= round.duration ? "Replay" : "Play"}
            </button>
            <input
              type="range"
              min={0}
              max={Math.max(1, round.duration)}
              step={0.1}
              value={t}
              onChange={(e) => {
                setPlaying(false);
                setT(Number(e.target.value));
              }}
              className="min-w-[160px] flex-1"
              aria-label="Round time"
            />
            <span className="w-24 text-right text-sm tabular-nums">
              {clock(t)} / {clock(round.duration)}
            </span>
            <div className="flex gap-1">
              {SPEEDS.map((s) => (
                <Chip key={s} active={speed === s} onClick={() => setSpeed(s)}>
                  {s}x
                </Chip>
              ))}
            </div>
          </div>
          {noTrack && <p className="mt-1 text-xs text-amber-700">Few position samples for this round, so players may not move smoothly.</p>}
          {!trusted && <p className="mt-1 text-xs text-slate-500">Radar image is not validated for this map, so a plain grid is shown.</p>}
          <p className="mt-1 text-[11px] text-slate-500">Positions come from game events, so movement is smooth in fights and estimated in quiet stretches. Yellow square: spike plant. Lines: kills.</p>
        </div>

        <div className="space-y-3">
          <Panel title={`Round ${round.n}${winnerName ? ` · ${winnerName} won` : ""}`}>
            <ul className="divide-y divide-sky-100 text-xs">
              {kills.length === 0 && <li className="py-1 text-slate-500">No kills recorded.</li>}
              {kills.map((k) => {
                const killer = players[k.kid];
                const victim = players[k.vid];
                const live = t >= k.t;
                return (
                  <li key={`${k.t}-${k.vid}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setPlaying(false);
                        setT(Math.max(0, k.t - 1));
                      }}
                      className={`flex w-full items-center gap-2 py-1 text-left ${live ? "" : "opacity-45"}`}
                    >
                      <span className="w-9 tabular-nums text-slate-500">{clock(k.t)}</span>
                      <span className="font-bold" style={{ color: colorOf(k.ktid) }}>
                        {killer?.name ?? "?"}
                      </span>
                      <span className="text-slate-500">{k.weapon ? titleCase(k.weapon) : "kill"}</span>
                      <span className="font-bold" style={{ color: colorOf(k.vtid) }}>
                        {victim?.name ?? "?"}
                      </span>
                      {k.first && <span className="ml-auto rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800">FIRST</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title="Economy">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-sky-800/70">
                  <th className="pb-1">Player</th>
                  <th className="pb-1">Loadout</th>
                  <th className="pb-1">Credits</th>
                </tr>
              </thead>
              <tbody>
                {[...round.players]
                  .sort((a, b) => teamIds.indexOf(a.tid) - teamIds.indexOf(b.tid))
                  .map((p) => (
                    <tr key={p.id} className="border-t border-sky-100">
                      <td className="py-1 font-semibold" style={{ color: colorOf(p.tid) }}>
                        {p.name}
                        <span className="font-normal text-slate-500"> {titleCase(p.agent || "")}</span>
                        <div className="font-normal text-slate-500">{p.weapons.map(titleCase).join(", ") || "none"}</div>
                      </td>
                      <td className="tabular-nums">{p.loadout ?? "–"}</td>
                      <td className="tabular-nums">{p.money ?? "–"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function ReplayPage() {
  const router = useRouter();
  const params = useSearchParams();
  const seriesId = params.get("series") ?? "";
  const gameId = params.get("game") ?? "";
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [teamId, setTeamId] = useState(params.get("team") ?? "");
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [rep, setRep] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetchTeams(ac.signal)
      .then((t) => {
        setTeams(t);
        setTeamId((cur) => cur || (t.find((x) => x.name === "Cloud9") ?? t[0])?.team_id || "");
      })
      .catch((e) => !ac.signal.aborted && setError(`Could not reach the API (${e.message}). Start the backend on port 8000.`));
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (!teamId) return;
    const ac = new AbortController();
    fetchSeries(teamId, ac.signal)
      .then(setSeries)
      .catch((e) => !ac.signal.aborted && setError(e.message));
    return () => ac.abort();
  }, [teamId]);

  useEffect(() => {
    if (!seriesId || !gameId) {
      setRep(null);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetchReplay(seriesId, gameId, ac.signal)
      .then(setRep)
      .catch((e) => !ac.signal.aborted && setError(e.message))
      .finally(() => !ac.signal.aborted && setLoading(false));
    return () => ac.abort();
  }, [seriesId, gameId]);

  const open = (sid: string, gid: string) => router.push(`/scout/replay?team=${encodeURIComponent(teamId)}&series=${sid}&game=${gid}`);

  return (
    <main className="c9-bg-ethereal h-screen overflow-y-auto print:h-auto print:overflow-visible text-slate-800">
      <header className="flex flex-wrap items-center gap-3 border-b border-sky-200 bg-white/85 px-5 py-3">
        <Cloud9Logo size={44} />
        <div>
          <h1 className="text-lg font-black leading-tight text-sky-900">C9 Oracle · 2D replay</h1>
          <p className="text-xs text-slate-500">Round-by-round positions, kills and economy from official GRID data</p>
        </div>
        <Link href="/scout" className="ml-auto text-xs font-semibold text-sky-700 underline underline-offset-2">
          Back to Scout
        </Link>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-4 p-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Panel title="Pick a match" className="self-start">
          <select className="w-full rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-sm" value={teamId} onChange={(e) => setTeamId(e.target.value)} aria-label="Team">
            {teams.map((t) => (
              <option key={t.team_id} value={t.team_id}>
                {t.name} ({t.series_count} matches)
              </option>
            ))}
          </select>
          <ul className="mt-3 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {series.map((s) => (
              <li key={s.series_id} className="rounded-lg border border-sky-200 bg-white p-2">
                <div className="text-xs font-bold text-slate-900">{s.teams}</div>
                <div className="text-[11px] text-slate-500">
                  {s.date.slice(0, 10)} · {s.event}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {s.games.map((g) => (
                    <Chip key={g.game_id} active={s.series_id === seriesId && g.game_id === gameId} onClick={() => open(s.series_id, g.game_id)} title={g.winner ? `${g.winner} won` : ""}>
                      {titleCase(g.map)}
                    </Chip>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <div>
          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {loading && <p className="text-sm text-sky-700">Loading replay… the first time a match is opened it is read from the data files and can take a few seconds.</p>}
          {!rep && !loading && !error && <Panel title="No match selected">Choose a match and map on the left to replay it.</Panel>}
          {rep && !loading && <Viewer rep={rep} />}
        </div>
      </div>
    </main>
  );
}

export default function ReplayRoute() {
  return (
    <Suspense fallback={<p className="p-6 text-sm">Loading…</p>}>
      <ReplayPage />
    </Suspense>
  );
}
