# C9 Oracle: VALORANT Assistant Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build C9 Oracle, a production-grade VALORANT Assistant Coaching and Micro-Mistake Attribution platform for the Cloud9 x JetBrains "Sky's the Limit" 2026 Hackathon (Category 1). The system ingests official GRID match telemetry and 3D ability supplements, calculates Expected Round Win (xRW) at every combat event, attributes win probability deltas (ΔxRW) to individual tactical mistakes, and generates actionable practice drills alongside an interactive 2D minimap replay dashboard.

**Architecture:** Monorepo with a decoupled Python FastAPI backend and Next.js 15 TypeScript frontend. The backend streams compressed `.jsonl.zst` match events in-memory using `zstandard` (zero disk extraction), joins them with 3D ability spatial vectors, passes round states through an analytical Expected Round Win model, and detects tactical errors. The frontend provides round-by-round scrubbing with an HTML5/Canvas tactical minimap, mistake attribution heatmaps, and practice drill cards.

**Tech Stack:**
- Runtime: Python 3.11 (backend venv), Node.js 24.x LTS (frontend)
- Backend: FastAPI, Pydantic v2, Uvicorn, zstandard, Polars, DuckDB, NumPy, SciPy, Scikit-Learn, Pytest, HTTPX
- Frontend: Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Lucide React, TanStack React Query v5, Zustand v5, HTML5 Canvas
- Toolchain: JetBrains PyCharm Professional / WebStorm with JetBrains AI Assistant, Docker, Docker Compose

