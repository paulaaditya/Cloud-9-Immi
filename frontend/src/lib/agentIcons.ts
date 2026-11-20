"use client";

import { useEffect, useState } from "react";

/**
 * Agent portraits come from the community API at valorant-api.com, loaded by the browser at runtime. They are
 * Riot's artwork, so they are linked rather than copied into this repository. If the request fails (offline,
 * blocked) the callers fall back to the agent's initials.
 */
const AGENTS_URL = "https://valorant-api.com/v1/agents?isPlayableCharacter=true";
const STORAGE_KEY = "c9-agent-icons-v1";

export type AgentIcons = Record<string, string>;

/** 'KAY/O', 'kay/o' and 'kayo' all become 'kayo'. */
export function normalizeAgent(name: string | null | undefined): string {
  return (name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseAgents(payload: unknown): AgentIcons {
  const out: AgentIcons = {};
  const data = (payload as { data?: unknown })?.data;
  if (!Array.isArray(data)) return out;
  for (const a of data as { displayName?: string; displayIconSmall?: string; displayIcon?: string }[]) {
    const url = a.displayIconSmall || a.displayIcon;
    if (a.displayName && url) out[normalizeAgent(a.displayName)] = url;
  }
  return out;
}

let inflight: Promise<AgentIcons> | null = null;

export function loadAgentIcons(): Promise<AgentIcons> {
  try {
    const cached = window.sessionStorage.getItem(STORAGE_KEY);
    if (cached) return Promise.resolve(JSON.parse(cached) as AgentIcons);
  } catch {
    /* storage unavailable: fetch instead */
  }
  if (!inflight) {
    inflight = fetch(AGENTS_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => {
        const icons = parseAgents(j);
        try {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(icons));
        } catch {
          /* ignore */
        }
        return icons;
      })
      .catch(() => {
        inflight = null;
        return {} as AgentIcons;
      });
  }
  return inflight;
}

export function useAgentIcons(): AgentIcons {
  const [icons, setIcons] = useState<AgentIcons>({});
  useEffect(() => {
    let live = true;
    loadAgentIcons().then((i) => live && setIcons(i));
    return () => {
      live = false;
    };
  }, []);
  return icons;
}

/** Load the icon images for canvas drawing. Returns a map of normalised agent name to a loaded image. */
export function preloadImages(icons: AgentIcons, agents: string[], onLoad: () => void): Record<string, HTMLImageElement> {
  const out: Record<string, HTMLImageElement> = {};
  for (const a of new Set(agents.map(normalizeAgent))) {
    const url = icons[a];
    if (!a || !url) continue;
    const im = new Image();
    im.onload = onLoad;
    im.src = url;
    out[a] = im;
  }
  return out;
}
