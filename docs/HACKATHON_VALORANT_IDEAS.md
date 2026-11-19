# Sky's The Limit 2026: Cloud9 x JetBrains Hackathon
## Category 1 (VALORANT) Guide, Ideas, and Methodologies

---

## 1. Hackathon Overview

### 1.1 Event Profile
- **Event Name:** Sky's the Limit: The Cloud9 x JetBrains Global Hackathon (2026-2027 Edition)
- **Hosts & Key Partners:**
  - **Cloud9 Esports:** Premier esports organization providing competitive coaching benchmarks, problem statements, and judging panels.
  - **JetBrains:** Official AI-powered coding partner providing developer tools (All Products Pack, AI Ultimate, Junie / AI coding agents).
  - **GRID Esports:** Official data infrastructure partner providing official match telemetry and event streams for professional VALORANT and League of Legends.

### 1.2 Key Dates & Schedule
- **Registration & Hacking Opens:** November 17, 2026
- **Submission Deadline:** January 12, 2027
- **Judging & Winners Announcement:** February 8, 2027

### 1.3 Prizes & Incentives
- **Total Cash Pool:** $25,000 USD distributed across category winners.
- **Grand Prize Package:** Main category winners receive an all-expenses-paid trip to the Game Developers Conference (GDC 2027), including conference passes, round-trip flights, and hotel accommodations.
- **Perks & Subscriptions:** JetBrains All Products Pack licenses, JetBrains AI Ultimate access, and Cloud9 Store apparel/merchandise gift cards.

### 1.4 Submission Deliverables
- **Public Code Repository:** Must be hosted publicly on GitHub/GitLab with an approved open-source license.
- **Working Application / Demo:** Functional web app, desktop tool, or hosted pipeline.
- **Demo Video:** Video demonstration of up to 3 minutes detailing features and technical workflow.
- **Written Project Overview:** Comprehensive documentation highlighting design choices, data pipelines, and how JetBrains tools and AI workflows were used.

---

## 2. Official Dataset & Critical Compliance Rules

The hackathon provides a dedicated starter repository (`stl-hackathon-2026-grid-starter`) containing over 1.4 GB of compressed match telemetry.

### 2.1 Available Datasets
1. **VALORANT Series Feeds (`val/`):**
   - 857 series (2,078 individual games/maps).
   - Tournaments covered: VCT Americas (Kickoff, Stage 1, Stage 2 2025), VALORANT Masters Toronto, and VCT Game Changers across North America, EMEA, Brazil, LATAM, Japan, Korea, SEA, Pacific, and the Championship.
   - Granular events: Kills, damage ticks, utility usage, bomb plants/defusals, round transitions, economic states, and player movement/positions.
2. **VALORANT Ability Spatial Supplements (`val-ability-supplements/`):**
   - 856 matching series files.
   - Provides interpolated 3D coordinates `(x, y, z)`, unit aim/view vectors `(view.x, view.y, view.z)`, and velocity vectors for every ability cast at millisecond precision.
3. **Metadata Tables (`meta/`):**
   - Pre-indexed CSV tables for instant lookups without decompressing large feeds: `tournaments.csv`, `teams.csv`, `players.csv`, `characters.csv`, `games.csv`, and `rosters.csv`.

### 2.2 Golden Rule: Data Licensing and Git Policy
- **Strict Prohibition:** Raw `.zst` files, decompressed `.jsonl` files, derived Parquet/DuckDB tables, and database caches are proprietary. **Never commit or push data files to your project's git repository.**
- **Project Structure Requirement:** Keep the data starter folder external and read via environment variables:
  ```
  hackathon/
  ├── stl-hackathon-2026-grid-starter/   (official data, do not commit)
  └── my-c9-project/                     (your code, git initialized)
  ```
- **Recommended `.gitignore` Entries:**
  ```gitignore
  stl-hackathon-2026-grid-starter/
  *.zst
  *.jsonl
  *.parquet
  *.sqlite
  *.duckdb
  ```
- **In-Memory Streaming:** Decompressing the entire dataset inflates to over 160 GB. Always stream files line-by-line using `zstandard` or Python 3.14 `compression.zstd`.

---

