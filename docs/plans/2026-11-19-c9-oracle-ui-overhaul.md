# C9 Oracle: UI/UX Overhaul, Player Name Resolution, and Map Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul C9 Oracle with a Cloud9 glassmorphism full-screen esports dashboard, real pro player names from the metadata tables, official Valorant radar map canvas rendering, multi-game/series switching, and humanized tactical coaching advice.

**Architecture:** 
- Backend: Update `src/data/metadata.py` to index `meta/players.csv`, `meta/rosters.csv`, and `meta/characters.csv`. Update `parser.py` and `mistake_detector.py` to populate `player_name` and produce un-slopped, coach-style tactical debriefs. Add `/api/v1/series-list` to list available Cloud9 and marquee VCT series.
- Frontend: Redesign `page.tsx`, `MinimapReplay.tsx`, `PlayerReportCards.tsx`, and `DrillPrescriptions.tsx` into a full-screen (`h-screen overflow-hidden`) glassmorphism layout with Cloud9 branding (`#00aeef`), interactive round pills, play/pause round simulation, real radar map background from `/maps/*.png`, and multi-series/game swapping.

**Tech Stack:** FastAPI, Pydantic v2, Python 3.11, Next.js 15, TypeScript, Tailwind CSS, HTML5 Canvas, Zustand.

## Global Constraints

- No emojis anywhere in code, comments, or UI.
- Never commit data files (`.zst`, `.jsonl`, `.parquet`) to Git.
- Full viewport height (`h-screen overflow-hidden`) with zero body scrollbars.
- Cloud9 brand identity: `#00aeef` (C9 cyan), `#050c18` (deep navy background), translucent glass cards (`backdrop-blur-xl border-white/10`).
- Advice text must follow the `unslop` guidelines: punchy, tactical, natural esports coaching feedback without generic filler or machine jargon.

---

### Task 1: Player Metadata Indexer & Series Catalog API

**Files:**
- Create: `c9-oracle/backend/src/data/metadata.py`
- Modify: `c9-oracle/backend/src/models/match_state.py`
- Modify: `c9-oracle/backend/src/analytics/mistake_detector.py`
- Modify: `c9-oracle/backend/src/coaching/report_card.py`
- Modify: `c9-oracle/backend/src/api/routes.py`
- Test: `c9-oracle/backend/tests/test_metadata.py`

**Interfaces:**
- Consumes: `meta/players.csv`, `meta/rosters.csv`, `val/series.csv`
- Produces: 
  - `get_player_name(player_id: str) -> str`
  - `get_series_roster(series_id: str) -> Dict[str, Dict[str, str]]`
  - GET `/api/v1/featured-series` returning list of series metadata with team names and event info

- [ ] **Step 1: Write failing test for metadata lookup and series catalog**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement metadata indexer and updated Pydantic models with player_name**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 2: Humanized Tactical Coaching Advice Engine

**Files:**
- Modify: `c9-oracle/backend/src/analytics/mistake_detector.py`
- Modify: `c9-oracle/backend/src/coaching/prescription.py`
- Test: `c9-oracle/backend/tests/test_unslop_coaching.py`

**Interfaces:**
- Consumes: Round kill telemetry, player names, agent names
- Produces: Natural, actionable tactical debriefs (e.g. "Derrek died dry-peeking A Main 14s into round with zero support utility. Left team in 4v5 retake.") and realistic scrim drill setups.

- [ ] **Step 1: Write test for humanized coaching feedback**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement punchy tactical debrief generation**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 3: 2D Radar Canvas with Official Valorant Maps & Interactive Coordinates

**Files:**
- Modify: `c9-oracle/frontend/src/components/MinimapReplay.tsx`
- Test: `c9-oracle/frontend/src/components/MinimapReplay.test.tsx`

**Interfaces:**
- Props: `mapName: string`, `currentRound: number`, `mistakes: AttributedMistake[]`, `kills: KillEvent[]`, `onRoundChange`, `selectedPlayerId?: string`
- Renders:
  - Real radar map image (`/maps/ascent.png`, `/maps/bind.png`, etc.)
  - Coordinate scaling from game coordinates to canvas
  - Dynamic kill lines, trade indicators, and mistake callout pins
  - Interactive round pills (R1 to R24) with win/loss color indicators
  - Play/Pause animation button

- [ ] **Step 1: Write unit test for radar image rendering and round pills**
- [ ] **Step 2: Implement radar canvas and interactive controls**
- [ ] **Step 3: Run test to verify it passes**
- [ ] **Step 4: Commit changes**

---

### Task 4: Full-Screen Cloud9 Glassmorphism Dashboard with Game/Series Switching

**Files:**
- Modify: `c9-oracle/frontend/src/types/api.ts`
- Modify: `c9-oracle/frontend/src/components/PlayerReportCards.tsx`
- Modify: `c9-oracle/frontend/src/components/DrillPrescriptions.tsx`
- Modify: `c9-oracle/frontend/src/app/page.tsx`
- Modify: `c9-oracle/frontend/src/app/globals.css`

**Interfaces:**
- Full viewport `h-screen w-screen overflow-hidden` layout
- Top bar with Cloud9 branding, Series switcher dropdown (NRG vs C9, C9 vs G2, EG vs LOUD), and Map/Game switcher tabs
- Glassmorphism panels with backdrop blur and C9 cyan glow
- Interactive player selection filtering minimap to that player's actions

- [ ] **Step 1: Update API types and component props**
- [ ] **Step 2: Implement full-screen glassmorphism layout and interactive controls**
- [ ] **Step 3: Run frontend tests and verify build**
- [ ] **Step 4: Commit changes**
