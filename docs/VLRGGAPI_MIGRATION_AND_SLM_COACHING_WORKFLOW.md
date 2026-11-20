# C9 Oracle: VLRggAPI Migration and Local SLM Coaching Workflow

This specification details the end-to-end architecture and subagent workflow for migrating C9 Oracle from local GRID match archives to live and historical round-wise telemetry from `axsddlr/vlrggapi`, combined with an 8GB VRAM-optimized local Small Language Model (SLM) for real-time tactical assistant coaching.

---

## 1. Executive Summary and Architecture Overview

The system transitions from static series feeds to dynamic data sourced from the `vlrggapi` REST wrapper. Telemetry is consumed at two levels:
1. **Round Logs:** Per-round event streams (kills, weapons, killers, victims, plant and defuse timestamps) from `GET /v2/match/{match_id}/logs`.
2. **Match Details and Player Stats:** Per-map player metrics (KDA, ACS, ADR, HS percentage, First Kills, First Deaths) from `GET /v2/match/{match_id}/details`.

A lightweight, quantized local model (`Qwen2.5-3B-Instruct` at 4-bit quantization) is integrated in-process using `llama-cpp-python` or via an Ollama daemon. The model generates sub-1.5-second tactical debriefs, blunder attributions, and prescriptive drills within a strict 3.0 GB VRAM runtime footprint.

```
+-----------------------------------------------------------------------------------------------+
|                                    axsddlr/vlrggapi                                           |
|       GET /v2/match/{id}/logs                   GET /v2/match/{id}/details                    |
+-----------------------------------------------------------------------------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
|                                VLR Client & Normalization Layer                               |
|   - Memory TTL Cache (300s) to protect against 20 req/min rate limit                          |
|   - Maps VLR payload into ParsedSeries, ParsedGame, ParsedRound, and VLRPlayerStat models     |
+-----------------------------------------------------------------------------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
|                                Analytics & Attribution Engine                                 |
|   - Round-wise Expected Round Win (xRW) delta tracking                                        |
|   - Untraded Opening Casualty Detection (3.5s return window)                                  |
|   - Player Report Card Aggregation + Individual Stat Profiling                                |
+-----------------------------------------------------------------------------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
|                        Local SLM Real-Time Assistant Coach Engine                             |
|   - Qwen2.5-3B-Instruct (4-bit Q4_K_M GGUF / AWQ)                                             |
|   - Memory Footprint: ~2.1 GB weights + 0.35 GB KV cache = 2.45 GB VRAM                       |
|   - Structured JSON Output: Tactical directives, blunder attributions, drill generation       |
|   - Fallback Engine: Deterministic rule synthesis if GPU is unallocated                       |
+-----------------------------------------------------------------------------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
|                                FastAPI Orchestration API                                      |
|   - GET /api/v1/vlr/matches                                                                   |
|   - GET /api/v1/vlr/match/{match_id}/coaching-report                                          |
|   - GET /api/v1/vlr/match/{match_id}/round/{round_num}/insight                                |
+-----------------------------------------------------------------------------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
|                                Next.js 14 Coach Dashboard                                     |
|   - Interactive Round Timeline & Kill Feed                                                    |
|   - Player Report Cards with integrated ACS, ADR, FK/FD, and Cumulative xRW Tax               |
|   - Live SLM Assistant Coach Tactical Panel & Prescribed 2v2/3v3 Drills                       |
+-----------------------------------------------------------------------------------------------+
```

---

## 2. VLRggAPI Endpoints and Data Contracts

### 2.1 Round Logs Endpoint
* **Path:** `GET /v2/match/{match_id}/logs` (or legacy `GET /match/logs?match_id={id}`)
* **Parameters:** `match_id` (string/integer), `game_id` (optional map filter, e.g. "1")
* **Payload Structure:**
```json
{
  "status": "success",
  "data": {
    "match_id": "773435",
    "game_id": "1",
    "map": "Ascent",
    "teams": [
      { "id": "c9", "name": "Cloud9", "side": "attack" },
      { "id": "nrg", "name": "NRG", "side": "defense" }
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
```

### 2.2 Match Details & Individual Player Stats Endpoint
* **Path:** `GET /v2/match/{match_id}/details` (or legacy `GET /match/{id}`)
* **Key Fields Consumed:**
  * `maps[].name`: Map name.
  * `maps[].stats[]`: Individual player performance statistics:
    * `player`: Player IGN (e.g. "OXY").
    * `team`: Team designation (e.g. "Cloud9").
    * `agent`: Character agent played (e.g. "Jett").
    * `k`, `d`, `a`: Kills, Deaths, Assists.
    * `acs`: Average Combat Score.
    * `adr`: Average Damage per Round.
    * `kast`: Kill, Assist, Survived, Traded percentage.
    * `hs_percent`: Headshot percentage.
    * `fk`, `fd`: First Kills (opening duels won), First Deaths (opening casualties surrendered).
    * `fk_fd_diff`: Opening duel differential.