## 3. Category 1: Comprehensive Assistant Coach (VALORANT)

### 3.1 Challenge Definition
Category 1 tasks participants with developing a data-driven assistant coach that unifies:
1. **Micro-Level Player Analytics:** Granular engagement data, duel positioning, utility placement, trade efficiency, and reaction timing.
2. **Macro-Level Strategic Review:** Site default setups, economy distribution, round pacing, retake coordination, and site execute conversion.

### 3.2 The Core Problem in Professional Esports Coaching
- **Information Overload:** Pro coaches (such as Cloud9's coaching staff) review dozens of VOD hours weekly. Much of the analysis is manual, subjective, and prone to bias.
- **The Attribution Gap:** Coaches can see that a player died, but cannot easily quantify how much an untraded opening death or poorly aimed flash reduced the team's chance of winning that round.
- **Lack of Prescriptive Drills:** Traditional analytics tools output static graphs and stats (KDA, ACS) without telling players *what specific drill* will correct recurring bad habits.

---

## 4. Proposed Product Concepts

### Option A: "C9 Oracle" (Micro-Mistake Attribution & Win Probability Delta) - Recommended
- **Objective:** Quantify every tactical mistake with an exact Expected Round Win (xRW) penalty, then output automated coaching debriefs and practice drills.
- **Core Workflow:**
  1. Computes live `xRW(t)` at every combat event.
  2. Detects tactical blunders (untraded first deaths, delayed smoke drops, isolated dry peeks).
  3. Calculates the Win Probability Delta: `ΔxRW = xRW(after_event) - xRW(before_event)`.
  4. Aggregates each player's cumulative error tax per map and generates custom practice drills (e.g. Ascent A-Main 2v2 crossfire drill).

### Option B: "C9 Tactical Twin" (3D Ability Lineup & Retake Simulator)
- **Objective:** Utilize the 3D ability spatial supplement to analyze ability geometry and utility efficiency.
- **Core Workflow:**
  1. Projects 3D aim vectors and velocities to estimate landing locations for smokes, mollies, and recon darts.
  2. Compares cast coordinates against optimal pro lineup baselines.
  3. Detects utility gaps (e.g., smokes that leave sightlines open, flashes that blind teammates).
  4. Scores retake synchronization (penalizing staggered, uncoordinated site retakes).

### Option C: "C9 Anti-Strat Engine" (Opponent Profiling & Counter-Playbook)
- **Objective:** Automate pre-match opponent scouting and counter-strategy generation.
- **Core Workflow:**
  1. Mines opponent defensive setups and offensive defaults across hundreds of series.
  2. Maps Operator / sniper habits (which angles an enemy star player holds during rifle rounds vs eco rounds).
  3. Produces printable "Pre-Match Counter-Cards" with actionable instructions for the team.

---

## 5. System Architecture & Methodologies (C9 Oracle)

```
[Raw Compressed Match Feed]          [Ability Spatial Supplement]
(events_{seriesId}_grid.jsonl.zst)       ({seriesId}.jsonl.zst)
                │                                    │
                └─────────────────┬──────────────────┘
                                  ▼
                     [Streaming Data Parser]
                     (In-memory zstd streaming)
                                  │
                                  ▼
                     [State Accumulator Engine]
        ┌─────────────────────────┴─────────────────────────┐
        ▼                                                   ▼
[Micro Feature Extraction]                         [Macro State Context]
- Trade timing window (<3.0s)                      - Alive count differential
- Teammate distance spacing                        - Economy differential
- Ability cast vectors & aim                       - Spike status & timer
        │                                                   │
        └─────────────────────────┬─────────────────────────┘
                                  ▼
               [Expected Round Win (xRW) Model]
               (Continuous win probability 0.0 - 1.0)
                                  │
                                  ▼
               [Micro-Mistake Attribution Engine]
               (Assigns ΔxRW penalty to specific players)
                                  │
                                  ▼
               [Coaching Synthesis & Prescription]
               - Individual player report cards
               - Prescribed 2v2 / 3v3 team practice drills
                                  │
                                  ▼
               [Interactive Minimap & Replay Web UI]
               - 2D Canvas/SVG map playback
               - Timeline scrubbing & visual mistake flags
```

### 5.1 Data Ingestion Methodology
- **Memory Footprint Optimization:** Do not extract files to disk. Use Python `zstandard` with `io.TextIOWrapper` to iterate envelopes lazily.
- **Supplement Joining:** Join ability casts to the main GRID event feed using:
  $$\text{grid\_event\_id} == \text{events[].id}$$
- **Event Rollback Handling:** Filter out rolled-back events (e.g. `series-!started-game`) to prevent data corruption from restarted games.

### 5.2 Mathematical Formulation: Expected Round Win (xRW)
The Expected Round Win model estimates the probability $P(\text{Win}_t)$ of a team winning round $r$ at time $t$ based on game state features:

$$P(\text{Win}_t) = \sigma\left( \beta_0 + \beta_1 \Delta \text{Alive} + \beta_2 \text{Spike} + \beta_3 \Delta \text{Loadout} + \beta_4 (T_{\text{max}} - t) \right)$$

Where:
- $\Delta \text{Alive} = \text{Alive}_{\text{friendly}} - \text{Alive}_{\text{enemy}}$
- $\text{Spike} = 1$ if bomb is planted, $0$ otherwise
- $\Delta \text{Loadout} = \text{LoadoutValue}_{\text{friendly}} - \text{LoadoutValue}_{\text{enemy}}$
- $T_{\text{max}} - t = \text{Seconds remaining in round}$

### 5.3 Micro-Mistake Attribution Engine
When an event $E_k$ occurs (e.g., player dies), the mistake engine calculates the Delta:

$$\Delta \text{xRW}_k = P(\text{Win}_{t_k^+}) - P(\text{Win}_{t_k^-})$$

Tactical errors are classified according to clear quantitative heuristics:
1. **Untraded First Death:**
   - Condition: Player dies as opening death; killer remains alive past a 3.0-second trading window.
   - Penalty: Typically $-0.18$ to $-0.26$ $\Delta\text{xRW}$.
2. **Spatial Isolation (Dry Duel):**
   - Condition: Player initiates combat with distance $d > 800\text{ cm}$ (8 meters) to the closest teammate and no active friendly utility within 1.5 seconds.
3. **Delayed Retake / Staggered Entry:**
   - Condition: Retake players cross site threshold with $> 2.5\text{s}$ interval between member 1 and member 2.

### 5.4 Prescriptive Drill Generation
The engine groups recurring mistakes by player and map zone, translating mathematical vulnerabilities into structured coaching assignments:
- **Example Vulnerability:** "Player A experienced 4 untraded first deaths on Ascent A-Main with zero preparatory utility."
- **Generated Drill:** "Ascent A-Main Buddy System 2v2: Player A paired with Initiator. Attacking contact cannot be made until recon dart/flash is deployed. Goal: Achieve $<1.2\text{s}$ trade response time over 10 consecutive executions."

---

## 6. Project Roadmap & Implementation Tasks

| Task | Component | Key Deliverable | Verification |
|---|---|---|---|
| 1 | Data Pipeline | Zstd stream reader and ability supplement joiner | Unit test on series `2748743` |
| 2 | State Parser | Game and round accumulator with rollback protection | Validation of map/score outputs |
| 3 | Analytics Core | xRW model and micro-mistake attribution engine | Calibration test on VCT match rounds |
| 4 | Coaching Engine | AI prescription generator and FastAPI REST endpoints | API test verifying `/coaching-report` |
| 5 | Interactive UI | Next.js / React 2D minimap visualizer and drill cards | Frontend component testing |
| 6 | Integration | E2E pipeline run, JetBrains workflow docs, git checks | Zero data in git audit |

---

## 7. JetBrains AI Workflow Integration Guide

To maximize points in the hackathon judging criteria:
1. **IDE Selection:** Develop the backend in JetBrains PyCharm and the frontend in JetBrains WebStorm.
2. **AI Assistant / Junie Integration:**
   - Document how JetBrains AI was utilized to draft parser logic, vectorize spatial formulas, and write unit tests.
   - Include a section in the submission write-up titled: *"How JetBrains AI Accelerated Our Development"*.
