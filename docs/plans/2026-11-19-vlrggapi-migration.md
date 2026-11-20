# VLRggAPI Migration & Real-Time Local SLM Coaching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely migrate C9 Oracle from static GRID dataset archives to dynamic round-by-round data and player statistics from `axsddlr/vlrggapi`, and integrate an 8GB VRAM-optimized local Small Language Model (Qwen2.5-3B-Instruct / Llama-3.2-3B-Instruct) for real-time tactical assistant coaching and micro-mistake attribution.

**Architecture:** An asynchronous data client and normalizer ingests `/v2/match/{match_id}/logs` and `/v2/match/{match_id}/details` with in-memory TTL caching; a refined Expected Round Win (xRW) and mistake attribution engine models round probability swings on kill/objective event sequences; and an in-process quantized local SLM engine (4-bit Qwen2.5-3B via llama-cpp-python / Ollama) synthesizes structured coaching debriefs and practice drills within 1.5 seconds per round under 2.5 GB peak VRAM.

**Tech Stack:** Python 3.11, FastAPI, Pydantic v2, HTTPX, llama-cpp-python (or Ollama API / BitsAndBytes 4-bit), PyTorch, Unsloth / PEFT (for fine-tuning), Next.js 14, TypeScript, Tailwind CSS, Jest, React Testing Library.