### 2.3 Matches Catalog Endpoint
* **Path:** `GET /v2/match?q=results` (or `q=live_score`, `q=upcoming`)
* **Use Case:** Populates the match selector in the dashboard with recent Cloud9 and VCT tournament matches.

---

## 3. Local Model Selection & Hardware Budget (8GB VRAM)

### 3.1 Model Evaluation Matrix

| Model Candidate | Parameter Count | Quantization | Runtime VRAM | Tok/Sec (RTX 3060/4060) | Tactical Reasoning & JSON Quality | QLoRA Fine-Tuning VRAM | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Qwen/Qwen2.5-3B-Instruct** | 3.09B | 4-bit (Q4_K_M / AWQ) | **2.1 GB** | **95 - 130 tok/s** | Exceptional (Top benchmark in 3B tier) | **4.9 GB** | **Primary Choice** |
| **Llama-3.2-3B-Instruct** | 3.21B | 4-bit (Q4_K_M / AWQ) | **2.2 GB** | **85 - 115 tok/s** | High instruction following | **5.2 GB** | **Secondary Choice** |
| **Qwen/Qwen2.5-1.5B-Instruct** | 1.54B | 4-bit / 8-bit | **1.2 GB** | **140 - 180 tok/s** | Moderate | **3.2 GB** | Ultra-light fallback |
| **DeepSeek-R1-Distill-Qwen-1.5B**| 1.54B | 4-bit | **1.3 GB** | **35 tok/s (effective)**| High reasoning, but verbose thought tokens increase latency | **3.8 GB** | Excluded for real-time latency |
| **Qwen/Qwen2.5-7B-Instruct** | 7.61B | 4-bit (Q4_K_M) | **5.2 GB** | **35 - 50 tok/s** | Superb | **7.6 GB (High OOM risk)** | Excluded (Exceeds tuning margin) |

### 3.2 Detailed VRAM Budget (Qwen2.5-3B-Instruct @ 4-bit Q4_K_M)

* **Quantized Model Weights:** 1.95 GB
* **Key-Value (KV) Cache (4,096 token context):** 0.35 GB
* **CUDA Context and Activation Memory:** 0.40 GB
* **Total Runtime Memory Footprint:** **~2.70 GB**
* **Available Headroom on 8GB Hardware:** **5.30 GB**
* **Inference Latency:** 1.0 to 1.3 seconds per round insight.

### 3.3 Fine-Tuning Configuration (8GB VRAM Safe)

* **Method:** 4-bit QLoRA using `unsloth` or `peft` + `bitsandbytes`.
* **Quantization Type:** NormalFloat 4 (`nf4`) with double quantization.
* **LoRA Rank ($r$):** 16, **Alpha ($\alpha$):** 32.
* **Target Modules:** All attention and MLP projection layers (`q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`).
* **Batch Configuration:** Batch size 2, gradient accumulation steps 4 (effective batch size 8).
* **Memory Optimizations:** Gradient checkpointing enabled, Paged AdamW 8-bit optimizer.
* **Peak Training VRAM:** **~4.9 to 5.2 GB**, avoiding Out-Of-Memory (OOM) errors on 8GB VRAM GPUs.

---

## 4. Multi-Part Subagent Workflow

Every implementation subpart is orchestrated by the main agent and executed by dedicated Gemini Flash subagents (with smaller models reserved for browser testing).

### Subpart 1: VLR Data Engineering & Resilient Client
* **Subagent Role:** Data Engineering Specialist (Gemini Flash)
* **Goal:** Build resilient asynchronous data ingestion from `axsddlr/vlrggapi`.
* **Deliverables:**
  * `src/models/vlr_models.py`: Pydantic schemas for `/v2/match/{match_id}/logs` and `/v2/match/{match_id}/details`.
  * `src/data/vlr_client.py`: Async HTTP client with 300s in-memory TTL caching and backoff to handle rate limits.
  * `src/data/vlr_parser.py`: Adapter converting VLR payloads into `ParsedSeries`, `ParsedGame`, `ParsedRound`, and `KillEvent`.
* **Verification Gate:** Pytest suite with mocked VLR endpoints verifying schema parsing, cache hit behavior, and normalization.