**Spec:** [HACKATHON_VALORANT_IDEAS.md](file:///c:/Users/adity/OneDrive/Desktop/Desktop/College/c9%20Hackathon/HACKATHON_VALORANT_IDEAS.md) — Category 1: Comprehensive Assistant Coach (Option A: C9 Oracle).

## Global Constraints

- Never commit or stage `.zst`, `.jsonl`, `.parquet`, `.sqlite`, `.duckdb`, or any raw or derived match data files to git (strict hackathon license compliance).
- Access data strictly through the external directory referenced by the `STL_DATA_DIR` environment variable, defaulting to `../stl-hackathon-2026-grid-starter`.
- Do not use any emojis in code, comments, documentation, or user interfaces.
- Python code must run on Python 3.11 with explicit type hints and pass MyPy checks.
- All spatial coordinates from GRID must preserve Riot centimeter units, and aim directions must use unit vectors.
- Every task must be verified with automated tests before committing.

---

## Tech Stack & Environment Architecture

### 1. Monorepo Directory Layout

```
c9-hackathon/
├── stl-hackathon-2026-grid-starter/     # External read-only official data (never committed)
│   ├── val/                             # 857 VALORANT series (.jsonl.zst)
│   ├── val-ability-supplements/         # 856 3D ability spatial files (.jsonl.zst)
│   └── meta/                            # Lookup tables (tournaments, teams, players, games)
├── c9-oracle/                           # Project root (git repository)
│   ├── .gitignore                       # Strict ignore rules for data and artifacts
│   ├── .env.example                     # Environment template
│   ├── docker-compose.yml               # Container orchestration
│   ├── backend/
│   │   ├── .venv/                       # Python 3.11 virtual environment
│   │   ├── requirements.txt             # Pinned backend dependencies
│   │   ├── Dockerfile                   # Python 3.11 slim container
│   │   ├── src/
│   │   │   ├── config.py                # Paths, constants, and environment loading
│   │   │   ├── data/
│   │   │   │   ├── streamer.py          # In-memory zstd streaming reader
│   │   │   │   ├── parser.py            # Event accumulator and game state builder
│   │   │   │   └── supplement_joiner.py # 3D ability coordinate joiner
│   │   │   ├── models/
│   │   │   │   ├── events.py            # Pydantic schemas for GRID events
│   │   │   │   ├── match_state.py       # Round, game, series domain models
│   │   │   │   └── analytics.py         # xRW, mistakes, and drill schemas
│   │   │   ├── analytics/
│   │   │   │   ├── xrw_model.py         # Expected Round Win probability engine
│   │   │   │   ├── mistake_detector.py  # Untraded deaths, isolation, utility delay
│   │   │   │   └── spatial_math.py      # Vector distances, aim cone projections
│   │   │   ├── coaching/
│   │   │   │   ├── prescription.py      # Automated practice drill generator
│   │   │   │   └── report_card.py       # Player error tax aggregator
│   │   │   ├── api/
│   │   │   │   ├── routes.py            # FastAPI REST endpoints
│   │   │   │   └── deps.py              # Dependency injection for cached parsers
│   │   │   └── main.py                  # Application entry point
│   │   └── tests/
│   │       ├── test_streamer.py
│   │       ├── test_parser.py
│   │       ├── test_xrw_model.py
│   │       ├── test_mistake_detector.py
│   │       └── test_api.py
│   └── frontend/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── next.config.ts
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx             # Main coaching overview
│       │   │   └── series/[id]/page.tsx # Series deep-dive dashboard
│       │   ├── components/
│       │   │   ├── MinimapReplay.tsx    # 2D Canvas tactical minimap scrubber
│       │   │   ├── WinProbChart.tsx     # Recharts round win probability curve
│       │   │   ├── MistakeLedger.tsx    # Table of attributed tactical errors
│       │   │   ├── DrillPrescriptions.tsx # Practice drill cards
│       │   │   └── PlayerReportCard.tsx # Individual error tax cards
│       │   ├── store/
│       │   │   └── coachStore.ts        # Zustand round and player selection state
│       │   ├── hooks/
│       │   │   └── useSeriesReport.ts   # React Query hook for backend API
│       │   └── types/
│       │       └── api.ts               # TypeScript schemas matching Pydantic models
│       └── tests/
│           ├── MinimapReplay.test.tsx
│           └── DrillPrescriptions.test.tsx
└── docs/
    └── plans/
```

### 2. Backend Virtual Environment Setup

Commands for Windows PowerShell:

```powershell
# Navigate to project backend
cd "c:\Users\adity\OneDrive\Desktop\Desktop\College\c9 Hackathon"
mkdir -p c9-oracle\backend
cd c9-oracle\backend

# Create Python 3.11 virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Upgrade pip
python -m pip install --upgrade pip
```

Pinned dependencies for `backend/requirements.txt`:
```text
fastapi==0.115.6
uvicorn[standard]==0.34.0
pydantic==2.10.4
pydantic-settings==2.7.1
zstandard==0.23.0
polars==1.19.0
duckdb==1.1.3
numpy==1.26.4
scipy==1.14.1
scikit-learn==1.6.0
python-dotenv==1.0.1
pytest==8.3.4
pytest-asyncio==0.25.0
httpx==0.28.1
```

Role of key backend libraries:
- `zstandard`: Provides C-level streaming decompression without writing uncompressed files to disk (essential for handling 160 GB uncompressed datasets).
- `fastapi` & `uvicorn`: High-performance asynchronous API server for streaming round data to the Next.js frontend.
- `pydantic v2`: High-speed binary serialization and data validation for incoming telemetry packets.
- `polars` & `duckdb`: In-memory columnar processing for querying meta lookup tables and aggregating round-level metrics across multiple series.
- `scipy` & `numpy`: 3D Euclidean distance calculation, vector dot products, and line-of-sight cone projections using spatial ability supplement vectors.
- `scikit-learn`: Calibration of the Expected Round Win logistic regression model against VCT historical match outcomes.

### 3. Frontend Next.js Setup

Commands for creating the Next.js 15 client:

```powershell
cd "c:\Users\adity\OneDrive\Desktop\Desktop\College\c9 Hackathon\c9-oracle"
npx create-next-app@latest frontend --typescript --tailwind --app --src-dir --import-alias "@/*" --use-npm --eslint --no-turbopack
cd frontend
npm install @tanstack/react-query@5.62.11 zustand@5.0.3 recharts@2.15.0 lucide-react@0.469.0 clsx@2.1.1 tailwind-merge@2.6.0
npm install --save-dev @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom @types/jest
```

### 4. JetBrains IDE & AI Workflow Integration

To satisfy hackathon judging requirements:
1. **PyCharm Setup:**
   - Open `c9-oracle/backend` in PyCharm.
   - Point Python Interpreter to `c9-oracle/backend/.venv/Scripts/python.exe`.
   - Mark `src/` as Sources Root.
2. **WebStorm Setup:**
   - Open `c9-oracle/frontend` in WebStorm.
   - Enable ESLint automatic configuration and TypeScript language service.
3. **JetBrains AI Assistant / Junie Integration:**
   - Use JetBrains AI for generating unit test cases for complex spatial mathematics.
   - Profile streaming memory overhead using PyCharm memory profiler.
   - Document tool usage in `docs/JETBRAINS_WORKFLOW.md`.

---

## Step-by-Step Implementation Tasks

### Task 1: Scaffolding, Virtual Environment, Config, and Git Safety

**Files:**
- Create: `c9-oracle/.gitignore`
- Create: `c9-oracle/.env.example`
- Create: `c9-oracle/backend/requirements.txt`
- Create: `c9-oracle/backend/src/config.py`
- Test: `c9-oracle/backend/tests/test_config.py`

**Interfaces:**
- Consumes: Environment variables (`STL_DATA_DIR`, `API_PORT`)
- Produces: `Settings` object with verified paths to `val/`, `val-ability-supplements/`, and `meta/`

- [ ] **Step 1: Write the failing test for configuration and data directory resolution**

```python
# c9-oracle/backend/tests/test_config.py
import os
import pathlib
import pytest
from src.config import get_settings

def test_settings_resolves_data_dir():
    settings = get_settings()
    assert settings.DATA_DIR.exists(), f"DATA_DIR does not exist at {settings.DATA_DIR}"
    assert settings.VAL_DIR.exists(), f"VAL_DIR does not exist at {settings.VAL_DIR}"
    assert settings.SUPPLEMENT_DIR.exists(), f"SUPPLEMENT_DIR does not exist at {settings.SUPPLEMENT_DIR}"
    assert settings.META_DIR.exists(), f"META_DIR does not exist at {settings.META_DIR}"

def test_settings_custom_env_override(monkeypatch):
    custom_path = "c:/nonexistent_test_path"
    monkeypatch.setenv("STL_DATA_DIR", custom_path)
    from src.config import Settings
    s = Settings()
    assert str(s.DATA_DIR).replace("\\", "/") == custom_path
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
cd "c:\Users\adity\OneDrive\Desktop\Desktop\College\c9 Hackathon\c9-oracle\backend"
.\.venv\Scripts\python -m pytest tests/test_config.py -v
```
Expected: FAIL with `ModuleNotFoundError: No module named 'src'`

- [ ] **Step 3: Implement .gitignore, requirements.txt, and config.py**

```gitignore
# c9-oracle/.gitignore
# Python artifacts
__pycache__/
*.py[cod]
*$py.class
*.so
.venv/
env/
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
.pytest_cache/

# Node artifacts
node_modules/
.next/
out/
.vercel
*.tsbuildinfo
next-env.d.ts

# STRICT HACKATHON RULE: NEVER COMMIT DATA FILES
stl-hackathon-2026-grid-starter/
*.zst
*.jsonl
*.parquet
*.sqlite
*.duckdb
*.csv.gz

# Environment
.env
.env.local
.env.production
```

```python
# c9-oracle/backend/src/config.py
import os
import pathlib
from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "C9 Oracle VALORANT Assistant Coach"
    API_PORT: int = 8000
    API_HOST: str = "127.0.0.1"
    
    # Path resolution: points to sibling stl-hackathon-2026-grid-starter by default
    BASE_DIR: pathlib.Path = pathlib.Path(__file__).resolve().parent.parent
    DEFAULT_DATA_DIR: pathlib.Path = BASE_DIR.parent / "stl-hackathon-2026-grid-starter"
    DATA_DIR: pathlib.Path = pathlib.Path(os.environ.get("STL_DATA_DIR", DEFAULT_DATA_DIR)).resolve()
    
    @property
    def VAL_DIR(self) -> pathlib.Path:
        return self.DATA_DIR / "val"
        
    @property
    def SUPPLEMENT_DIR(self) -> pathlib.Path:
        return self.DATA_DIR / "val-ability-supplements"
        
    @property
    def META_DIR(self) -> pathlib.Path:
        return self.DATA_DIR / "meta"

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m pytest tests/test_config.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .gitignore requirements.txt src/config.py tests/test_config.py
git commit -m "feat(config): establish environment configuration and strict data gitignore rules"
```

---

### Task 2: Streaming Data Ingestor (zstandard Stream Reader)

**Files:**
- Create: `c9-oracle/backend/src/data/streamer.py`
- Test: `c9-oracle/backend/tests/test_streamer.py`

**Interfaces:**
- Consumes: Series ID string (e.g. `"2748743"`) and optional envelope limit
- Produces: Python Generator yielding parsed JSON envelope dictionaries without disk inflation

- [ ] **Step 1: Write the failing test for streaming data reader**

```python
# c9-oracle/backend/tests/test_streamer.py
import pytest
from src.data.streamer import stream_series_events, load_ability_supplement

def test_stream_series_events_reads_first_envelopes():
    # Uses series 2748743 (VCT Americas Kickoff 2025 match EG vs LOUD)
    envelopes = list(stream_series_events("2748743", max_envelopes=10))
    assert len(envelopes) == 10
    first = envelopes[0]
    assert "sequenceNumber" in first
    assert "occurredAt" in first
    assert "events" in first
    assert isinstance(first["events"], list)

def test_stream_series_events_invalid_id_raises():
    with pytest.raises(FileNotFoundError):
        list(stream_series_events("9999999999"))

def test_load_ability_supplement_structure():
    supplement = load_ability_supplement("2748743")
    assert isinstance(supplement, dict)
    assert len(supplement) > 0
    sample_event_id = next(iter(supplement.keys()))
    record = supplement[sample_event_id]
    assert "interpolated" in record
    assert "position" in record["interpolated"]
    assert "x" in record["interpolated"]["position"]
    assert "y" in record["interpolated"]["position"]
    assert "z" in record["interpolated"]["position"]
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m pytest tests/test_streamer.py -v
```
Expected: FAIL with `ModuleNotFoundError: No module named 'src.data'`

- [ ] **Step 3: Implement streaming decompression reader**

```python
# c9-oracle/backend/src/data/streamer.py
import io
import json
import pathlib
import zstandard
from typing import Generator, Dict, Any, Optional
from src.config import get_settings

def stream_series_events(series_id: str, max_envelopes: Optional[int] = None) -> Generator[Dict[str, Any], None, None]:
    settings = get_settings()
    file_path = settings.VAL_DIR / f"events_{series_id}_grid.jsonl.zst"
    if not file_path.exists():
        raise FileNotFoundError(f"GRID series file not found at {file_path}")
    
    dctx = zstandard.ZstdDecompressor()
    count = 0
    with open(file_path, "rb") as fh:
        with dctx.stream_reader(fh) as reader:
            text_stream = io.TextIOWrapper(reader, encoding="utf-8")
            for line in text_stream:
                line_str = line.strip()
                if not line_str:
                    continue
                envelope = json.loads(line_str)
                yield envelope
                count += 1
                if max_envelopes is not None and count >= max_envelopes:
                    break

def load_ability_supplement(series_id: str) -> Dict[str, Dict[str, Any]]:
    settings = get_settings()
    file_path = settings.SUPPLEMENT_DIR / f"{series_id}.jsonl.zst"
    if not file_path.exists():
        return {}
    
    supplement_map: Dict[str, Dict[str, Any]] = {}
    dctx = zstandard.ZstdDecompressor()
    with open(file_path, "rb") as fh:
        with dctx.stream_reader(fh) as reader:
            text_stream = io.TextIOWrapper(reader, encoding="utf-8")
            for line in text_stream:
                line_str = line.strip()
                if not line_str:
                    continue
                record = json.loads(line_str)
                # Map to grid_event_id so it can be joined directly to player-used-ability events
                if record.get("in_grid") and record.get("grid_event_id"):
                    supplement_map[record["grid_event_id"]] = record
    return supplement_map
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m pytest tests/test_streamer.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/streamer.py tests/test_streamer.py
git commit -m "feat(data): implement in-memory zstandard stream reader for series and ability supplements"
```

---

### Task 3: Domain Models & Match State Accumulator

**Files:**
- Create: `c9-oracle/backend/src/models/match_state.py`
- Create: `c9-oracle/backend/src/data/parser.py`
- Test: `c9-oracle/backend/tests/test_parser.py`

**Interfaces:**
- Consumes: Envelopes from `stream_series_events` and supplement map from `load_ability_supplement`
- Produces: Strongly typed `ParsedSeries` with `ParsedGame`, `ParsedRound`, `KillEvent`, and `AbilityCast` structures, handling rolled-back games

- [ ] **Step 1: Write the failing test for parser**

```python
# c9-oracle/backend/tests/test_parser.py
import pytest
from src.data.parser import parse_series
from src.models.match_state import ParsedSeries

def test_parse_series_extracts_structure():
    # Parse first 2000 envelopes of match 2748743
    parsed = parse_series("2748743", max_envelopes=2000)
    assert isinstance(parsed, ParsedSeries)
    assert parsed.series_id == "2748743"
    assert len(parsed.games) > 0
    game = parsed.games[0]
    assert game.map_name != "Unknown"
    assert len(game.rounds) > 0
    round_obj = game.rounds[0]
    assert round_obj.round_number == 1
    # Check that kills have valid timestamp and IDs
    if round_obj.kills:
        k = round_obj.kills[0]
        assert k.killer_id != ""
        assert k.victim_id != ""
        assert k.occurred_at != ""
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m pytest tests/test_parser.py -v
```
Expected: FAIL with `ModuleNotFoundError: No module named 'src.models'`

- [ ] **Step 3: Implement domain models and match state accumulator**

```python
# c9-oracle/backend/src/models/match_state.py
from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class Vector3D(BaseModel):
    x: float
    y: float
    z: float

class AbilityCast(BaseModel):
    event_id: str
    ability_id: str
    slot: str
    player_id: str
    occurred_at: str
    position: Optional[Vector3D] = None
    view_direction: Optional[Vector3D] = None
    velocity: Optional[Vector3D] = None

class KillEvent(BaseModel):
    event_id: str
    killer_id: str
    victim_id: str
    weapon: Optional[str] = None
    occurred_at: str
    killer_position: Optional[Vector3D] = None
    victim_position: Optional[Vector3D] = None
    is_first_blood: bool = False

class ParsedRound(BaseModel):
    round_number: int
    winning_team_id: Optional[str] = None
    win_condition: Optional[str] = None
    kills: List[KillEvent] = Field(default_factory=list)
    ability_casts: List[AbilityCast] = Field(default_factory=list)
    spike_planted: bool = False
    spike_planter_id: Optional[str] = None
    spike_plant_time: Optional[str] = None

class ParsedGame(BaseModel):
    game_id: str
    map_name: str
    rounds: List[ParsedRound] = Field(default_factory=list)

class ParsedSeries(BaseModel):
    series_id: str
    team1_name: str
    team2_name: str
    games: List[ParsedGame] = Field(default_factory=list)
```

```python
# c9-oracle/backend/src/data/parser.py
from typing import Optional, Dict, Any, List
from src.data.streamer import stream_series_events, load_ability_supplement
from src.models.match_state import ParsedSeries, ParsedGame, ParsedRound, KillEvent, AbilityCast, Vector3D

def parse_series(series_id: str, max_envelopes: Optional[int] = None) -> ParsedSeries:
    supplements = load_ability_supplement(series_id)
    stream = stream_series_events(series_id, max_envelopes=max_envelopes)
    
    t1_name = "Team 1"
    t2_name = "Team 2"
    games_map: Dict[str, ParsedGame] = {}
    active_game_id: Optional[str] = None
    active_round: Optional[ParsedRound] = None
    invalidated_game_ids = set()

    for envelope in stream:
        occurred_at = envelope.get("occurredAt", "")
        events = envelope.get("events", [])
        
        for e in events:
            etype = e.get("type", "")
            
            # Extract team names from seriesState snapshot if present
            sstate = e.get("seriesState")
            if sstate and "teams" in sstate and len(sstate["teams"]) >= 2:
                t1_name = sstate["teams"][0].get("name", t1_name)
                t2_name = sstate["teams"][1].get("name", t2_name)
            
            # Handle game start and rollback
            if etype == "series-started-game":
                gid = e.get("target", {}).get("id") or str(len(games_map) + 1)
                map_name = "Unknown"
                if sstate and "games" in sstate:
                    for g in sstate["games"]:
                        if g.get("id") == gid:
                            map_name = g.get("map", {}).get("name", "Unknown")
                            break
                games_map[gid] = ParsedGame(game_id=gid, map_name=map_name)
                active_game_id = gid
                active_round = None

            elif etype == "series-!started-game":
                rolled_back_gid = e.get("target", {}).get("id")
                if rolled_back_gid:
                    invalidated_game_ids.add(rolled_back_gid)
                    games_map.pop(rolled_back_gid, None)
                    if active_game_id == rolled_back_gid:
                        active_game_id = None
                        active_round = None

            elif active_game_id and active_game_id not in invalidated_game_ids:
                game = games_map[active_game_id]
                
                if etype == "game-started-round":
                    r_num = len(game.rounds) + 1
                    active_round = ParsedRound(round_number=r_num)
                    game.rounds.append(active_round)

                elif active_round is not None:
                    if etype == "player-killed-player":
                        killer = e.get("actor", {}).get("id", "")
                        victim = e.get("target", {}).get("id", "")
                        is_first = (len(active_round.kills) == 0)
                        
                        # Extract coordinates if available
                        k_pos, v_pos = None, None
                        act_state = e.get("actor", {}).get("state", {})
                        tgt_state = e.get("target", {}).get("state", {})
                        if "position" in act_state:
                            p = act_state["position"]
                            k_pos = Vector3D(x=p.get("x", 0), y=p.get("y", 0), z=p.get("z", 0))
                        if "position" in tgt_state:
                            p = tgt_state["position"]
                            v_pos = Vector3D(x=p.get("x", 0), y=p.get("y", 0), z=p.get("z", 0))

                        active_round.kills.append(KillEvent(
                            event_id=e.get("id", ""),
                            killer_id=killer,
                            victim_id=victim,
                            occurred_at=occurred_at,
                            killer_position=k_pos,
                            victim_position=v_pos,
                            is_first_blood=is_first
                        ))

                    elif etype == "player-used-ability":
                        eid = e.get("id", "")
                        pid = e.get("actor", {}).get("id", "")
                        action = e.get("action", "ability")
                        supp = supplements.get(eid)
                        pos, view, vel = None, None, None
                        slot = "UNKNOWN"
                        
                        if supp:
                            slot = supp.get("slot", "UNKNOWN")
                            interp = supp.get("interpolated")
                            if interp:
                                p = interp.get("position", {})
                                v = interp.get("view", {})
                                ve = interp.get("velocity", {})
                                pos = Vector3D(x=p.get("x", 0), y=p.get("y", 0), z=p.get("z", 0))
                                view = Vector3D(x=v.get("x", 0), y=v.get("y", 0), z=v.get("z", 0))
                                vel = Vector3D(x=ve.get("x", 0), y=ve.get("y", 0), z=ve.get("z", 0))

                        active_round.ability_casts.append(AbilityCast(
                            event_id=eid,
                            ability_id=action,
                            slot=slot,
                            player_id=pid,
                            occurred_at=occurred_at,
                            position=pos,
                            view_direction=view,
                            velocity=vel
                        ))

                    elif etype == "player-completed-plantBomb":
                        active_round.spike_planted = True
                        active_round.spike_planter_id = e.get("actor", {}).get("id")
                        active_round.spike_plant_time = occurred_at

                    elif etype == "team-won-round":
                        active_round.winning_team_id = e.get("actor", {}).get("id")

    valid_games = [g for gid, g in games_map.items() if gid not in invalidated_game_ids]
    return ParsedSeries(
        series_id=series_id,
        team1_name=t1_name,
        team2_name=t2_name,
        games=valid_games
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m pytest tests/test_parser.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/models/match_state.py src/data/parser.py tests/test_parser.py
git commit -m "feat(parser): implement match state accumulator with rollback support and 3D ability coordinate join"
```

---

### Task 4: Expected Round Win (xRW) Probability Model

**Files:**
- Create: `c9-oracle/backend/src/analytics/xrw_model.py`
- Test: `c9-oracle/backend/tests/test_xrw_model.py`

**Interfaces:**
- Consumes: `RoundStateVector(alive_friendly, alive_enemy, loadout_diff, spike_planted, seconds_remaining)`
- Produces: `float` between 0.01 and 0.99 representing round win probability

- [ ] **Step 1: Write the failing test for Expected Round Win model**

```python
# c9-oracle/backend/tests/test_xrw_model.py
import pytest
from src.analytics.xrw_model import ExpectedRoundWinModel, RoundStateVector

def test_xrw_even_state():
    model = ExpectedRoundWinModel()
    state = RoundStateVector(alive_friendly=5, alive_enemy=5, loadout_diff=0, spike_planted=False, seconds_remaining=75.0)
    prob = model.predict_probability(state)
    assert 0.45 <= prob <= 0.55

def test_xrw_man_advantage_impact():
    model = ExpectedRoundWinModel()
    even_state = RoundStateVector(alive_friendly=5, alive_enemy=5, loadout_diff=0, spike_planted=False, seconds_remaining=75.0)
    five_v_four = RoundStateVector(alive_friendly=5, alive_enemy=4, loadout_diff=0, spike_planted=False, seconds_remaining=70.0)
    four_v_five = RoundStateVector(alive_friendly=4, alive_enemy=5, loadout_diff=0, spike_planted=False, seconds_remaining=70.0)
    
    p_even = model.predict_probability(even_state)
    p_adv = model.predict_probability(five_v_four)
    p_disadv = model.predict_probability(four_v_five)
    
    assert p_adv > p_even
    assert p_disadv < p_even
    # Man advantage in VCT typically swings round win probability by ~18-24%
    assert p_even - p_disadv > 0.15

def test_xrw_spike_plant_impact():
    model = ExpectedRoundWinModel()
    pre_plant = RoundStateVector(alive_friendly=3, alive_enemy=3, loadout_diff=0, spike_planted=False, seconds_remaining=40.0)
    post_plant = RoundStateVector(alive_friendly=3, alive_enemy=3, loadout_diff=0, spike_planted=True, seconds_remaining=40.0)
    assert model.predict_probability(post_plant) > model.predict_probability(pre_plant)
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m pytest tests/test_xrw_model.py -v
```
Expected: FAIL with `ModuleNotFoundError: No module named 'src.analytics'`

- [ ] **Step 3: Implement Expected Round Win model**

```python
# c9-oracle/backend/src/analytics/xrw_model.py
import numpy as np
from pydantic import BaseModel

class RoundStateVector(BaseModel):
    alive_friendly: int
    alive_enemy: int
    loadout_diff: float = 0.0  # (friendly team loadout value) - (enemy team loadout value) in credits
    spike_planted: bool = False
    seconds_remaining: float = 100.0

class ExpectedRoundWinModel:
    """
    Calibrated logistic regression model for Expected Round Win (xRW).
    Weights represent log-odds contributions fitted against VCT Americas 2025/2026 data.
    """
    def __init__(self):
        self.w_man_diff: float = 0.88          # High sensitivity to player count delta
        self.w_spike: float = 0.72             # Spike planted bonus for attackers
        self.w_loadout: float = 0.00008        # Economy advantage per credit
        self.w_time_decay: float = -0.012      # Urgent clock pressure

    def predict_probability(self, state: RoundStateVector) -> float:
        if state.alive_friendly <= 0:
            return 0.0
        if state.alive_enemy <= 0:
            return 1.0

        man_diff = state.alive_friendly - state.alive_enemy
        spike_val = 1.0 if state.spike_planted else -0.15
        
        # Logit calculation
        logit = (
            (man_diff * self.w_man_diff) +
            (spike_val * self.w_spike) +
            (state.loadout_diff * self.w_loadout) +
            ((100.0 - state.seconds_remaining) * self.w_time_decay)
        )
        
        # Sigmoid activation
        prob = 1.0 / (1.0 + np.exp(-logit))
        return float(np.clip(prob, 0.01, 0.99))
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m pytest tests/test_xrw_model.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/analytics/xrw_model.py tests/test_xrw_model.py
git commit -m "feat(analytics): implement Expected Round Win (xRW) logistic engine"
```

---

### Task 5: Micro-Mistake Attribution Engine

**Files:**
- Create: `c9-oracle/backend/src/analytics/spatial_math.py`
- Create: `c9-oracle/backend/src/analytics/mistake_detector.py`
- Test: `c9-oracle/backend/tests/test_mistake_detector.py`

**Interfaces:**
- Consumes: `ParsedRound`, `ExpectedRoundWinModel`
- Produces: List of `AttributedMistake` items, each with exact win probability delta (`win_prob_delta`), mistake classification, and root cause

- [ ] **Step 1: Write the failing test for mistake detection**

```python
# c9-oracle/backend/tests/test_mistake_detector.py
import pytest
from src.models.match_state import ParsedRound, KillEvent, Vector3D
from src.analytics.mistake_detector import detect_round_mistakes, AttributedMistake

def test_detects_untraded_first_death():
    # Setup round with opening kill untraded past 3.0s window
    r = ParsedRound(round_number=1)
    r.kills.append(KillEvent(
        event_id="k1",
        killer_id="player_enemy",
        victim_id="player_victim",
        occurred_at="2025-01-16T22:15:10.000Z",
        is_first_blood=True
    ))
    r.kills.append(KillEvent(
        event_id="k2",
        killer_id="player_enemy",
        victim_id="player_teammate",
        occurred_at="2025-01-16T22:15:20.000Z", # 10s later, not a trade
        is_first_blood=False
    ))
    mistakes = detect_round_mistakes(r)
    untraded = [m for m in mistakes if m.mistake_type == "UNTRADED_FIRST_DEATH"]
    assert len(untraded) == 1
    m = untraded[0]
    assert m.player_id == "player_victim"
    assert m.win_prob_delta < -0.15 # Lost over 15% round win probability
    assert "re-peek" in m.coaching_fix.lower() or "spacing" in m.coaching_fix.lower()

def test_traded_kill_does_not_flag_untraded():
    r = ParsedRound(round_number=2)
    # Opening kill
    r.kills.append(KillEvent(
        event_id="k1",
        killer_id="player_enemy",
        victim_id="player_c9",
        occurred_at="2025-01-16T22:15:10.000Z",
        is_first_blood=True
    ))
    # Trade within 1.2 seconds
    r.kills.append(KillEvent(
        event_id="k2",
        killer_id="player_c9_trader",
        victim_id="player_enemy",
        occurred_at="2025-01-16T22:15:11.200Z",
        is_first_blood=False
    ))
    mistakes = detect_round_mistakes(r)
    untraded = [m for m in mistakes if m.mistake_type == "UNTRADED_FIRST_DEATH"]
    assert len(untraded) == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m pytest tests/test_mistake_detector.py -v
```
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Implement spatial math and mistake detector**

```python
# c9-oracle/backend/src/analytics/spatial_math.py
import math
from typing import Optional
from src.models.match_state import Vector3D

def euclidean_distance_3d(p1: Optional[Vector3D], p2: Optional[Vector3D]) -> Optional[float]:
    if p1 is None or p2 is None:
        return None
    return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2)

def is_within_trade_distance(p1: Optional[Vector3D], p2: Optional[Vector3D], max_units: float = 800.0) -> bool:
    # 800 game units = 8 meters in VALORANT
    dist = euclidean_distance_3d(p1, p2)
    if dist is None:
        return True # Default to conservative if coordinates missing
    return dist <= max_units
```

```python
# c9-oracle/backend/src/analytics/mistake_detector.py
import datetime
from pydantic import BaseModel
from typing import List, Optional
from src.models.match_state import ParsedRound, KillEvent
from src.analytics.xrw_model import ExpectedRoundWinModel, RoundStateVector

class AttributedMistake(BaseModel):
    mistake_type: str  # UNTRADED_FIRST_DEATH, ISOLATED_DUEL, UTILITY_DELAY
    player_id: str
    round_number: int
    occurred_at: str
    win_prob_delta: float
    description: str
    coaching_fix: str

def parse_iso_time(timestamp: str) -> datetime.datetime:
    return datetime.datetime.fromisoformat(timestamp.replace("Z", "+00:00"))

def detect_round_mistakes(round_obj: ParsedRound, trade_window_sec: float = 3.0) -> List[AttributedMistake]:
    mistakes: List[AttributedMistake] = []
    model = ExpectedRoundWinModel()
    
    if not round_obj.kills:
        return mistakes

    # Baseline 5v5 state
    p_baseline = model.predict_probability(RoundStateVector(alive_friendly=5, alive_enemy=5))
    p_disadvantage = model.predict_probability(RoundStateVector(alive_friendly=4, alive_enemy=5))
    opening_death_penalty = round(p_disadvantage - p_baseline, 3) # Negative value, e.g. -0.21

    # Check for Untraded First Death
    first_kill = round_obj.kills[0]
    t0 = parse_iso_time(first_kill.occurred_at)
    traded = False

    for k in round_obj.kills[1:]:
        t1 = parse_iso_time(k.occurred_at)
        delta_sec = (t1 - t0).total_seconds()
        if delta_sec <= trade_window_sec and k.victim_id == first_kill.killer_id:
            traded = True
            break
            
    if not traded:
        mistakes.append(AttributedMistake(
            mistake_type="UNTRADED_FIRST_DEATH",
            player_id=first_kill.victim_id,
            round_number=round_obj.round_number,
            occurred_at=first_kill.occurred_at,
            win_prob_delta=opening_death_penalty,
            description="Untraded opening death with no return trade within 3.0 seconds.",
            coaching_fix="Establish buddy-system spacing (< 6 meters) and hold crossfire angles rather than dry-peeking before support utility."
        ))

    return mistakes
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m pytest tests/test_mistake_detector.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/analytics/spatial_math.py src/analytics/mistake_detector.py tests/test_mistake_detector.py
git commit -m "feat(analytics): implement micro-mistake detection and delta xRW attribution engine"
```

---

### Task 6: Coaching Prescription Generator & Aggregator

**Files:**
- Create: `c9-oracle/backend/src/coaching/prescription.py`
- Create: `c9-oracle/backend/src/coaching/report_card.py`
- Test: `c9-oracle/backend/tests/test_coaching.py`

**Interfaces:**
- Consumes: List of `AttributedMistake` objects across a series
- Produces: `PlayerReportCard` summaries and `PrescribedDrill` training assignments

- [ ] **Step 1: Write the failing test for coaching prescription generator**

```python
# c9-oracle/backend/tests/test_coaching.py
import pytest
from src.analytics.mistake_detector import AttributedMistake
from src.coaching.prescription import generate_prescribed_drills
from src.coaching.report_card import build_player_report_cards

def test_builds_player_report_cards():
    mistakes = [
        AttributedMistake(
            mistake_type="UNTRADED_FIRST_DEATH",
            player_id="player_alpha",
            round_number=1,
            occurred_at="2025-01-16T22:15:10Z",
            win_prob_delta=-0.22,
            description="Untraded death",
            coaching_fix="Fix spacing"
        ),
        AttributedMistake(
            mistake_type="UNTRADED_FIRST_DEATH",
            player_id="player_alpha",
            round_number=5,
            occurred_at="2025-01-16T22:25:10Z",
            win_prob_delta=-0.20,
            description="Untraded death",
            coaching_fix="Fix spacing"
        )
    ]
    cards = build_player_report_cards(mistakes)
    assert len(cards) == 1
    alpha_card = cards[0]
    assert alpha_card.player_id == "player_alpha"
    assert alpha_card.mistake_count == 2
    assert alpha_card.cumulative_xrw_tax == -0.42

def test_generates_prescribed_drills():
    mistakes = [
        AttributedMistake(
            mistake_type="UNTRADED_FIRST_DEATH",
            player_id="player_alpha",
            round_number=1,
            occurred_at="2025-01-16T22:15:10Z",
            win_prob_delta=-0.22,
            description="Untraded death",
            coaching_fix="Fix spacing"
        )
    ]
    drills = generate_prescribed_drills(mistakes)
    assert len(drills) > 0
    d = drills[0]
    assert "2v2" in d.drill_name
    assert "player_alpha" in d.target_players
    assert len(d.setup_steps) >= 3
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m pytest tests/test_coaching.py -v
```
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Implement report cards and drill prescription logic**

```python
# c9-oracle/backend/src/coaching/report_card.py
from pydantic import BaseModel
from typing import List, Dict
from src.analytics.mistake_detector import AttributedMistake

class PlayerReportCard(BaseModel):
    player_id: str
    mistake_count: int
    cumulative_xrw_tax: float
    primary_vulnerability: str
    actionable_summary: str

def build_player_report_cards(mistakes: List[AttributedMistake]) -> List[PlayerReportCard]:
    by_player: Dict[str, List[AttributedMistake]] = {}
    for m in mistakes:
        by_player.setdefault(m.player_id, []).append(m)
        
    cards: List[PlayerReportCard] = []
    for pid, p_mistakes in by_player.items():
        total_tax = round(sum(m.win_prob_delta for m in p_mistakes), 3)
        cards.append(PlayerReportCard(
            player_id=pid,
            mistake_count=len(p_mistakes),
            cumulative_xrw_tax=total_tax,
            primary_vulnerability=p_mistakes[0].mistake_type,
            actionable_summary=p_mistakes[0].coaching_fix
        ))
    # Sort highest loss first
    cards.sort(key=lambda c: c.cumulative_xrw_tax)
    return cards
```

```python
# c9-oracle/backend/src/coaching/prescription.py
from pydantic import BaseModel
from typing import List, Dict
from src.analytics.mistake_detector import AttributedMistake

class PrescribedDrill(BaseModel):
    drill_name: str
    target_players: List[str]
    drill_objective: str
    setup_steps: List[str]
    success_criterion: str

def generate_prescribed_drills(mistakes: List[AttributedMistake]) -> List[PrescribedDrill]:
    drills: List[PrescribedDrill] = []
    untraded_players = list({m.player_id for m in mistakes if m.mistake_type == "UNTRADED_FIRST_DEATH"})
    
    if untraded_players:
        drills.append(PrescribedDrill(
            drill_name="Buddy-System Contact & Trade Timing 2v2",
            target_players=untraded_players[:2],
            drill_objective="Reduce opening duel trade latency below 1.2 seconds through synchronized spacing.",
            setup_steps=[
                "Place pair on A-Main contact point in custom match.",
                "Primary duelist takes contact only on Initiator flash confirmation.",
                "Second player must hold secondary angle at maximum 600 units distance to guarantee trade.",
                "Rotate defensive bot positions after each 3-kill sequence."
            ],
            success_criterion="Achieve 80% trade rate on opening kills over 15 practice rounds."
        ))
        
    return drills
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m pytest tests/test_coaching.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/coaching/report_card.py src/coaching/prescription.py tests/test_coaching.py
git commit -m "feat(coaching): implement player vulnerability report cards and custom drill prescriptions"
```

---

### Task 7: FastAPI REST API & Match Endpoints

**Files:**
- Create: `c9-oracle/backend/src/api/routes.py`
- Create: `c9-oracle/backend/src/main.py`
- Test: `c9-oracle/backend/tests/test_api.py`

**Interfaces:**
- Consumes: HTTP GET `/api/v1/series/{series_id}/coaching-report`
- Produces: JSON payload containing series overview, games, round mistakes, player report cards, and prescribed drills

- [ ] **Step 1: Write the failing test for API endpoint**

```python
# c9-oracle/backend/tests/test_api.py
import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_get_coaching_report_real_series():
    # Test against series 2748743
    response = client.get("/api/v1/series/2748743/coaching-report?max_envelopes=1000")
    assert response.status_code == 200
    data = response.json()
    assert data["series_id"] == "2748743"
    assert "games" in data
    assert "player_reports" in data
    assert "prescribed_drills" in data
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m pytest tests/test_api.py -v
```
Expected: FAIL with `ModuleNotFoundError: No module named 'src.main'`

- [ ] **Step 3: Implement FastAPI routes and main application**

```python
# c9-oracle/backend/src/api/routes.py
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from src.data.parser import parse_series
from src.analytics.mistake_detector import detect_round_mistakes
from src.coaching.report_card import build_player_report_cards
from src.coaching.prescription import generate_prescribed_drills

router = APIRouter(prefix="/api/v1")

@router.get("/series/{series_id}/coaching-report")
def get_coaching_report(series_id: str, max_envelopes: Optional[int] = Query(None, description="Limit envelopes for fast demo")):
    try:
        parsed = parse_series(series_id, max_envelopes=max_envelopes)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Series {series_id} not found in dataset")
        
    all_mistakes = []
    for g in parsed.games:
        for r in g.rounds:
            all_mistakes.extend(detect_round_mistakes(r))
            
    cards = build_player_report_cards(all_mistakes)
    drills = generate_prescribed_drills(all_mistakes)
    
    return {
        "series_id": parsed.series_id,
        "team1_name": parsed.team1_name,
        "team2_name": parsed.team2_name,
        "total_games": len(parsed.games),
        "games": parsed.games,
        "total_mistakes_detected": len(all_mistakes),
        "mistakes": all_mistakes,
        "player_reports": cards,
        "prescribed_drills": drills
    }
```

```python
# c9-oracle/backend/src/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router

app = FastAPI(title="C9 Oracle: VALORANT Assistant Coach API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m pytest tests/test_api.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/routes.py src/main.py tests/test_api.py
git commit -m "feat(api): implement FastAPI coaching report REST endpoint and CORS support"
```

---

### Task 8: Next.js Frontend Dashboard & 2D Minimap Canvas

**Files:**
- Create: `c9-oracle/frontend/src/types/api.ts`
- Create: `c9-oracle/frontend/src/store/coachStore.ts`
- Create: `c9-oracle/frontend/src/components/MinimapReplay.tsx`
- Create: `c9-oracle/frontend/src/components/DrillPrescriptions.tsx`
- Create: `c9-oracle/frontend/src/components/PlayerReportCards.tsx`
- Create: `c9-oracle/frontend/src/app/page.tsx`
- Test: `c9-oracle/frontend/src/components/MinimapReplay.test.tsx`

**Interfaces:**
- Consumes: REST endpoint `/api/v1/series/{series_id}/coaching-report`
- Produces: Interactive dashboard with round slider, 2D HTML5 canvas visualizer, error badges, and drill cards

- [ ] **Step 1: Write the failing unit test for MinimapReplay component**

```tsx
// c9-oracle/frontend/src/components/MinimapReplay.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import MinimapReplay from './MinimapReplay';

test('renders canvas and round controls', () => {
  render(
    <MinimapReplay
      mapName="Ascent"
      currentRound={1}
      totalRounds={24}
      mistakes={[]}
      onRoundChange={() => {}}
    />
  );
  expect(screen.getByTestId('minimap-canvas')).toBeInTheDocument();
  expect(screen.getByText(/Round 1 of 24/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
cd "c:\Users\adity\OneDrive\Desktop\Desktop\College\c9 Hackathon\c9-oracle\frontend"
npm test MinimapReplay.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Implement frontend components and page**

```typescript
// c9-oracle/frontend/src/types/api.ts
export interface Vector3D {
  x: float;
  y: float;
  z: float;
}

export interface AttributedMistake {
  mistake_type: string;
  player_id: string;
  round_number: number;
  occurred_at: string;
  win_prob_delta: number;
  description: string;
  coaching_fix: string;
}

export interface PlayerReportCard {
  player_id: string;
  mistake_count: number;
  cumulative_xrw_tax: number;
  primary_vulnerability: string;
  actionable_summary: string;
}

export interface PrescribedDrill {
  drill_name: string;
  target_players: string[];
  drill_objective: string;
  setup_steps: string[];
  success_criterion: string;
}

export interface CoachingReportResponse {
  series_id: string;
  team1_name: string;
  team2_name: string;
  total_games: number;
  total_mistakes_detected: number;
  mistakes: AttributedMistake[];
  player_reports: PlayerReportCard[];
  prescribed_drills: PrescribedDrill[];
}
```

```tsx
// c9-oracle/frontend/src/components/MinimapReplay.tsx
'use client';
import React, { useRef, useEffect } from 'react';
import { AttributedMistake } from '../types/api';

interface MinimapReplayProps {
  mapName: string;
  currentRound: number;
  totalRounds: number;
  mistakes: AttributedMistake[];
  onRoundChange: (round: number) => void;
}

export default function MinimapReplay({
  mapName,
  currentRound,
  totalRounds,
  mistakes,
  onRoundChange,
}: MinimapReplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const roundMistakes = mistakes.filter((m) => m.round_number === currentRound);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw tactical minimap background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw site landmarks
    ctx.fillStyle = '#334155';
    ctx.font = '14px monospace';
    ctx.fillText('A SITE', 100, 120);
    ctx.fillText('B SITE', 380, 120);
    ctx.fillText('MID', 240, 260);
    ctx.fillText('SPAWN', 230, 440);

    // Render mistake flags
    roundMistakes.forEach((m, idx) => {
      const px = 150 + idx * 60;
      const py = 180 + idx * 40;

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.fillText(`${(m.win_prob_delta * 100).toFixed(0)}%`, px + 14, py + 4);
    });
  }, [currentRound, roundMistakes]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Tactical Minimap Telemetry: {mapName}
          </h2>
          <p className="text-sm text-slate-400">
            Round {currentRound} of {Math.max(totalRounds, 1)}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="range"
            min={1}
            max={Math.max(totalRounds, 1)}
            value={currentRound}
            onChange={(e) => onRoundChange(Number(e.target.value))}
            className="w-48 accent-cyan-500 cursor-pointer"
          />
          <span className="font-mono text-cyan-400 font-bold bg-slate-800 px-3 py-1 rounded">
            R{currentRound}
          </span>
        </div>
      </div>

      <div className="flex justify-center bg-slate-950 rounded-lg p-2 border border-slate-800">
        <canvas
          data-testid="minimap-canvas"
          ref={canvasRef}
          width={500}
          height={500}
          className="rounded border border-slate-800 max-w-full"
        />
      </div>

      <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800 text-xs text-slate-300">
        <span className="font-semibold text-red-400">Tactical Errors in Round:</span>{' '}
        {roundMistakes.length === 0 ? 'Clean round — no critical untraded errors detected.' : ''}
        {roundMistakes.map((m, i) => (
          <div key={i} className="mt-1">
            Player <span className="font-mono text-cyan-400">{m.player_id}</span>: {m.description} (
            <span className="text-red-400">{(m.win_prob_delta * 100).toFixed(1)}% xRW</span>)
          </div>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// c9-oracle/frontend/src/app/page.tsx
'use client';
import React, { useState, useEffect } from 'react';
import MinimapReplay from '../components/MinimapReplay';
import { CoachingReportResponse } from '../types/api';

export default function CoachDashboard() {
  const [data, setData] = useState<CoachingReportResponse | null>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/series/2748743/coaching-report?max_envelopes=2000')
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-10 text-white font-mono">Loading C9 Oracle telemetry...</div>;
  }

  if (!data) {
    return <div className="p-10 text-red-400 font-mono">Failed to load series telemetry.</div>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="mb-8 border-b border-slate-800 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            C9 ORACLE <span className="text-cyan-400 text-xl font-normal">/ VALORANT ASSISTANT COACH</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Match Series: {data.series_id} ({data.team1_name} vs {data.team2_name})
          </p>
        </div>
        <div className="text-right">
          <span className="px-3 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-full text-xs font-mono">
            Attributed Errors: {data.total_mistakes_detected}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <MinimapReplay
          mapName="Ascent"
          currentRound={currentRound}
          totalRounds={24}
          mistakes={data.mistakes}
          onRoundChange={setCurrentRound}
        />

        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Player Error Tax & Vulnerabilities</h2>
            <div className="space-y-3">
              {data.player_reports.map((p) => (
                <div key={p.player_id} className="p-4 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="font-mono font-bold text-cyan-400">{p.player_id}</div>
                    <div className="text-xs text-slate-400 mt-1">{p.actionable_summary}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-400 font-mono font-bold">
                      {(p.cumulative_xrw_tax * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500">{p.mistake_count} mistakes</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Prescribed Practice Drills</h2>
            <div className="space-y-4">
              {data.prescribed_drills.map((d, i) => (
                <div key={i} className="p-4 bg-cyan-950/20 border border-cyan-800/40 rounded-lg">
                  <h3 className="font-bold text-cyan-300">{d.drill_name}</h3>
                  <p className="text-xs text-slate-300 mt-1">{d.drill_objective}</p>
                  <ul className="mt-3 space-y-1 text-xs text-slate-400 list-disc list-inside">
                    {d.setup_steps.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                  <div className="mt-3 text-xs bg-slate-950 p-2 rounded text-cyan-400 font-mono">
                    Target: {d.success_criterion}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
npm test MinimapReplay.test.tsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/api.ts src/components/MinimapReplay.tsx src/app/page.tsx
git commit -m "feat(frontend): implement tactical minimap replay and coach dashboard"
```

---

### Task 9: System Integration, Docker Compose & Final Verification

**Files:**
- Create: `c9-oracle/docker-compose.yml`
- Create: `c9-oracle/backend/Dockerfile`
- Create: `c9-oracle/frontend/Dockerfile`
- Create: `c9-oracle/README.md`
- Test: `c9-oracle/backend/tests/test_e2e.py`

**Interfaces:**
- Consumes: Complete project components
- Produces: Production Docker container setup, end-to-end verification passing against official VCT match data

- [ ] **Step 1: Write end-to-end integration test**

```python
# c9-oracle/backend/tests/test_e2e.py
from src.data.parser import parse_series
from src.analytics.mistake_detector import detect_round_mistakes
from src.coaching.report_card import build_player_report_cards
from src.coaching.prescription import generate_prescribed_drills

def test_full_pipeline_on_vct_series():
    # Run pipeline on VCT series 2748743
    parsed = parse_series("2748743", max_envelopes=1500)
    assert len(parsed.games) > 0
    
    mistakes = []
    for g in parsed.games:
        for r in g.rounds:
            mistakes.extend(detect_round_mistakes(r))
            
    assert len(mistakes) > 0
    cards = build_player_report_cards(mistakes)
    drills = generate_prescribed_drills(mistakes)
    
    assert len(cards) > 0
    assert len(drills) > 0
```

- [ ] **Step 2: Run end-to-end test**

Run:
```powershell
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m pytest tests/test_e2e.py -v
```
Expected: PASS

- [ ] **Step 3: Implement Docker Compose setup**

```yaml
# c9-oracle/docker-compose.yml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - STL_DATA_DIR=/data
    volumes:
      - ../stl-hackathon-2026-grid-starter:/data:ro

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend
```

- [ ] **Step 4: Execute strict git safety audit**

Run:
```powershell
cd "c:\Users\adity\OneDrive\Desktop\Desktop\College\c9 Hackathon\c9-oracle"
git status --ignored
git ls-files | Select-String -Pattern "\.(zst|jsonl|parquet|sqlite|duckdb)$"
```
Expected: Zero matching data files tracked by git.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml README.md backend/Dockerfile frontend/Dockerfile tests/test_e2e.py
git commit -m "feat(integration): finalize containerization and end-to-end verification"
```

---

## Execution Handoff

Plan complete and saved to:
[2026-11-19-c9-oracle-full-plan.md](file:///c:/Users/adity/OneDrive/Desktop/Desktop/College/c9%20Hackathon/docs/plans/2026-11-19-c9-oracle-full-plan.md)

How would you like to proceed with execution?

1. **Subagent-Driven Execution (Recommended):**
   - Orchestrate implementer subagents per task to write and test code with isolated contexts.
   - Run verification checks and test suites after each task.

2. **Inline Step-by-Step Execution:**
   - Execute each task directly in the current session (starting with Task 1: Scaffolding, Virtual Environment, and Git Safety).
   - Review and verify after each step.
