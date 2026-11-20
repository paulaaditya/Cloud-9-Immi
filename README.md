# C9 Oracle: VALORANT Anti-Strat Scouting Engine

C9 Oracle is a scouting tool built for the Cloud9 x JetBrains "Sky's the Limit" 2026 Hackathon, Category 1 (VAL/GC): Tactical Scouting, Utility Placement & Operator Profiler. It reads the official GRID match feeds and turns an opponent's habits into a one-page counter-card a coach can print. It has two parts:

- **Scout** (`/scout`): the scouting engine described below, with the sample size shown on every result.
- **Post-match coach** (`/`): the original xRW win-probability and micro-mistake analysis, usable for self-scouting. It is described in the second half of this file.

### Scout: what it answers

Scout reads the GRID feeds and ability supplements for all 857 VALORANT series (1.4 million casts) and answers coach-style questions with the evidence behind them. Every tab can be run on Cloud9 itself (self-scouting) or on any opponent in the dataset.

| Tab | Question | Example from Cloud9's own data |
|---|---|---|
| **Utility placement** | Where does a team cast placeable utility, recon, smokes, stall and flashes? | Heatmap with numbered hotspots; each reports "50 of 81 rounds" and typical round timing. |
| **Operator profiler** | Who holds the Operator, when, and on what buy? | Cloud9 held one in 102 of 962 rounds (10.6%). OXY on Jett holds 97 of them, 93 on defense. Operators appear only on full buys (100 of 102 rounds). |
| **Defensive setups** | How do they spread their defenders across the sites early in a round? | On Lotus, with 0-1 defenders on Site 1 at about 15 s they won 50% of rounds (70) against 68% with 2+ (28). |
| **Attack executes** | Where do they plant, how fast, and with what utility? | On Lotus, Site 3 is 35.5% of rounds and Site 2 is their weaker hit (44% won over 25 rounds, against 76% on Site 3). |
| **Timeout advisor** (`/scout/timeout`) | What should we change before the next rounds? | Enter their map, side, run (for example lost the last two) and recent plants. On Lotus, attacking after a two-round losing run, it expects Site 3 (36.6% of plants, 15 rounds) and flags "3 of the last 4 on Site 3" against 35.5% normally. |
| **Counter-card** (`/scout/card`) | What do we do about them on this map? | One printable page: how to attack them, how to defend against them, and what to do about their Operator. Save it as a PDF from the print dialog. |

The timeout advisor compares how an opponent plays in the current score situation (after losing or winning two or more rounds) with their baseline, and returns up to three adjustments with the rounds behind each. The feed does not say which team called a timeout, so it uses the score situation rather than timeout history. An optional Gemini layer can word the advice as a short timeout call (see below).

Common to every tab: filters (team, map, side, agent, player, patch, buy type, recent matches, and an option to exclude the low-precision VCT Americas 2025 feeds), the rounds and matches behind each number, and a high/medium/low confidence badge. Counter-play lines are frequency based and phrased as leads to confirm in VOD. The approach is described in [docs/METHODOLOGY.md](docs/METHODOLOGY.md).

**Limits to know about**
- The feeds do not record where an ability lands, so heatmaps show where the caster stood. Landing locations are not modeled.
- VCT Americas 2025 positions are sampled once per second, so those casts are less precise. Scout warns when most of a sample comes from them.
- The feeds carry no site labels. Sites are found by clustering where attackers plant the spike and are named Site 1, 2, 3 from left to right on the map. They are not matched to Valorant's site letters.
- The radar images for Corrode and Summit could not be validated against telemetry, so Scout draws those on a plain grid. Summit has too few plants for reliable sites.
- Win rates are descriptive, not causal, and small cells are noise. The page states the rounds behind each figure.
- The timeout advisor is only as strong as its slices: a situation with fewer than 10 usable rounds falls back to the overall picture, and the page says so.
- VLR.gg map win rates and rosters (via a self-hosted vlrggapi) are fetched by the backend (`/api/v1/scout/teams/{team}/vlr`) but are not shown in the UI yet.

```bash
# 1. Put the dataset next to this repo (see "Getting Started"), then build the scouting cache (about 4 minutes for all 857 series)
cd backend && python -m src.scouting.ingest --all
# 2. Start the API and the UI
uvicorn src.main:app --port 8000        # backend
cd ../frontend && npm run dev            # open http://localhost:3000/scout
```

The cache (`.scout-cache/`) and the VLR cache (`.vlr-cache/`) are git-ignored. The scouting cache is derived from licensed GRID data. Radar alignment is validated per map by `backend/tools/calibrate_maps.py` (`pip install pillow` for that dev tool).

---

## Post-match coach (original module)

