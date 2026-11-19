# C9 Oracle: VALORANT Assistant Coach and Micro-Mistake Attribution

C9 Oracle is an automated coaching and performance analytics platform engineered for the Cloud9 x JetBrains "Sky's the Limit" 2026 Hackathon (Category 1: Comprehensive Assistant Coach).

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
- [JetBrains IDE and AI Assistant Workflow](#jetbrains-ide-and-ai-assistant-workflow)
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

## JetBrains IDE and AI Assistant Workflow

The C9 Oracle platform was engineered using JetBrains developer tools:

- **JetBrains PyCharm Professional:** Used for backend development, type annotations with strict MyPy validation, Pydantic v2 schemas, in-memory zstandard stream profiling, and the Pytest test harness.
- **JetBrains WebStorm:** Used for frontend development, Next.js 15 App Router architecture, TypeScript 5 typings, HTML5 Canvas 2D tactical minimap rendering, and Jest unit tests.
- **JetBrains AI Assistant:**
  - Formulated and vectorized the sigmoid mathematical weights for the Expected Round Win engine.
  - Accelerated development of the 3D vector math module (Euclidean distances and forward cone checks).
  - Drafted comprehensive unit tests for parser rollback edge cases, zstandard streaming readers, and mistake attribution filters.
  - Refactored frontend Canvas rendering routines to ensure crisp coordinate transformations across different VALORANT map bounding boxes.

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
│   │   ├── models/                  # Pydantic domain models (events, match state, analytics)
│   │   ├── analytics/               # Expected Round Win (xRW) model and mistake detector
│   │   └── coaching/                # Report card aggregator and drill prescription
│   └── tests/                       # Unit and end-to-end integration tests (26 passing tests)
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── src/
│       ├── app/                     # Next.js App Router (coaching dashboard)
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

The backend includes 26 automated unit and end-to-end tests covering data streaming, state parsing, rollback resilience, probability modeling, mistake detection, coaching synthesis, and API endpoints.

```bash
cd backend
.venv\Scripts\python -m pytest -v
```

Expected output:
```
tests/test_api.py::test_health_check PASSED
tests/test_api.py::test_get_coaching_report_real_series PASSED
tests/test_api.py::test_get_coaching_report_not_found PASSED
tests/test_coaching.py::test_package_exports PASSED
tests/test_coaching.py::test_builds_player_report_cards PASSED
tests/test_coaching.py::test_builds_player_report_cards_multiple_players_ordering PASSED
tests/test_coaching.py::test_builds_player_report_cards_empty PASSED
tests/test_coaching.py::test_generates_prescribed_drills PASSED
tests/test_coaching.py::test_generates_prescribed_drills_multiple_types PASSED
tests/test_coaching.py::test_generates_prescribed_drills_empty PASSED
tests/test_config.py::test_settings_resolves_data_dir PASSED
tests/test_config.py::test_settings_custom_env_override PASSED
tests/test_e2e.py::test_full_pipeline_on_vct_series PASSED
tests/test_mistake_detector.py::test_detects_untraded_first_death PASSED
tests/test_mistake_detector.py::test_traded_kill_does_not_flag_untraded PASSED
tests/test_mistake_detector.py::test_spatial_math_distance PASSED
tests/test_parser.py::test_parse_series_extracts_structure PASSED
tests/test_parser.py::test_parse_series_game_rollback PASSED
tests/test_streamer.py::test_stream_series_events_reads_first_envelopes PASSED
tests/test_streamer.py::test_stream_series_events_invalid_id_raises PASSED
tests/test_streamer.py::test_stream_series_events_zero_max_envelopes PASSED
tests/test_streamer.py::test_load_ability_supplement_structure PASSED
tests/test_xrw_model.py::test_xrw_even_state PASSED
tests/test_xrw_model.py::test_xrw_man_advantage_impact PASSED
tests/test_xrw_model.py::test_xrw_spike_plant_impact PASSED
tests/test_xrw_model.py::test_xrw_boundary_conditions PASSED

======================== 26 passed in 1.52s ========================
```

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

Expected output: 3 test suites passed, 12 component tests passed.

---

## Data Licensing and Git Compliance Statement

The match telemetry files (`val/`), 3D ability spatial supplements (`val-ability-supplements/`), and metadata tables (`meta/`) provided by GRID Esports for the Sky's the Limit 2026 Hackathon are subject to strict licensing agreements.

**Compliance Guarantee:**
- No raw `.zst`, decompressed `.jsonl`, derived `.parquet`, `.sqlite`, or `.duckdb` data files are committed to this repository.
- All telemetry is accessed strictly at runtime through the external directory referenced by the `STL_DATA_DIR` environment variable.
- The `.gitignore` configuration rigorously prevents accidental staging of proprietary match assets.