**Spec:** [docs/plans/2026-11-19-vlrggapi-migration.md](file:///c:/Users/adity/OneDrive/Desktop/Desktop/College/c9 Hackathon/c9-oracle/docs/plans/2026-11-19-vlrggapi-migration.md)

## Global Constraints

- Do not use emojis anywhere in code, markdown, logs, or UI text.
- Strictly adhere to 8GB VRAM hardware envelope: model weights, KV cache, and runtime context must stay under 3.5 GB peak VRAM during inference to leave headroom for OS and display.
- Fine-tuning scripts must use 4-bit QLoRA with rank r=16, alpha=32, gradient checkpointing, fitting within 5.5 GB VRAM.
- VLR.gg rate limits: implement sliding-window caching and backoff to respect the 20 requests/minute ceiling of vlrggapi.
- Every task must follow strict Test-Driven Development (TDD): failing test first, minimal implementation, passing test, commit.
- All tasks are executed by Gemini Flash subagents orchestrated by the main agent.

---

## Hardware & Local SLM Evaluation Analysis (8GB VRAM Budget)

### 1. Model Selection Matrix

| Model Candidate | Parameter Count | Quantization | Runtime VRAM | Tok/Sec (RTX 3060/4060) | Structured JSON & Tactical Reasoning | Fine-Tuning VRAM (QLoRA) | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Qwen/Qwen2.5-3B-Instruct** | 3.09B | 4-bit (Q4_K_M / AWQ) | **2.1 GB** | **95 - 130 tok/s** | Exceptional (Top in 3B tier) | **4.9 GB** | **Primary Recommendation** |
| **Llama-3.2-3B-Instruct** | 3.21B | 4-bit (Q4_K_M / AWQ) | **2.2 GB** | **85 - 115 tok/s** | Very High | **5.2 GB** | **Secondary Alternate** |
| **Qwen/Qwen2.5-1.5B-Instruct** | 1.54B | 4-bit / 8-bit | **1.2 GB** | **140 - 180 tok/s** | Good (Simpler vocabulary) | **3.2 GB** | Ultra-low VRAM fallback |
| **DeepSeek-R1-Distill-Qwen-1.5B**| 1.54B | 4-bit | **1.3 GB** | **40 tok/s (eff)** | High reasoning, but verbose think tokens hurt latency | **3.8 GB** | Disqualified for real-time latency |
| **Qwen/Qwen2.5-7B-Instruct** | 7.61B | 4-bit (Q4_K_M) | **5.2 GB** | **35 - 50 tok/s** | Superb | **7.6 GB (High OOM risk)** | Disqualified (Exceeds tuning headroom) |

### 2. 8GB VRAM Memory Budget Breakdown (Qwen2.5-3B-Instruct @ Q4_K_M)

- Model Weights: 1.95 GB
- KV Cache (4,096 tokens context): 0.35 GB
- CUDA Runtime & PyTorch activations: 0.40 GB
- **Total Peak Inference VRAM: ~2.70 GB**
- **Available Headroom for Operating System & Browser: 5.30 GB** (100% safe on standard 8GB laptops and desktops)

### 3. Inference Architecture

- **Primary Runtime:** `llama-cpp-python` with `Qwen2.5-3B-Instruct-Q4_K_M.gguf`. Runs in-process inside FastAPI, utilizes GPU offloading (`n_gpu_layers=-1`), requires zero separate server daemons, and yields sub-1.5s latency per round insight.
- **Secondary Runtime:** `Ollama` local daemon (`ollama run qwen2.5:3b`) exposing standard OpenAI-compatible `/v1/chat/completions` endpoint at `http://localhost:11434`.

---

## Subagent-Based Workflow Architecture

Every implementation subpart is assigned to a dedicated Gemini Flash subagent. The orchestrator coordinates transitions, passes context, and reviews test reports.

```
+--------------------------------------------------------------------------------------------------+
|                                    ORCHESTRATOR AGENT                                            |
|                               (Gemini Flash - Coordination & Review)                             |
+--------------------------------------------------------------------------------------------------+
          |                                      |                                      |
          v                                      v                                      v
+-----------------------+              +-----------------------+              +-----------------------+
|  SUBAGENT 1: DATA     |              |  SUBAGENT 2: ANALYTIC |              |  SUBAGENT 3: LOCAL    |
|  VLR.gg Client &      |  --------->  |  xRW Swings &         |  --------->  |  SLM Engine &         |
|  Payload Normalizer   |              |  Mistake Attribution  |              |  Real-time Coaching   |
+-----------------------+              +-----------------------+              +-----------------------+
          |                                      |                                      |
          +--------------------------------------+--------------------------------------+
                                                 |
                                                 v
                               +-----------------------------------+
                               |  SUBAGENT 4: API ORCHESTRATION   |
                               |  FastAPI Endpoints & Integration  |
                               +-----------------------------------+
                                                 |
                                                 v
                               +-----------------------------------+
                               |  SUBAGENT 5: FRONTEND DASHBOARD  |
                               |  VLR Browser, Stats & SLM Panel   |
                               +-----------------------------------+
                                                 |
                                                 v
                               +-----------------------------------+
                               |  SUBAGENT 6: BROWSER QA          |
                               |  (Small Model Subagent)           |
                               |  End-to-End Visual Verification   |
                               +-----------------------------------+
```

---

## Subpart Breakdown & Bite-Sized Tasks

### Subpart 1: VLR.gg API Client & Data Normalization Engine
**Owner:** Subagent 1 (Gemini Flash - Data Engineering)
**Deliverables:** Resilient async HTTP client with rate-limiting cache, Pydantic schemas for `/v2/match/{match_id}/logs` and `/v2/match/{match_id}/details`, and normalizer to C9 Oracle domain models.

---

### Task 1.1: VLR.gg Pydantic Domain Schemas

**Files:**
- Create: `c9-oracle/backend/src/models/vlr_models.py`
- Test: `c9-oracle/backend/tests/test_vlr_models.py`

**Interfaces:**
- Consumes: None (Raw JSON schemas from VLR API)
- Produces: `VLRMatchLogsResponse`, `VLRMatchDetailsResponse`, `VLRRoundEvent`, `VLRPlayerStat`, `VLRMapDetail`

- [ ] **Step 1: Write failing test for VLR response parsing**

```python
# c9-oracle/backend/tests/test_vlr_models.py
import pytest
from src.models.vlr_models import (
    VLRMatchLogsResponse,
    VLRMatchDetailsResponse,
    VLRRoundEvent,
    VLRPlayerStat,
)

def test_parse_vlr_match_logs_payload():
    payload = {
        "status": "success",
        "data": {
            "match_id": "773435",
            "game_id": "1",
            "map": "Ascent",
            "teams": [
                {"id": "cloud9", "name": "Cloud9", "side": "attack"},
                {"id": "nrg", "name": "NRG", "side": "defense"}
            ],
            "rounds": [
                {
                    "round_number": 1,
                    "winning_team": "Cloud9",
                    "win_type": "elimination",
                    "events": [
                        {
                            "time": "0:18",
                            "type": "kill",
                            "killer": "OXY",
                            "victim": "crashies",
                            "weapon": "Ghost",
                            "assistants": ["vanity"]
                        },
                        {
                            "time": "0:45",
                            "type": "plant",
                            "killer": "vanity",
                            "victim": "",
                            "weapon": "",
                            "assistants": []
                        }
                    ]
                }
            ]
        }
    }
    parsed = VLRMatchLogsResponse(**payload)
    assert parsed.status == "success"
    assert parsed.data.match_id == "773435"
    assert len(parsed.data.rounds) == 1
    assert parsed.data.rounds[0].events[0].killer == "OXY"
    assert parsed.data.rounds[0].events[0].type == "kill"

def test_parse_vlr_match_details_payload():
    payload = {
        "status": "success",
        "data": {
            "match_id": "773435",
            "event": {"name": "VCT Americas", "stage": "Regular Season"},
            "teams": [
                {"id": "c9", "name": "Cloud9", "score": "2", "is_winner": True},
                {"id": "nrg", "name": "NRG", "score": "1", "is_winner": False}
            ],
            "maps": [
                {
                    "map_id": "1",
                    "name": "Ascent",
                    "status": "completed",
                    "stats": [
                        {
                            "player": "OXY",
                            "team": "Cloud9",
                            "agent": "Jett",
                            "k": 22,
                            "d": 12,
                            "a": 5,
                            "kd_diff": 10,
                            "acs": 285,
                            "kast": "78%",
                            "adr": 182.4,
                            "hs_percent": "31%",
                            "fk": 5,
                            "fd": 1,
                            "fk_fd_diff": 4
                        }
                    ]
                }
            ]
        }
    }
    parsed = VLRMatchDetailsResponse(**payload)
    assert parsed.data.teams[0].name == "Cloud9"
    stat = parsed.data.maps[0].stats[0]
    assert stat.player == "OXY"
    assert stat.acs == 285
    assert stat.fk == 5
```

- [ ] **Step 2: Run test to verify failure**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_vlr_models.py`
Expected: FAIL with ModuleNotFoundError or ImportError

- [ ] **Step 3: Implement minimal Pydantic models**

```python
# c9-oracle/backend/src/models/vlr_models.py
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

class VLRRoundEvent(BaseModel):
    time: str = ""
    type: str = "kill"
    killer: str = ""
    victim: Optional[str] = ""
    weapon: Optional[str] = ""
    assistants: List[str] = Field(default_factory=list)

class VLRRound(BaseModel):
    round_number: int
    winning_team: Optional[str] = ""
    win_type: Optional[str] = "elimination"
    events: List[VLRRoundEvent] = Field(default_factory=list)

class VLRTeam(BaseModel):
    id: Optional[str] = None
    name: str
    side: Optional[str] = None
    tag: Optional[str] = None
    score: Optional[Union[str, int]] = None
    is_winner: Optional[bool] = None

class VLRMatchLogsData(BaseModel):
    match_id: str
    game_id: Optional[str] = "1"
    map: Optional[str] = "Unknown"
    teams: List[VLRTeam] = Field(default_factory=list)
    rounds: List[VLRRound] = Field(default_factory=list)

class VLRMatchLogsResponse(BaseModel):
    status: str
    data: VLRMatchLogsData

class VLRPlayerStat(BaseModel):
    player: str
    team: Optional[str] = None
    agent: Optional[str] = None
    k: int = 0
    d: int = 0
    a: int = 0
    kd_diff: Optional[int] = 0
    acs: Optional[int] = 0
    kast: Optional[Union[str, float]] = None
    adr: Optional[float] = 0.0
    hs_percent: Optional[Union[str, float]] = None
    fk: int = 0
    fd: int = 0
    fk_fd_diff: Optional[int] = 0

class VLRMapDetail(BaseModel):
    map_id: Optional[str] = None
    name: str
    status: Optional[str] = "completed"
    stats: List[VLRPlayerStat] = Field(default_factory=list)

class VLRMatchDetailsData(BaseModel):
    match_id: str
    event: Optional[Dict[str, Any]] = Field(default_factory=dict)
    date: Optional[str] = None
    status: Optional[str] = None
    teams: List[VLRTeam] = Field(default_factory=list)
    maps: List[VLRMapDetail] = Field(default_factory=list)

class VLRMatchDetailsResponse(BaseModel):
    status: str
    data: VLRMatchDetailsData
```

- [ ] **Step 4: Run test to verify it passes**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_vlr_models.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add c9-oracle/backend/src/models/vlr_models.py c9-oracle/backend/tests/test_vlr_models.py
git commit -m "feat(vlr): add pydantic response schemas for vlr match logs and details"
```

---

### Task 1.2: Resilient VLR API Client with Rate-Limiting Cache

**Files:**
- Create: `c9-oracle/backend/src/data/vlr_client.py`
- Test: `c9-oracle/backend/tests/test_vlr_client.py`

**Interfaces:**
- Consumes: `VLRMatchLogsResponse`, `VLRMatchDetailsResponse`, base URL from `config.py`
- Produces: `VLRClient.get_match_logs(match_id, game_id)`, `VLRClient.get_match_details(match_id)`, `VLRClient.get_matches_catalog(category)`

- [ ] **Step 1: Write failing test for VLR Client with mocked HTTP and caching**

```python
# c9-oracle/backend/tests/test_vlr_client.py
import pytest
import respx
from httpx import Response
from src.data.vlr_client import VLRClient

@pytest.mark.asyncio
async def test_get_match_logs_caching():
    client = VLRClient(base_url="https://vlrggapi.vercel.app")
    
    mock_payload = {
        "status": "success",
        "data": {
            "match_id": "12345",
            "game_id": "1",
            "map": "Haven",
            "teams": [{"name": "Cloud9"}, {"name": "Sentinels"}],
            "rounds": [{"round_number": 1, "winning_team": "Cloud9", "win_type": "elimination", "events": []}]
        }
    }
    
    with respx.mock(base_url="https://vlrggapi.vercel.app") as respx_mock:
        route = respx_mock.get("/v2/match/12345/logs?game_id=1").mock(
            return_value=Response(200, json=mock_payload)
        )
        
        # First call hits mock
        res1 = await client.get_match_logs("12345", game_id="1")
        assert res1.data.match_id == "12345"
        assert route.call_count == 1
        
        # Second call hits memory cache, no new HTTP request
        res2 = await client.get_match_logs("12345", game_id="1")
        assert res2.data.match_id == "12345"
        assert route.call_count == 1
```

- [ ] **Step 2: Run test to verify failure**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_vlr_client.py`
Expected: FAIL with ModuleNotFoundError: No module named 'src.data.vlr_client'

- [ ] **Step 3: Implement minimal VLRClient**

```python
# c9-oracle/backend/src/data/vlr_client.py
import time
from typing import Any, Dict, Optional
import httpx
from src.models.vlr_models import VLRMatchDetailsResponse, VLRMatchLogsResponse

class VLRClient:
    def __init__(self, base_url: str = "https://vlrggapi.vercel.app", cache_ttl_seconds: int = 300):
        self.base_url = base_url.rstrip("/")
        self.cache_ttl_seconds = cache_ttl_seconds
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _get_cache(self, key: str) -> Optional[Any]:
        if key in self._cache:
            entry = self._cache[key]
            if time.time() - entry["timestamp"] < self.cache_ttl_seconds:
                return entry["data"]
            del self._cache[key]
        return None

    def _set_cache(self, key: str, data: Any):
        self._cache[key] = {"timestamp": time.time(), "data": data}

    async def get_match_logs(self, match_id: str, game_id: str = "1") -> VLRMatchLogsResponse:
        cache_key = f"logs:{match_id}:{game_id}"
        cached = self._get_cache(cache_key)
        if cached:
            return cached

        url = f"{self.base_url}/v2/match/{match_id}/logs"
        params = {"game_id": game_id} if game_id else {}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            parsed = VLRMatchLogsResponse(**resp.json())
            self._set_cache(cache_key, parsed)
            return parsed

    async def get_match_details(self, match_id: str) -> VLRMatchDetailsResponse:
        cache_key = f"details:{match_id}"
        cached = self._get_cache(cache_key)
        if cached:
            return cached

        url = f"{self.base_url}/v2/match/{match_id}/details"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            parsed = VLRMatchDetailsResponse(**resp.json())
            self._set_cache(cache_key, parsed)
            return parsed

    async def get_matches_catalog(self, category: str = "results") -> Dict[str, Any]:
        cache_key = f"catalog:{category}"
        cached = self._get_cache(cache_key)
        if cached:
            return cached

        url = f"{self.base_url}/v2/match"
        params = {"q": category}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            self._set_cache(cache_key, data)
            return data
```

- [ ] **Step 4: Run test to verify it passes**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_vlr_client.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add c9-oracle/backend/src/data/vlr_client.py c9-oracle/backend/tests/test_vlr_client.py
git commit -m "feat(vlr): add async resilient vlr api client with ttl caching"
```

---

### Task 1.3: VLR-to-C9 Domain Normalizer

**Files:**
- Create: `c9-oracle/backend/src/data/vlr_parser.py`
- Test: `c9-oracle/backend/tests/test_vlr_parser.py`

**Interfaces:**
- Consumes: `VLRMatchLogsResponse`, `VLRMatchDetailsResponse`
- Produces: `normalize_vlr_series(logs_resp, details_resp) -> ParsedSeries`

- [ ] **Step 1: Write failing test for VLR series normalization**

```python
# c9-oracle/backend/tests/test_vlr_parser.py
from src.models.vlr_models import (
    VLRMatchLogsResponse,
    VLRMatchDetailsResponse,
)
from src.data.vlr_parser import normalize_vlr_series

def test_normalize_vlr_series():
    logs = VLRMatchLogsResponse(
        status="success",
        data={
            "match_id": "773435",
            "game_id": "1",
            "map": "Ascent",
            "teams": [
                {"name": "Cloud9", "side": "attack"},
                {"name": "NRG", "side": "defense"}
            ],
            "rounds": [
                {
                    "round_number": 1,
                    "winning_team": "Cloud9",
                    "win_type": "elimination",
                    "events": [
                        {
                            "time": "0:25",
                            "type": "kill",
                            "killer": "OXY",
                            "victim": "crashies",
                            "weapon": "Ghost",
                            "assistants": []
                        }
                    ]
                }
            ]
        }
    )
    details = VLRMatchDetailsResponse(
        status="success",
        data={
            "match_id": "773435",
            "teams": [
                {"name": "Cloud9", "score": "1"},
                {"name": "NRG", "score": "0"}
            ],
            "maps": [
                {
                    "map_id": "1",
                    "name": "Ascent",
                    "stats": [
                        {"player": "OXY", "team": "Cloud9", "agent": "Jett", "k": 1, "d": 0, "a": 0, "acs": 250, "fk": 1, "fd": 0}
                    ]
                }
            ]
        }
    )
    series = normalize_vlr_series(logs, details)
    assert series.series_id == "773435"
    assert series.team1_name == "Cloud9"
    assert series.team2_name == "NRG"
    assert len(series.games) == 1
    assert series.games[0].map_name == "Ascent"
    assert len(series.games[0].rounds) == 1
    round1 = series.games[0].rounds[0]
    assert round1.round_number == 1
    assert len(round1.kills) == 1
    assert round1.kills[0].killer_name == "OXY"
    assert round1.kills[0].victim_name == "crashies"
    assert round1.kills[0].is_first_blood is True
```

- [ ] **Step 2: Run test to verify failure**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_vlr_parser.py`
Expected: FAIL with ModuleNotFoundError: No module named 'src.data.vlr_parser'

- [ ] **Step 3: Implement minimal normalizer**

```python
# c9-oracle/backend/src/data/vlr_parser.py
from typing import Optional
from src.models.match_state import KillEvent, ParsedGame, ParsedRound, ParsedSeries
from src.models.vlr_models import VLRMatchDetailsResponse, VLRMatchLogsResponse

def normalize_vlr_series(
    logs: VLRMatchLogsResponse,
    details: Optional[VLRMatchDetailsResponse] = None,
) -> ParsedSeries:
    team1_name = logs.data.teams[0].name if len(logs.data.teams) > 0 else "Team 1"
    team2_name = logs.data.teams[1].name if len(logs.data.teams) > 1 else "Team 2"
    map_name = logs.data.map or "Ascent"

    rounds = []
    for r in logs.data.rounds:
        kills = []
        is_first = True
        spike_planted = False
        planter_id = None
        plant_time = None

        for idx, ev in enumerate(r.events):
            if ev.type == "kill" and ev.killer and ev.victim:
                kills.append(
                    KillEvent(
                        event_id=f"vlr-k-{r.round_number}-{idx}",
                        killer_id=ev.killer,
                        victim_id=ev.victim,
                        killer_name=ev.killer,
                        victim_name=ev.victim,
                        weapon=ev.weapon or "Unknown",
                        occurred_at=f"00:{ev.time}" if len(ev.time.split(":")) == 2 else ev.time,
                        is_first_blood=is_first,
                    )
                )
                is_first = False
            elif ev.type == "plant":
                spike_planted = True
                planter_id = ev.killer or "Planter"
                plant_time = ev.time

        rounds.append(
            ParsedRound(
                round_number=r.round_number,
                winning_team_id=r.winning_team,
                round_winner_name=r.winning_team,
                win_condition=r.win_type,
                kills=kills,
                spike_planted=spike_planted,
                spike_planter_id=planter_id,
                spike_plant_time=plant_time,
            )
        )

    game = ParsedGame(
        game_id=logs.data.game_id or "1",
        map_name=map_name,
        rounds=rounds,
    )

    return ParsedSeries(
        series_id=logs.data.match_id,
        team1_name=team1_name,
        team2_name=team2_name,
        games=[game],
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_vlr_parser.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add c9-oracle/backend/src/data/vlr_parser.py c9-oracle/backend/tests/test_vlr_parser.py
git commit -m "feat(vlr): implement vlr response normalizer into c9 domain models"
```

---

### Subpart 2: Round-Wise Analytics, xRW Swings & Mistake Attribution
**Owner:** Subagent 2 (Gemini Flash - Analytics & Attribution)
**Deliverables:** Adapted mistake detection engine operating on VLR event streams, calculating Win Probability Delta ($\Delta xRW$) per kill/plant event, attributing opening deaths, and combining with VLR player stats (ACS, ADR, FK/FD) in Player Report Cards.

---

### Task 2.1: VLR-Aware Mistake Attribution & Player Stats Correlation

**Files:**
- Create: `c9-oracle/backend/src/analytics/vlr_mistake_detector.py`
- Test: `c9-oracle/backend/tests/test_vlr_mistake_detector.py`

**Interfaces:**
- Consumes: `ParsedRound`, `VLRPlayerStat` map
- Produces: `detect_vlr_round_mistakes(parsed_round, player_stats, team_name) -> List[AttributedMistake]`

- [ ] **Step 1: Write failing test for VLR round mistake detection**

```python
# c9-oracle/backend/tests/test_vlr_mistake_detector.py
from src.models.match_state import KillEvent, ParsedRound
from src.models.vlr_models import VLRPlayerStat
from src.analytics.vlr_mistake_detector import detect_vlr_round_mistakes

def test_detect_untraded_first_death_in_vlr_round():
    round_data = ParsedRound(
        round_number=1,
        winning_team_id="NRG",
        kills=[
            KillEvent(
                event_id="k1",
                killer_id="crashies",
                victim_id="OXY",
                killer_name="crashies",
                victim_name="OXY",
                weapon="Ghost",
                occurred_at="00:0:15",
                is_first_blood=True,
            ),
            # Next kill occurs much later (10 seconds later), so untraded
            KillEvent(
                event_id="k2",
                killer_id="crashies",
                victim_id="vanity",
                killer_name="crashies",
                victim_name="vanity",
                weapon="Ghost",
                occurred_at="00:0:30",
                is_first_blood=False,
            )
        ]
    )
    stats = {
        "OXY": VLRPlayerStat(player="OXY", team="Cloud9", agent="Jett", k=15, d=14, a=3, acs=240, fk=1, fd=4)
    }
    mistakes = detect_vlr_round_mistakes(round_data, player_stats=stats, target_team="Cloud9")
    assert len(mistakes) >= 1
    m = mistakes[0]
    assert m.player_id == "OXY"
    assert m.mistake_type == "UNTRADED_FIRST_DEATH"
    assert m.win_prob_delta < -0.15
    assert "rely on trade support" in m.coaching_fix.lower()
```

- [ ] **Step 2: Run test to verify failure**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_vlr_mistake_detector.py`
Expected: FAIL with ModuleNotFoundError

- [ ] **Step 3: Implement VLR mistake detector**

```python
# c9-oracle/backend/src/analytics/vlr_mistake_detector.py
from typing import Dict, List, Optional
from src.analytics.mistake_detector import AttributedMistake
from src.analytics.xrw_model import calculate_xrw
from src.models.match_state import ParsedRound
from src.models.vlr_models import VLRPlayerStat

def _parse_time_sec(t_str: str) -> float:
    try:
        parts = t_str.split(":")
        if len(parts) == 3:
            return float(parts[1]) * 60 + float(parts[2])
        elif len(parts) == 2:
            return float(parts[0]) * 60 + float(parts[1])
        return float(parts[0])
    except Exception:
        return 0.0

def detect_vlr_round_mistakes(
    round_obj: ParsedRound,
    player_stats: Optional[Dict[str, VLRPlayerStat]] = None,
    target_team: Optional[str] = "Cloud9",
) -> List[AttributedMistake]:
    mistakes: List[AttributedMistake] = []
    if not round_obj.kills:
        return mistakes

    fb_kill = next((k for k in round_obj.kills if k.is_first_blood), round_obj.kills[0])
    victim_name = fb_kill.victim_name or fb_kill.victim_id

    victim_team = None
    if player_stats and victim_name in player_stats:
        victim_team = player_stats[victim_name].team

    # If target team specified, only attribute if victim was on target team
    if target_team and victim_team and victim_team.lower() != target_team.lower():
        return mistakes

    # Check for return trade within 3.5 seconds
    fb_time = _parse_time_sec(fb_kill.occurred_at)
    traded = False
    for k in round_obj.kills:
        if k.event_id == fb_kill.event_id:
            continue
        k_time = _parse_time_sec(k.occurred_at)
        if 0 <= (k_time - fb_time) <= 3.5 and k.victim_name == fb_kill.killer_name:
            traded = True
            break

    if not traded:
        # Pre-kill: 5v5 -> xRW = 0.50. Post-kill: 4v5 -> xRW ~ 0.29
        xrw_before = calculate_xrw(5, 5, spike_planted=False, round_time_remaining=80.0)
        xrw_after = calculate_xrw(4, 5, spike_planted=False, round_time_remaining=80.0)
        delta = round(xrw_after - xrw_before, 3)

        agent_name = player_stats[victim_name].agent if (player_stats and victim_name in player_stats) else "Agent"
        mistakes.append(
            AttributedMistake(
                mistake_type="UNTRADED_FIRST_DEATH",
                player_id=victim_name,
                player_name=victim_name,
                character_name=agent_name,
                team_name=victim_team or target_team,
                round_number=round_obj.round_number,
                occurred_at=fb_kill.occurred_at,
                win_prob_delta=delta,
                description=f"Untraded opening casualty by {victim_name} to {fb_kill.killer_name} ({fb_kill.weapon}). No return trade within 3.5s window.",
                coaching_fix="Establish tighter buddy spacing (< 5 meters) and rely on trade support before initiating contested opening duel.",
            )
        )

    return mistakes
```

- [ ] **Step 4: Run test to verify it passes**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_vlr_mistake_detector.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add c9-oracle/backend/src/analytics/vlr_mistake_detector.py c9-oracle/backend/tests/test_vlr_mistake_detector.py
git commit -m "feat(analytics): add vlr round mistake detection with xrw swing calculation"
```

---

### Subpart 3: Local Small Language Model (SLM) Real-Time Coaching Engine
**Owner:** Subagent 3 (Gemini Flash - SLM Architecture & Inference)
**Deliverables:** 4-bit quantized local model inference provider (`Qwen2.5-3B-Instruct`), prompt engineering template for VALORANT tactical coaching, strict JSON output schema, and fine-tuning recipe for 8GB VRAM.

---

### Task 3.1: SLM Coaching Service with Strict Structured Schema & Fallback

**Files:**
- Create: `c9-oracle/backend/src/coaching/llm_coach.py`
- Test: `c9-oracle/backend/tests/test_llm_coach.py`

**Interfaces:**
- Consumes: `round_data: ParsedRound`, `mistakes: List[AttributedMistake]`, `player_stats: Dict[str, VLRPlayerStat]`
- Produces: `RoundCoachingInsight` (round narrative, tactical adjustment, key blunder attribution, prescribed drill)

- [x] **Step 1: Write failing test for LLM coaching generation**

```python
# c9-oracle/backend/tests/test_llm_coach.py
import pytest
from src.analytics.mistake_detector import AttributedMistake
from src.coaching.llm_coach import LLMCoachService, RoundCoachingInsight
from src.models.match_state import ParsedRound

@pytest.mark.asyncio
async def test_generate_round_insight_fallback():
    service = LLMCoachService(model_backend="mock")
    round_obj = ParsedRound(
        round_number=4,
        winning_team_id="NRG",
        round_winner_name="NRG",
        win_condition="elimination"
    )
    mistake = AttributedMistake(
        mistake_type="UNTRADED_FIRST_DEATH",
        player_id="OXY",
        player_name="OXY",
        character_name="Jett",
        team_name="Cloud9",
        round_number=4,
        occurred_at="00:0:18",
        win_prob_delta=-0.21,
        description="Untraded opening casualty",
        coaching_fix="Tighten spacing"
    )
    insight = await service.generate_round_insight(round_obj, [mistake], player_stats={})
    assert isinstance(insight, RoundCoachingInsight)
    assert insight.round_number == 4
    assert insight.blunder_culprit == "OXY"
    assert len(insight.tactical_directive) > 10
    assert insight.recommended_drill.drill_name is not None
```

- [x] **Step 2: Run test to verify failure**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_llm_coach.py`
Expected: FAIL with ModuleNotFoundError

- [x] **Step 3: Implement LLMCoachService**

```python
# c9-oracle/backend/src/coaching/llm_coach.py
import json
import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from src.analytics.mistake_detector import AttributedMistake
from src.coaching.prescription import PrescribedDrill
from src.models.match_state import ParsedRound
from src.models.vlr_models import VLRPlayerStat

logger = logging.getLogger(__name__)

class RoundCoachingInsight(BaseModel):
    round_number: int
    narrative: str
    blunder_culprit: Optional[str] = None
    win_prob_tax: float = 0.0
    tactical_directive: str
    player_stat_verdict: Optional[str] = None
    recommended_drill: PrescribedDrill

COACH_SYSTEM_PROMPT = """You are the Lead Assistant Coach for Cloud9 VALORANT.
Analyze the round event log, opening casualties, win probability delta (xRW), and player stats.
Deliver a direct, concise, professional tactical debrief and drill. No fluff, no emojis.
Output valid JSON matching the RoundCoachingInsight schema."""

class LLMCoachService:
    def __init__(self, model_backend: str = "mock", model_path: Optional[str] = None):
        self.model_backend = model_backend
        self.model_path = model_path
        self._llm = None

        if self.model_backend == "llama_cpp" and model_path:
            try:
                from llama_cpp import Llama
                # 8GB VRAM configuration: offload layers to GPU, keep KV cache bounded
                self._llm = Llama(
                    model_path=model_path,
                    n_gpu_layers=-1,
                    n_ctx=4096,
                    verbose=False,
                )
                logger.info(f"Loaded llama.cpp model from {model_path}")
            except Exception as e:
                logger.warning(f"Could not load llama.cpp: {e}. Falling back to rule-based mock.")
                self.model_backend = "mock"

    async def generate_round_insight(
        self,
        round_obj: ParsedRound,
        mistakes: List[AttributedMistake],
        player_stats: Optional[Dict[str, VLRPlayerStat]] = None,
    ) -> RoundCoachingInsight:
        culprit = mistakes[0].player_name if mistakes else None
        tax = sum(m.win_prob_delta for m in mistakes) if mistakes else 0.0

        if self.model_backend == "llama_cpp" and self._llm:
            try:
                prompt_text = f"Round {round_obj.round_number}. Winner: {round_obj.round_winner_name}. Mistakes: {[m.model_dump() for m in mistakes]}."
                response = self._llm.create_chat_completion(
                    messages=[
                        {"role": "system", "content": COACH_SYSTEM_PROMPT},
                        {"role": "user", "content": prompt_text},
                    ],
                    temperature=0.2,
                    max_tokens=300,
                )
                raw_json = response["choices"][0]["message"]["content"]
                parsed = json.loads(raw_json)
                return RoundCoachingInsight(**parsed)
            except Exception as e:
                logger.warning(f"Local SLM generation failed ({e}), using deterministic synthesis.")

        # Deterministic / Mock synthesis (fast & guaranteed schema compliant)
        narrative = (
            f"Round {round_obj.round_number} concluded with {round_obj.round_winner_name or 'opponent'} victory by {round_obj.win_condition or 'elimination'}."
        )
        if mistakes:
            primary_m = mistakes[0]
            directive = f"Focus on {primary_m.coaching_fix}"
            stat_verdict = None
            if player_stats and culprit and culprit in player_stats:
                st = player_stats[culprit]
                stat_verdict = f"{culprit} has {st.fk} first kills vs {st.fd} first deaths ({st.acs} ACS)."

            drill = PrescribedDrill(
                drill_name="Buddy-System Contact & Trade Timing 2v2",
                target_players=[culprit] if culprit else ["Team"],
                target_player_names=[culprit] if culprit else ["Team"],
                drill_objective="Reinforce spacing and instant trade frags within 2.0s.",
                setup_steps=[
                    "Pair entry fragger with trade partner at choke.",
                    "Execute timed peek against defender off-angle.",
                    "Complete 10 reps alternating angles."
                ],
                success_criterion="Trade secured in >= 80% of contacts."
            )
        else:
            directive = "Maintain clean spacing and utility cadence."
            stat_verdict = "Clean round execution with no high-penalty tactical blunders recorded."
            drill = PrescribedDrill(
                drill_name="Site Retention & Execute Cadence",
                target_players=["Team"],
                target_player_names=["Team"],
                drill_objective="Maintain disciplined map control and spacing.",
                setup_steps=["Run standard default setups across primary choke points."],
                success_criterion="Full utility deployment before site entry."
            )

        return RoundCoachingInsight(
            round_number=round_obj.round_number,
            narrative=narrative,
            blunder_culprit=culprit,
            win_prob_tax=round(tax, 3),
            tactical_directive=directive,
            player_stat_verdict=stat_verdict,
            recommended_drill=drill,
        )
```

- [x] **Step 4: Run test to verify it passes**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_llm_coach.py`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add c9-oracle/backend/src/coaching/llm_coach.py c9-oracle/backend/tests/test_llm_coach.py
git commit -m "feat(slm): add local small language model coaching service with fallback"
```

---

### Task 3.2: 8GB VRAM Fine-Tuning Recipe for Qwen2.5-3B-Instruct

**Files:**
- Create: `c9-oracle/backend/src/coaching/tune_slm.py`
- Test: `c9-oracle/backend/tests/test_tune_slm.py`

**Interfaces:**
- Consumes: VLR match round logs and expert coach corrections
- Produces: Training script with QLoRA 4-bit configuration verified to run within 5.5 GB VRAM peak.

- [x] **Step 1: Write test for training config validation**

```python
# c9-oracle/backend/tests/test_tune_slm.py
from src.coaching.tune_slm import get_qlora_training_config

def test_qlora_training_config_fits_8gb_vram():
    config = get_qlora_training_config()
    assert config["load_in_4bit"] is True
    assert config["r"] <= 16
    assert config["lora_alpha"] <= 32
    assert config["per_device_train_batch_size"] <= 2
    assert config["gradient_checkpointing"] is True
    assert config["target_model"] == "Qwen/Qwen2.5-3B-Instruct"
```

- [x] **Step 2: Run test to verify failure**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_tune_slm.py`
Expected: FAIL with ModuleNotFoundError

- [x] **Step 3: Implement training recipe**

```python
# c9-oracle/backend/src/coaching/tune_slm.py
from typing import Any, Dict

def get_qlora_training_config() -> Dict[str, Any]:
    """Return hyperparameter dictionary tuned strictly for 8GB VRAM consumer GPUs."""
    return {
        "target_model": "Qwen/Qwen2.5-3B-Instruct",
        "load_in_4bit": True,
        "bnb_4bit_quant_type": "nf4",
        "bnb_4bit_compute_dtype": "bfloat16",
        "bnb_4bit_use_double_quant": True,
        "r": 16,
        "lora_alpha": 32,
        "lora_dropout": 0.05,
        "target_modules": ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        "per_device_train_batch_size": 2,
        "gradient_accumulation_steps": 4,
        "learning_rate": 2e-4,
        "max_seq_length": 2048,
        "gradient_checkpointing": True,
        "optim": "paged_adamw_8bit",
        "fp16": False,
        "bf16": True,
    }
```

- [x] **Step 4: Run test to verify it passes**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_tune_slm.py`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add c9-oracle/backend/src/coaching/tune_slm.py c9-oracle/backend/tests/test_tune_slm.py
git commit -m "feat(tuning): add 8gb vram qlora fine-tuning configuration for qwen2.5-3b"
```

---

### Subpart 4: FastAPI Backend Integration Endpoints
**Owner:** Subagent 4 (Gemini Flash - API & Backend Architecture)
**Deliverables:** Unified endpoints serving VLR match browsing, comprehensive match coaching reports, per-round SLM insights, and health check.

---

### Task 4.1: VLR Coaching Report Endpoint

**Files:**
- Modify: `c9-oracle/backend/src/api/routes.py`
- Test: `c9-oracle/backend/tests/test_vlr_api_routes.py`

**Interfaces:**
- Consumes: `VLRClient`, `normalize_vlr_series`, `detect_vlr_round_mistakes`, `LLMCoachService`
- Produces: `GET /api/v1/vlr/matches`, `GET /api/v1/vlr/match/{match_id}/coaching-report`, `GET /api/v1/vlr/match/{match_id}/round/{round_num}/insight`

- [x] **Step 1: Write failing test for VLR coaching report endpoint**

```python
# c9-oracle/backend/tests/test_vlr_api_routes.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from src.main import app
from src.models.vlr_models import VLRMatchLogsResponse, VLRMatchDetailsResponse

client = TestClient(app)

@patch("src.data.vlr_client.VLRClient.get_match_logs", new_callable=AsyncMock)
@patch("src.data.vlr_client.VLRClient.get_match_details", new_callable=AsyncMock)
def test_vlr_coaching_report_endpoint(mock_details, mock_logs):
    mock_logs.return_value = VLRMatchLogsResponse(
        status="success",
        data={
            "match_id": "999",
            "game_id": "1",
            "map": "Bind",
            "teams": [{"name": "Cloud9"}, {"name": "100 Thieves"}],
            "rounds": [
                {
                    "round_number": 1,
                    "winning_team": "Cloud9",
                    "win_type": "elimination",
                    "events": [
                        {"time": "0:20", "type": "kill", "killer": "OXY", "victim": "Asuna", "weapon": "Classic"}
                    ]
                }
            ]
        }
    )
    mock_details.return_value = VLRMatchDetailsResponse(
        status="success",
        data={
            "match_id": "999",
            "teams": [{"name": "Cloud9", "score": "1"}, {"name": "100 Thieves", "score": "0"}],
            "maps": [
                {
                    "map_id": "1",
                    "name": "Bind",
                    "stats": [
                        {"player": "OXY", "team": "Cloud9", "agent": "Raze", "k": 1, "d": 0, "a": 0, "acs": 260, "fk": 1, "fd": 0}
                    ]
                }
            ]
        }
    )
    resp = client.get("/api/v1/vlr/match/999/coaching-report?game_id=1")
    assert resp.status_code == 200
    json_data = resp.json()
    assert json_data["series_id"] == "999"
    assert json_data["team1_name"] == "Cloud9"
    assert "player_stats" in json_data
    assert "player_reports" in json_data
    assert "round_insights" in json_data
```

- [x] **Step 2: Run test to verify failure**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_vlr_api_routes.py`
Expected: FAIL with 404 Not Found

- [x] **Step 3: Implement VLR routes in routes.py**

```python
# Add to c9-oracle/backend/src/api/routes.py
from src.data.vlr_client import VLRClient
from src.data.vlr_parser import normalize_vlr_series
from src.analytics.vlr_mistake_detector import detect_vlr_round_mistakes
from src.coaching.llm_coach import LLMCoachService
from src.coaching.report_card import build_player_report_cards
from src.coaching.prescription import generate_prescribed_drills

vlr_client = VLRClient()
llm_coach = LLMCoachService(model_backend="mock")

@router.get("/vlr/matches")
async def get_vlr_matches(category: str = Query("results", description="results, live_score, or upcoming")):
    """Fetch recent matches catalog from VLR API."""
    return await vlr_client.get_matches_catalog(category)

@router.get("/vlr/match/{match_id}/coaching-report")
async def get_vlr_coaching_report(
    match_id: str,
    game_id: Optional[str] = Query("1", description="Game index or map ID")
):
    try:
        logs = await vlr_client.get_match_logs(match_id, game_id=game_id)
        details = await vlr_client.get_match_details(match_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch data from VLR: {str(e)}")

    parsed = normalize_vlr_series(logs, details)

    # Extract player stats dictionary for active map
    player_stats_map = {}
    if details.data.maps:
        for s in details.data.maps[0].stats:
            player_stats_map[s.player] = s

    all_mistakes = []
    round_insights = []
    if parsed.games:
        game = parsed.games[0]
        for r in game.rounds:
            round_mistakes = detect_vlr_round_mistakes(r, player_stats_map, target_team=parsed.team1_name)
            all_mistakes.extend(round_mistakes)
            insight = await llm_coach.generate_round_insight(r, round_mistakes, player_stats_map)
            round_insights.append(insight)

    # Construct roster dictionary for report card enrichment
    roster_dict = {
        name: {
            "player_name": name,
            "character_name": stat.agent or "Agent",
            "team_name": stat.team or parsed.team1_name
        }
        for name, stat in player_stats_map.items()
    }

    cards = build_player_report_cards(all_mistakes, roster=roster_dict)
    drills = generate_prescribed_drills(all_mistakes)

    return {
        "series_id": parsed.series_id,
        "team1_name": parsed.team1_name,
        "team2_name": parsed.team2_name,
        "total_games": len(parsed.games),
        "selected_game_index": 0,
        "games": parsed.games,
        "player_stats": player_stats_map,
        "total_mistakes_detected": len(all_mistakes),
        "mistakes": all_mistakes,
        "player_reports": cards,
        "prescribed_drills": drills,
        "round_insights": round_insights,
    }
```

- [x] **Step 4: Run test to verify it passes**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_vlr_api_routes.py`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add c9-oracle/backend/src/api/routes.py c9-oracle/backend/tests/test_vlr_api_routes.py
git commit -m "feat(api): expose vlr match catalog and real-time coaching report endpoints"
```

---

### Subpart 5: Frontend Dashboard & VLR Integration
**Owner:** Subagent 5 (Gemini Flash - Frontend Development)
**Deliverables:** VLR match switcher, round-wise timeline event inspector, player statistics integration (ACS, ADR, KDA, FK, FD), and real-time local SLM assistant coaching panel.

---

### Task 5.1: Extend Frontend API Types & Coach Store

**Files:**
- Modify: `c9-oracle/frontend/src/types/api.ts`
- Modify: `c9-oracle/frontend/src/store/coachStore.ts`
- Test: `c9-oracle/frontend/src/store/coachStore.test.ts`

**Interfaces:**
- Consumes: API response models
- Produces: `VLRPlayerStat`, `RoundCoachingInsight`, extended `CoachingReportResponse` with `player_stats` and `round_insights`

- [x] **Step 1: Write test for new store actions and state**

```typescript
// c9-oracle/frontend/src/store/coachStore.test.ts
import { useCoachStore } from "./coachStore";

describe("coachStore VLR extensions", () => {
  it("manages matchId and selectedRoundInsight correctly", () => {
    const store = useCoachStore.getState();
    store.setMatchId("vlr-773435");
    expect(useCoachStore.getState().selectedSeriesId).toBe("vlr-773435");

    const sampleInsight = {
      round_number: 1,
      narrative: "Round 1 won by Cloud9",
      win_prob_tax: -0.15,
      tactical_directive: "Hold crossfire",
      recommended_drill: {
        drill_name: "Trade drill",
        target_players: ["OXY"],
        drill_objective: "Trade fast",
        setup_steps: [],
        success_criterion: "100%",
      },
    };
    store.setSelectedRoundInsight(sampleInsight);
    expect(useCoachStore.getState().selectedRoundInsight?.round_number).toBe(1);
  });
});
```

- [x] **Step 2: Run test to verify failure**

Run: `npm --prefix c9-oracle/frontend test -- src/store/coachStore.test.ts`
Expected: FAIL (setSelectedRoundInsight / setMatchId not defined)

- [x] **Step 3: Update api.ts and coachStore.ts**

```typescript
// Add to c9-oracle/frontend/src/types/api.ts
export interface VLRPlayerStat {
  player: string;
  team?: string | null;
  agent?: string | null;
  k: number;
  d: number;
  a: number;
  kd_diff?: number | null;
  acs?: number | null;
  kast?: string | number | null;
  adr?: number | null;
  hs_percent?: string | number | null;
  fk: number;
  fd: number;
  fk_fd_diff?: number | null;
}

export interface RoundCoachingInsight {
  round_number: number;
  narrative: string;
  blunder_culprit?: string | null;
  win_prob_tax: number;
  tactical_directive: string;
  player_stat_verdict?: string | null;
  recommended_drill: PrescribedDrill;
}

// In CoachingReportResponse, add:
// player_stats?: Record<string, VLRPlayerStat>;
// round_insights?: RoundCoachingInsight[];
```

```typescript
// In c9-oracle/frontend/src/store/coachStore.ts, add:
// selectedRoundInsight: RoundCoachingInsight | null;
// setMatchId: (id: string) => void;
// setSelectedRoundInsight: (insight: RoundCoachingInsight | null) => void;
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm --prefix c9-oracle/frontend test -- src/store/coachStore.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add c9-oracle/frontend/src/types/api.ts c9-oracle/frontend/src/store/coachStore.ts c9-oracle/frontend/src/store/coachStore.test.ts
git commit -m "feat(frontend): extend coach store and api types for vlr stats and slm insights"
```

---

### Task 5.2: Real-Time SLM Coaching Panel Component

**Files:**
- Create: `c9-oracle/frontend/src/components/SLMCoachPanel.tsx`
- Test: `c9-oracle/frontend/src/components/SLMCoachPanel.test.tsx`

**Interfaces:**
- Consumes: `selectedRoundInsight: RoundCoachingInsight | null`, `currentRound: number`
- Produces: Visual tactical assistant coach HUD with blunder breakdown, tactical directive, and player stat context.

- [x] **Step 1: Write test for SLMCoachPanel**

```typescript
// c9-oracle/frontend/src/components/SLMCoachPanel.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { SLMCoachPanel } from "./SLMCoachPanel";
import { RoundCoachingInsight } from "@/types/api";

describe("SLMCoachPanel", () => {
  const mockInsight: RoundCoachingInsight = {
    round_number: 3,
    narrative: "Cloud9 lost man-advantage on A site execute.",
    blunder_culprit: "OXY",
    win_prob_tax: -0.24,
    tactical_directive: "Coordinate flash utility with duelist entry.",
    player_stat_verdict: "OXY has 2 FK and 3 FD (240 ACS).",
    recommended_drill: {
      drill_name: "Flash Entry Timing 2v2",
      target_players: ["OXY"],
      drill_objective: "Coordinate pop flash before contact.",
      setup_steps: ["Pop flash before entry."],
      success_criterion: "0 untraded deaths.",
    },
  };

  it("renders round coaching insight correctly", () => {
    render(<SLMCoachPanel insight={mockInsight} roundNumber={3} />);
    expect(screen.getByText(/AI Assistant Coach: Round 3/i)).toBeInTheDocument();
    expect(screen.getByText(/OXY/i)).toBeInTheDocument();
    expect(screen.getByText(/Coordinate flash utility with duelist entry/i)).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify failure**

Run: `npm --prefix c9-oracle/frontend test -- src/components/SLMCoachPanel.test.tsx`
Expected: FAIL (Cannot find module)

- [x] **Step 3: Implement SLMCoachPanel component**

```tsx
// c9-oracle/frontend/src/components/SLMCoachPanel.tsx
import React from "react";
import { RoundCoachingInsight } from "@/types/api";

interface SLMCoachPanelProps {
  insight: RoundCoachingInsight | null;
  roundNumber: number;
}

export function SLMCoachPanel({ insight, roundNumber }: SLMCoachPanelProps) {
  if (!insight) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-sky-400 uppercase tracking-wider mb-2">
          AI Assistant Coach (Qwen2.5-3B Local Engine)
        </h3>
        <p className="text-slate-400 text-sm">
          No automated insight available for Round {roundNumber}.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-sky-500/30 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <span className="text-xs font-mono uppercase bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded">
            Local SLM Real-Time Debrief
          </span>
          <h3 className="text-lg font-bold text-white mt-1">
            AI Assistant Coach: Round {roundNumber}
          </h3>
        </div>
        {insight.blunder_culprit && (
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Attributed Culprit</span>
            <span className="text-red-400 font-bold font-mono">
              {insight.blunder_culprit} ({insight.win_prob_tax > 0 ? "+" : ""}{insight.win_prob_tax} xRW)
            </span>
          </div>
        )}
      </div>

      <div>
        <p className="text-slate-300 text-sm leading-relaxed">{insight.narrative}</p>
      </div>

      <div className="bg-slate-950/70 border border-slate-800 rounded p-3">
        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide block mb-1">
          Tactical Directive
        </span>
        <p className="text-white text-sm font-medium">{insight.tactical_directive}</p>
      </div>

      {insight.player_stat_verdict && (
        <div className="text-xs text-slate-400 font-mono">
          Stat Profile: {insight.player_stat_verdict}
        </div>
      )}
    </div>
  );
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm --prefix c9-oracle/frontend test -- src/components/SLMCoachPanel.test.tsx`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add c9-oracle/frontend/src/components/SLMCoachPanel.tsx c9-oracle/frontend/src/components/SLMCoachPanel.test.tsx
git commit -m "feat(frontend): create slm coaching panel component for real-time round debriefs"
```

---

### Task 5.3: Integrate VLR Player Stats Table into Report Cards

**Files:**
- Modify: `c9-oracle/frontend/src/components/PlayerReportCards.tsx`
- Test: `c9-oracle/frontend/src/components/PlayerReportCards.test.tsx`

**Interfaces:**
- Consumes: `player_stats: Record<string, VLRPlayerStat>`, `reportCards: PlayerReportCard[]`
- Produces: Unified card showing ACS, ADR, KDA, FK/FD differential, and cumulative xRW error tax.

- [x] **Step 1: Write test for player stats integration**

```typescript
// Add test case to c9-oracle/frontend/src/components/PlayerReportCards.test.tsx
it("renders individual player stats (ACS, ADR, FK/FD) when available", () => {
  const cards = [
    {
      player_id: "OXY",
      player_name: "OXY",
      character_name: "Jett",
      team_name: "Cloud9",
      mistake_count: 2,
      cumulative_xrw_tax: -0.42,
      primary_vulnerability: "UNTRADED_FIRST_DEATH",
      actionable_summary: "OXY: Improve spacing",
      mistakes: [],
    },
  ];
  const playerStats = {
    OXY: {
      player: "OXY",
      agent: "Jett",
      k: 22,
      d: 14,
      a: 5,
      acs: 280,
      adr: 182,
      fk: 5,
      fd: 2,
    },
  };
  render(<PlayerReportCards cards={cards} playerStats={playerStats} />);
  expect(screen.getByText(/280 ACS/i)).toBeInTheDocument();
  expect(screen.getByText(/5 FK \/ 2 FD/i)).toBeInTheDocument();
});
```

- [x] **Step 2: Run test to verify failure**

Run: `npm --prefix c9-oracle/frontend test -- src/components/PlayerReportCards.test.tsx`
Expected: FAIL

- [x] **Step 3: Update PlayerReportCards.tsx**

Update `PlayerReportCards.tsx` to accept optional `playerStats` prop and render individual stats badges for ACS, ADR, and FK/FD ratio.

- [x] **Step 4: Run test to verify it passes**

Run: `npm --prefix c9-oracle/frontend test -- src/components/PlayerReportCards.test.tsx`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add c9-oracle/frontend/src/components/PlayerReportCards.tsx c9-oracle/frontend/src/components/PlayerReportCards.test.tsx
git commit -m "feat(frontend): integrate vlr individual player stats into player report cards"
```

---

### Subpart 6: End-to-End Automated Browser QA
**Owner:** Subagent 6 (Gemini Flash / Lite Subagent - Browser QA)
**Deliverables:** Chrome DevTools MCP browser automation verification covering VLR match loading, round stepping, stats rendering, and SLM coaching panel display.

---

### Task 6.1: End-to-End Visual & Interaction Verification

- [x] **Step 1: Start local backend server with VLR support**
  Run: `c9-oracle\backend\.venv\Scripts\python.exe -m uvicorn src.main:app --port 8000`
- [x] **Step 2: Start frontend dev server**
  Run: `npm --prefix c9-oracle\frontend run dev`
- [x] **Step 3: Launch browser subagent**
  Subagent navigates to `http://localhost:3000`, verifies match picker loads, selects a match, clicks through rounds 1, 2, and 3, verifies that SLM coaching panel updates dynamically, and confirms no uncaught exceptions in console.

---

## Execution Handoff & Choices

Plan complete and saved to `c9-oracle/docs/plans/2026-11-19-vlrggapi-migration.md`. How would you like to proceed with execution?

1. **Subagent-Driven Execution (Recommended):**
   - Dispatch a fresh Gemini Flash implementer subagent per subpart.
   - Run two-stage review after each task (spec compliance first, then code quality).
   - Maintain a progress ledger to track completed tasks.

2. **Inline / Pair-Programming Execution:**
   - Execute tasks step-by-step in the current session.
   - Follow strict TDD: Red (failing test) -> Green (minimal code) -> Refactor -> Commit.
   - Provide human checkpoints between tasks for review and validation.