The system ingests official GRID match telemetry and millisecond-precision 3D ability supplements, continuously models Expected Round Win (xRW) probabilities across game ticks, identifies quantifiable micro-mistakes, attributes win-probability penalties (Delta xRW) directly to individual players, and synthesizes actionable practice drills alongside a 2D interactive tactical minimap replay.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Architecture and Technical Methodology](#architecture-and-technical-methodology)
  - [In-Memory Zstandard Streaming](#in-memory-zstandard-streaming)
  - [3D Ability Spatial Supplement Join](#3d-ability-spatial-supplement-join)
  - [Expected Round Win (xRW) Analytical Engine](#expected-round-win-xrw-analytical-engine)
  - [Micro-Mistake Detection and Attribution Engine](#micro-mistake-detection-and-attribution-engine)
  - [Prescriptive Drill and Player Report Card Generation](#prescriptive-drill-and-player-report-card-generation)
- [Tools and AI Workflow](#tools-and-ai-workflow)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Option A: Local Development](#option-a-local-development)
  - [Option B: Docker Compose](#option-b-docker-compose)
- [Verification and Testing](#verification-and-testing)
- [Data Licensing and Git Compliance Statement](#data-licensing-and-git-compliance-statement)

---

## Problem Statement

Professional esports coaches in VALORANT face two persistent hurdles during post-match reviews:

1. **The Attribution Gap:** Coaches can observe that a round was lost after an opening pick, but traditional scoreboards (KDA, ACS, ADR) cannot quantify the specific probability swing inflicted on the team by an untraded first death versus a misaligned smoke or isolated duel.
2. **Subjective Debriefs and Information Overload:** Reviewing dozens of hours of match VODs manually produces subjective qualitative feedback without clear prioritization or structured training prescriptions.

C9 Oracle bridges this gap by calculating the exact Expected Round Win penalty (Delta xRW) for each blunder, computing each player's cumulative "error tax," and outputting structured 2v2/3v3 tactical drills designed to eradicate recurring errors.

---

## Architecture and Technical Methodology

### In-Memory Zstandard Streaming

Official GRID match series feeds (`.jsonl.zst`) expand to over 160 GB uncompressed across 857 series. To achieve zero disk extraction and sub-second ingestion latency, C9 Oracle streams envelopes directly from compressed `.zst` archives in memory using Python `zstandard` wrapped with line-delimited chunk iterators.

The ingestion pipeline includes rollback filtering that discards invalid frames and restarted matches (such as `series-!started-game` and `game-!started-round`) to preserve data integrity.

### 3D Ability Spatial Supplement Join

For each series, C9 Oracle ingests the corresponding ability supplement containing 3D spatial vectors:
- Coordinates: `(x, y, z)` in Riot centimeter units
- Aim/View: 3D unit direction vectors `(view.x, view.y, view.z)`
- Velocity: `(velocity.x, velocity.y, velocity.z)`

C9 Oracle joins ability casts to the primary match event stream using the unique event identifier (`grid_event_id == events[].id`), grounding player actions in exact map geometry.

### Expected Round Win (xRW) Analytical Engine

At any instant $t$, round state is mapped into a calibrated win probability model parameterized across:
- **Alive differential:** Man-advantage Delta Alive = Friendly - Enemy
- **Spike plant state:** Objective status (pre-plant vs. post-plant defender defusal burden)
- **Economy advantage:** Equipment value tier differences
- **Round clock:** Time remaining in regulation round time

The model enforces monotonic calibration guarantees:
- A 5v5 opening state evaluates to 0.50 win probability.
- Symmetrical down-states (4v4, 3v3, 2v2, 1v1) evaluate to 0.50 win probability.
- Man advantage (5v4, 4v3, 3v1) steeply elevates win probability, matching competitive VCT historical win curves.
- Post-plant scenarios heavily favor the planting team under short round timers.

### Micro-Mistake Detection and Attribution Engine

When an event occurs at timestamp $t$, C9 Oracle measures the change in expected win probability:

Delta xRW = xRW(after) - xRW(before)

The engine detects three primary tactical mistakes:
1. **Untraded First Death:** An opening casualty where the killer is not eliminated by friendly teammates within a 3.0-second trading window, resulting in a severe opening penalty (-0.21 xRW).
2. **Isolated Duel:** Combat initiated while distanced beyond trading proximity (>800 cm) from the nearest teammate with no support utility.
3. **Utility Delay:** Abilities cast either prematurely or too late relative to the team's site contact timeline.

### Prescriptive Drill and Player Report Card Generation

Mistakes are aggregated across games and rounds to construct individual Player Report Cards:
- **Cumulative xRW Tax:** Total round win equity surrendered due to unforced errors.
- **Primary Vulnerability:** The player's most frequent tactical error category.
- **Actionable Coaching Fix:** Explicit positional or communication adjustments.

The coaching engine automatically maps vulnerabilities to structured drills from the built-in tactical catalog:
- *Buddy-System Contact and Trade Timing 2v2* (addresses untraded opening deaths).
- *Crossfire and Spacing 2v2* (addresses isolated solo peeks).
- *Utility Timing and Flash Synchronization* (addresses delayed or misaligned utility).

---

## Tools and AI Workflow

The Scout engine (extractor, buy types, site detection, setups, attack profile, counter-card, VLR client) and its tests were built with Claude Code driving the work from a written plan (`docs/plans/`, `docs/HACKATHON_VALORANT_IDEAS.md`). Every claim in this README was checked against a run of the code before it was written down.

**Gemini (optional, runtime).** The timeout advisor can ask Gemini to word its advice as a short timeout call. It is off unless `GEMINI_API_KEY` is set in a git-ignored `.env` (`GEMINI_MODEL` picks the model). Gemini receives only the advisor's aggregated lines, never raw match data, is told to use nothing else, and its answer is discarded if it contains a number that is not in those lines. Nothing is trained or fine-tuned. If the call fails or is rejected, the page shows the plain advice. Check the hackathon's rules on outside AI services before enabling it in a submission.

JetBrains tools: TODO(author): list the JetBrains IDEs and the JetBrains AI Assistant features you actually used, and for what. The earlier version of this section named PyCharm Professional, WebStorm, strict MyPy and AI Assistant tasks. MyPy is not configured in this repository, and the rest could not be verified from the code, so it was removed rather than left in.

---

## Project Structure

```
c9-oracle/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── src/
│   │   ├── config.py                # Environment configuration and path resolution
│   │   ├── main.py                  # FastAPI application entrypoint
│   │   ├── api/                     # REST routes and dependency injection
│   │   ├── data/                    # In-memory zstd streamer, parser, supplement joiner
│   │   ├── scouting/                # Scout: extractor, buy types, sites, setups, attack, card, aggregates
│   │   ├── vlr/                     # vlrggapi client with disk cache
│   │   ├── models/                  # Pydantic domain models (events, match state, analytics)
│   │   ├── analytics/               # Expected Round Win (xRW) model and mistake detector
│   │   └── coaching/                # Report card aggregator and drill prescription
│   └── tests/                       # Unit and end-to-end integration tests
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── src/
│       ├── app/                     # Next.js App Router (coach dashboard, /scout, /scout/card)
│       ├── components/              # MinimapReplay, PlayerReportCards, DrillPrescriptions
│       ├── store/                   # Zustand state management
│       └── types/                   # TypeScript interfaces matching backend models
├── docker-compose.yml               # Multi-service container orchestration
├── .gitignore                       # Strict git rules protecting dataset files
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 24+ and npm
- Docker and Docker Compose (optional, for containerized execution)
- Official dataset directory `stl-hackathon-2026-grid-starter` located adjacent to `c9-oracle` (or specified via `STL_DATA_DIR`).

### Option A: Local Development

#### 1. Backend Setup

```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend API will be available at `http://127.0.0.1:8000`. Interactive documentation is available at `http://127.0.0.1:8000/docs`.

#### 2. Frontend Setup

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend dashboard will be available at `http://localhost:3000`.

### Option B: Docker Compose

To run the complete system in isolated containers:

```bash
# From c9-oracle root directory:
docker compose up --build
```

- Backend API: `http://localhost:8000`
- Frontend Dashboard: `http://localhost:3000`

The official match telemetry directory is mounted read-only into `/data` within the backend container.

---

## Verification and Testing

### Backend Test Suite

The backend tests cover data streaming, state parsing, rollback resilience, probability modeling, mistake detection, coaching synthesis, the scouting engine (buy types, sites, setups, attack, counter-card), the VLR client and the API endpoints. Tests that need the GRID dataset skip themselves if it is not present.

```bash
cd backend
.venv\Scripts\python -m pytest -q
```

At the time of writing: 86 passed.

### End-to-End Pipeline Test

Run the full end-to-end integration test against official VCT series `2748743`:

```bash
cd backend
.venv\Scripts\python -m pytest tests/test_e2e.py -v
```

### Frontend Component Tests

```bash
cd frontend
npm run test
```

At the time of writing: 5 test suites, 28 tests passed. `npx tsc --noEmit` is clean.

---

## Data Licensing and Git Compliance Statement

The match telemetry files (`val/`), 3D ability spatial supplements (`val-ability-supplements/`), and metadata tables (`meta/`) provided by GRID Esports for the Sky's the Limit 2026 Hackathon are subject to strict licensing agreements.

**Compliance Guarantee:**
- No raw `.zst`, decompressed `.jsonl`, derived `.parquet`, `.sqlite`, or `.duckdb` data files are committed to this repository.
- All telemetry is accessed strictly at runtime through the external directory referenced by the `STL_DATA_DIR` environment variable.
- The `.gitignore` configuration rigorously prevents accidental staging of proprietary match assets.
- The derived scouting cache (`.scout-cache/`) and the VLR response cache (`.vlr-cache/`) are git-ignored.