### Subpart 2: Round-Wise Analytics & Mistake Attribution
* **Subagent Role:** Esports Analytics Engineer (Gemini Flash)
* **Goal:** Adapt Expected Round Win (xRW) modeling and mistake attribution to VLR event feeds.
* **Deliverables:**
  * `src/analytics/vlr_mistake_detector.py`: Detects untraded opening casualties (`UNTRADED_FIRST_DEATH` within 3.5s window), post-plant conversion blunders, and saves/eco misplays. Calculates $\Delta xRW$ per event.
  * `src/coaching/report_card.py`: Integrates individual player stats (ACS, ADR, FK/FD) into player report cards, showing cumulative error tax alongside traditional scoreboard metrics.
* **Verification Gate:** Pytest unit tests verifying win probability calibration and mistake attribution on synthetic round logs.

### Subpart 3: Local SLM Engine & Fine-Tuning Pipeline
* **Subagent Role:** Machine Learning Systems Engineer (Gemini Flash)
* **Goal:** Implement the in-process 4-bit quantized local model inference service and fine-tuning recipe.
* **Deliverables:**
  * `src/coaching/llm_coach.py`: Inference service using `llama-cpp-python` with `Qwen2.5-3B-Instruct-Q4_K_M.gguf` (GPU-offloaded), producing strict `RoundCoachingInsight` JSON. Includes a rule-based fallback engine for non-GPU environments.
  * `src/coaching/tune_slm.py`: Production fine-tuning script with validated 4-bit QLoRA hyperparameters fitting 8GB VRAM.
* **Verification Gate:** Pytest execution verifying sub-1.5s latency, JSON schema compliance, and fallback synthesis.

### Subpart 4: Backend API Orchestration
* **Subagent Role:** API Backend Architect (Gemini Flash)
* **Goal:** Expose unified endpoints connecting VLR ingestion, analytics, and SLM coaching.
* **Deliverables:**
  * `GET /api/v1/vlr/matches`: Catalog browser for tournament matches.
  * `GET /api/v1/vlr/match/{match_id}/coaching-report`: Unified report delivering match metadata, player stats, round logs, mistake attributions, report cards, and SLM debriefs.
  * `GET /api/v1/vlr/match/{match_id}/round/{round_num}/insight`: On-demand round debrief generation.
* **Verification Gate:** FastAPI TestClient integration test suite.

### Subpart 5: Frontend Dashboard & Real-Time Coach UI
* **Subagent Role:** Frontend UI/UX Engineer (Gemini Flash)
* **Goal:** Build the interactive interface for VLR match review and AI coaching.
* **Deliverables:**
  * `frontend/src/store/coachStore.ts` & `frontend/src/types/api.ts`: State management for VLR match data, player stats, and round coaching insights.
  * `frontend/src/components/SLMCoachPanel.tsx`: AI Assistant Coach HUD displaying round narratives, blunder culprits, win probability penalties, and tactical directives.
  * `frontend/src/components/PlayerReportCards.tsx`: Enriched report cards displaying ACS, ADR, KDA, and FK/FD differentials beside cumulative error tax.
* **Verification Gate:** Jest and React Testing Library test suites.

### Subpart 6: Automated Browser QA
* **Subagent Role:** Browser QA Automation (Smaller Model Subagent)
* **Goal:** Complete end-to-end visual and functional validation in a real browser.
* **Actions:**
  * Launch Chrome DevTools MCP browser automation.
  * Navigate to `http://localhost:3000`.
  * Load a VLR match, step through rounds 1 through 24, verify timeline updates, check player stat cards, and ensure zero console errors.

---

## 5. Artifact Links

* Detailed Implementation Plan: [c9-oracle/docs/plans/2026-11-19-vlrggapi-migration.md](file:///c:/Users/adity/OneDrive/Desktop/Desktop/College/c9%20Hackathon/c9-oracle/docs/plans/2026-11-19-vlrggapi-migration.md)
* Existing Architecture Reference: [c9-oracle/README.md](file:///c:/Users/adity/OneDrive/Desktop/Desktop/College/c9%20Hackathon/c9-oracle/README.md)
* Backend Test Suite: [c9-oracle/backend/tests/](file:///c:/Users/adity/OneDrive/Desktop/Desktop/College/c9%20Hackathon/c9-oracle/backend/tests)
* Frontend Components: [c9-oracle/frontend/src/components/](file:///c:/Users/adity/OneDrive/Desktop/Desktop/College/c9%20Hackathon/c9-oracle/frontend/src/components)
