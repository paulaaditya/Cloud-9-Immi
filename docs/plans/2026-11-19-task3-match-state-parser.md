# Task 3: Domain Models & Match State Accumulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Pydantic v2 domain models for VALORANT match state and an event stream parser with rollback handling and 3D ability coordinate joining.

**Architecture:** A domain model layer (`src/models/match_state.py`) defines validated Pydantic v2 models representing series, games, rounds, kills, and ability casts. A stream accumulator (`src/data/parser.py`) consumes envelope streams from `stream_series_events` and supplements from `load_ability_supplement`, building the state graph while discarding games invalidated by `series-!started-game` rollback events.

**Tech Stack:** Python 3.11, Pydantic v2, pytest

**Spec:** `docs/plans/2026-11-19-c9-oracle-full-plan.md` (Task 3)

## Global Constraints

- Python 3.11
- Pydantic v2 models
- No emojis anywhere in code, comments, or output
- Match state accumulator must correctly handle `series-!started-game` rollbacks
- 3D coordinates must be properly joined from ability supplement

---

### Task 3: Domain Models & Match State Accumulator

**Files:**
- Create: `c9-oracle/backend/src/models/__init__.py`
- Create: `c9-oracle/backend/src/models/match_state.py`
- Create: `c9-oracle/backend/src/data/parser.py`
- Modify: `c9-oracle/backend/src/data/__init__.py`
- Create: `c9-oracle/backend/tests/test_parser.py`

**Interfaces:**
- Consumes:
  - `src.data.streamer.stream_series_events(series_id: str, max_envelopes: Optional[int]) -> Iterator[Dict[str, Any]]`
  - `src.data.streamer.load_ability_supplement(series_id: str) -> Dict[str, Dict[str, Any]]`
- Produces:
  - `src.models.match_state.Vector3D`
  - `src.models.match_state.AbilityCast`
  - `src.models.match_state.KillEvent`
  - `src.models.match_state.ParsedRound`
  - `src.models.match_state.ParsedGame`
  - `src.models.match_state.ParsedSeries`
  - `src.data.parser.parse_series(series_id: str, max_envelopes: Optional[int] = None) -> ParsedSeries`

- [ ] **Step 1: Write failing tests in tests/test_parser.py**
- [ ] **Step 2: Run pytest to verify test failure (RED)**
- [ ] **Step 3: Implement domain models in src/models/match_state.py and src/models/__init__.py**
- [ ] **Step 4: Implement parser in src/data/parser.py and expose in src/data/__init__.py**
- [ ] **Step 5: Run pytest tests/test_parser.py to verify tests pass (GREEN)**
- [ ] **Step 6: Run full test suite to check for regressions**
- [ ] **Step 7: Commit changes in c9-oracle git repo**
