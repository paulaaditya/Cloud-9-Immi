# Player Mistakes Breakdown and Team Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate identical boilerplate mistakes by generating varied, contextual micro-mistakes across players, list all individual mistakes on each player's report card, provide a dedicated per-player breakdown in the Round Mistakes tab, and allow sorting/grouping players by team instead of showing all players together.

**Architecture:** 
1. **Backend Analytics (`mistake_detector.py`)**: Expand detection beyond only opening kills to detect multiple realistic tactical error types (`UNTRADED_FIRST_DEATH`, `ISOLATED_DUEL`, `UTILITY_DELAY`) with player-specific, agent-specific, weapon-aware descriptions and coaching fixes, tagging each mistake with its player's `team_name`.
2. **Backend Coaching (`report_card.py`)**: Attach `team_name` and the complete list of `mistakes: List[AttributedMistake]` to each `PlayerReportCard`, generating distinct player summaries.
3. **Frontend Types & Mock State (`types/api.ts`, `page.tsx`)**: Update TypeScript interfaces and mock data to supply team attribution and nested mistake lists.
4. **Frontend MinimapReplay (`MinimapReplay.tsx`)**: Introduce player breakdown grouping and filter pills in the Round Mistakes panel, displaying each player's specific error list and cumulative round tax.
5. **Frontend PlayerReportCards (`PlayerReportCards.tsx`)**: Add team sorting/grouping (e.g., Cloud9 vs Opponent sections) and an expandable/detailed list of all flaws for each player.

**Tech Stack:** 
- Backend: Python 3.11, FastAPI, Pydantic, Pytest
- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS, Jest, React Testing Library

**Spec:** User request:
- "it says same mistake for everyone everywhere"
- "list all mistakes for each player"
- "in round mistakes tab"
- "show every player's breakdown"
- "let us sort by team instead of showing all players together"

## Global Constraints
- Do not use emojis in any UI, code, or documentation.
- Maintain existing test coverage; all pytest and jest suites must pass.
- Preserve 100% backward compatibility for API responses (additional fields are optional or have defaults).
- Adhere to the Cloud9 aesthetic: white/sky ethereal theme, `#008cd4` primary blue, clean glassmorphic panels.

---

### Task 1: Backend Diversified Mistake Detection & Team Attribution

**Files:**
- Modify: `c9-oracle/backend/src/analytics/mistake_detector.py`
- Modify: `c9-oracle/backend/tests/test_mistake_detector.py`
- Modify: `c9-oracle/backend/tests/test_unslop_coaching.py`

**Interfaces:**
- `AttributedMistake`:
  - `mistake_type: str`
  - `player_id: str`
  - `player_name: Optional[str] = None`
  - `character_name: Optional[str] = None`
  - `team_name: Optional[str] = None`
  - `round_number: int`
  - `occurred_at: str`
  - `win_prob_delta: float`
  - `description: str`
  - `coaching_fix: str`
- `detect_round_mistakes(round_obj: ParsedRound, trade_window_sec: float = 3.0, series_id: Optional[str] = None, roster: Optional[Dict[str, Dict[str, str]]] = None) -> List[AttributedMistake]`

- [ ] **Step 1: Write failing tests for diversified mistakes and team attribution**

Add tests to `c9-oracle/backend/tests/test_mistake_detector.py` verifying:
1. `team_name` is populated from roster.
2. Mid-round untraded/isolated kills generate `ISOLATED_DUEL`.
3. Delayed/unsupported deaths generate `UTILITY_DELAY` or context-rich `UNTRADED_FIRST_DEATH`.
4. Descriptions vary based on agent/scenario rather than identical boilerplate.

```python
def test_detects_multiple_varied_mistakes_with_team():
    r = ParsedRound(round_number=3)
    r.kills.append(
        KillEvent(
            event_id="k1",
            killer_id="enemy1",
            victim_id="p_entry",
            killer_name="enemy1",
            victim_name="p_entry",
            weapon="Vandal",
            occurred_at="2025-01-16T22:15:10.000Z",
            is_first_blood=True,
        )
    )
    r.kills.append(
        KillEvent(
            event_id="k2",
            killer_id="enemy2",
            victim_id="p_lurk",
            killer_name="enemy2",
            victim_name="p_lurk",
            weapon="Phantom",
            occurred_at="2025-01-16T22:15:25.000Z",
            is_first_blood=False,
        )
    )
    roster = {
        "p_entry": {"player_name": "OXY", "character_name": "jett", "team_name": "Cloud9"},
        "p_lurk": {"player_name": "vanity", "character_name": "omen", "team_name": "Cloud9"},
    }
    mistakes = detect_round_mistakes(r, roster=roster)
    assert len(mistakes) >= 2
    types = [m.mistake_type for m in mistakes]
    assert "UNTRADED_FIRST_DEATH" in types
    assert "ISOLATED_DUEL" in types
    assert all(m.team_name == "Cloud9" for m in mistakes)
    assert mistakes[0].description != mistakes[1].description
```

- [ ] **Step 2: Run pytest to verify test fails**

Run: `cd c9-oracle/backend; $env:PYTHONPATH="."; .venv/Scripts/pytest tests/test_mistake_detector.py -v`
Expected: FAIL due to missing `team_name` and lack of `ISOLATED_DUEL` detection.

- [ ] **Step 3: Implement diversified mistake detection in `mistake_detector.py`**

Update `c9-oracle/backend/src/analytics/mistake_detector.py`:
- Add `team_name: Optional[str] = None` to `AttributedMistake`.
- Detect untraded first blood as `UNTRADED_FIRST_DEATH` with agent/weapon-contextual descriptions.
- Detect subsequent untraded kills or isolated duels (> trade window or isolated spatial distance) as `ISOLATED_DUEL`.
- Detect late/absent utility scenarios or ability delays as `UTILITY_DELAY`.
- Include dynamic contextual text generators for descriptions and coaching fixes:
  - Entry duelists: spacing, clearing utility, buddy flash.
  - Controllers/Initiators: smoking choke points, recon dart lineups, flash synchronization.
  - Sentinels: crossfire anchoring, site delay, lurk timing.

- [ ] **Step 4: Run pytest to verify all tests pass**

Run: `cd c9-oracle/backend; $env:PYTHONPATH="."; .venv/Scripts/pytest tests/test_mistake_detector.py tests/test_unslop_coaching.py -v`
Expected: PASS.

---

### Task 2: Backend Report Cards with Player Mistake Lists & Team Association

**Files:**
- Modify: `c9-oracle/backend/src/coaching/report_card.py`
- Modify: `c9-oracle/backend/tests/test_coaching.py`

**Interfaces:**
- `PlayerReportCard`:
  - `player_id: str`
  - `player_name: Optional[str] = None`
  - `character_name: Optional[str] = None`
  - `team_name: Optional[str] = None`
  - `mistake_count: int`
  - `cumulative_xrw_tax: float`
  - `primary_vulnerability: str`
  - `actionable_summary: str`
  - `mistakes: List[AttributedMistake] = Field(default_factory=list)`

- [ ] **Step 1: Write failing tests for PlayerReportCard mistakes list and team name**

In `c9-oracle/backend/tests/test_coaching.py`:
```python
def test_player_report_card_includes_team_and_mistakes_list():
    m1 = AttributedMistake(
        mistake_type="UNTRADED_FIRST_DEATH",
        player_id="10636",
        player_name="OXY",
        character_name="jett",
        team_name="Cloud9",
        round_number=1,
        occurred_at="2025-01-16T22:15:10.000Z",
        win_prob_delta=-0.31,
        description="OXY died opening duel.",
        coaching_fix="Buddy spacing.",
    )
    m2 = AttributedMistake(
        mistake_type="ISOLATED_DUEL",
        player_id="10636",
        player_name="OXY",
        character_name="jett",
        team_name="Cloud9",
        round_number=5,
        occurred_at="2025-01-16T22:20:10.000Z",
        win_prob_delta=-0.22,
        description="OXY died isolated.",
        coaching_fix="Anchor crossfire.",
    )
    cards = build_player_report_cards([m1, m2])
    assert len(cards) == 1
    card = cards[0]
    assert card.team_name == "Cloud9"
    assert len(card.mistakes) == 2
    assert card.mistakes[0].mistake_type == "UNTRADED_FIRST_DEATH"
    assert card.mistakes[1].mistake_type == "ISOLATED_DUEL"
```

- [ ] **Step 2: Run pytest to verify test fails**

Run: `cd c9-oracle/backend; $env:PYTHONPATH="."; .venv/Scripts/pytest tests/test_coaching.py -v`
Expected: FAIL.

- [ ] **Step 3: Update `report_card.py`**

In `c9-oracle/backend/src/coaching/report_card.py`:
- Update `PlayerReportCard` Pydantic model with `team_name: Optional[str] = None` and `mistakes: List[AttributedMistake] = Field(default_factory=list)`.
- In `build_player_report_cards`:
  - Set `team_name = next((m.team_name for m in p_mistakes if m.team_name), None)` or from `roster[player_id].get("team_name")`.
  - Pass `mistakes=p_mistakes` to `PlayerReportCard`.
  - Format actionable summary with player-specific details and primary vulnerability breakdown.

- [ ] **Step 4: Run pytest across the entire backend suite**

Run: `cd c9-oracle/backend; $env:PYTHONPATH="."; .venv/Scripts/pytest -v`
Expected: All 35+ tests PASS.

---

### Task 3: Frontend TypeScript Interfaces & Mock Coaching Data

**Files:**
- Modify: `c9-oracle/frontend/src/types/api.ts`
- Modify: `c9-oracle/frontend/src/app/page.tsx`

**Interfaces:**
- `AttributedMistake`: add `team_name?: string | null;`
- `PlayerReportCard`: add `team_name?: string | null;` and `mistakes?: AttributedMistake[];`

- [x] **Step 1: Update `types/api.ts`**

Update `AttributedMistake` and `PlayerReportCard` in `c9-oracle/frontend/src/types/api.ts` to include `team_name` and `mistakes`.

- [x] **Step 2: Enrich `MOCK_COACHING_REPORT` in `page.tsx`**

In `c9-oracle/frontend/src/app/page.tsx`:
- Add `team_name: "Cloud9"` or `team_name: "NRG"` to each mistake in `MOCK_COACHING_REPORT.mistakes`.
- Add `team_name` and `mistakes` array to each player report card in `MOCK_COACHING_REPORT.player_reports`.
- Include varied mistakes for players (e.g. OXY with untraded opening death and aggressive dry peek, vanity with isolated duel, Xeppaa with utility delay).

- [x] **Step 3: Run frontend typecheck/test to verify compilation**

Run: `cd c9-oracle/frontend; npm test`
Expected: PASS.

---

### Task 4: Frontend MinimapReplay - Round Mistakes Player Breakdown

**Files:**
- Modify: `c9-oracle/frontend/src/components/MinimapReplay.tsx`
- Modify: `c9-oracle/frontend/src/components/MinimapReplay.test.tsx`

- [x] **Step 1: Write failing tests in `MinimapReplay.test.tsx` for player breakdown**

Add tests verifying:
1. In the Round Mistakes panel, players who made mistakes are grouped or can be filtered by player pills.
2. Shows per-player breakdown with player name, agent, mistake count, and total xRW loss.
3. Clicking a player filter pill isolates that player's mistakes in the breakdown view.

- [x] **Step 2: Run jest to verify test fails**

Run: `cd c9-oracle/frontend; npm test -- src/components/MinimapReplay.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement player breakdown view in `MinimapReplay.tsx`**

In `c9-oracle/frontend/src/components/MinimapReplay.tsx`:
- Compute `roundPlayersBreakdown`: Group `roundMistakes` by `player_id`, aggregating cumulative xRW tax and mistake list per player.
- Add view toggle / pills in the Round Mistakes panel:
  - Filter pills for each player involved in the round mistakes (e.g. `All (${roundMistakes.length})`, `${p.name} (${p.count})`).
  - View toggle: "List View" vs "Player Breakdown".
  - In "Player Breakdown" mode (and filtered player mode), show player card headers:
    - Player name, agent badge, team badge, round xRW loss, flaw count.
    - List of each specific mistake under that player with mistake type, xRW badge, description, and coaching fix.
- Ensure clicking a player card or player filter highlights the player and their pins on the minimap radar.

- [x] **Step 4: Run jest to verify MinimapReplay tests pass**

Run: `cd c9-oracle/frontend; npm test -- src/components/MinimapReplay.test.tsx`
Expected: PASS.

---

### Task 5: Frontend PlayerReportCards - Sort/Group by Team & List All Mistakes

**Files:**
- Modify: `c9-oracle/frontend/src/components/PlayerReportCards.tsx`
- Modify: `c9-oracle/frontend/src/components/PlayerReportCards.test.tsx`

- [x] **Step 1: Write failing tests in `PlayerReportCards.test.tsx` for team sorting & listing all mistakes**

Add tests verifying:
1. Team sort/filter controls allow sorting/grouping players by team (e.g. Cloud9 vs opponent).
2. Each player report card lists all individual mistakes for that player with round number, flaw type, xRW impact, description, and coaching remediation.
3. Flaw breakdown list is expandable or clearly displayed on each card.

- [x] **Step 2: Run jest to verify test fails**

Run: `cd c9-oracle/frontend; npm test -- src/components/PlayerReportCards.test.tsx`
Expected: FAIL.

- [x] **Step 3: Implement Team Sorting and All Mistakes Breakdown in `PlayerReportCards.tsx`**

In `c9-oracle/frontend/src/components/PlayerReportCards.tsx`:
- Add Team Sort & Filter controls:
  - Sort mode state: `sortByTeam` (boolean or "team" | "tax").
  - Team filter pills: `All Teams`, `Cloud9`, `Opponent Team(s)`.
  - When grouped by team:
    - Group cards by `card.team_name || "Unassigned"`.
    - Render distinct team sections with team headers:
      - Team name badge (e.g., Cloud9 with cyan glow border, opponent with contrasting slate/sky border).
      - Team total cumulative error tax and total flaws count.
  - In each player card:
    - Render a "Flaws Breakdown" section listing ALL mistakes for that player (`card.mistakes`):
      - Flaw type badge (e.g., `UNTRADED_FIRST_DEATH`, `ISOLATED_DUEL`, `UTILITY_DELAY`).
      - Round badge (e.g., `R1`, `R5`).
      - Individual xRW tax badge (`-31.2% xRW`).
      - Specific description and coaching fix for each mistake.
      - Collapsible toggle if more than 1 mistake ("Show all N flaws / Show less") or cleanly scrollable compact list.

- [x] **Step 4: Run jest to verify PlayerReportCards tests pass**

Run: `cd c9-oracle/frontend; npm test -- src/components/PlayerReportCards.test.tsx`
Expected: PASS.

---

### Task 6: Full Regression Verification & Live Telemetry Sanity Check

**Files:**
- Run backend test suite: `pytest`
- Run frontend test suite: `npm test`
- Verify live endpoint output with python CLI

- [ ] **Step 1: Run complete backend pytest suite**
Run: `cd c9-oracle/backend; $env:PYTHONPATH="."; .venv/Scripts/pytest -v`
Expected: All tests PASS.

- [ ] **Step 2: Run complete frontend Jest suite**
Run: `cd c9-oracle/frontend; npm test`
Expected: All 5 test suites PASS.

- [ ] **Step 3: Test live backend series report**
Run: `cd c9-oracle/backend; $env:PYTHONPATH="."; .venv/Scripts/python -c "from src.api.routes import get_coaching_report; res = get_coaching_report('2748746', 0, 1000); print('Mistakes:', len(res['mistakes'])); print('Cards:', len(res['player_reports'])); [print(c.player_name, c.team_name, len(c.mistakes), c.primary_vulnerability) for c in res['player_reports']];"`
Expected: Prints varied mistakes, distinct player report cards with populated `team_name` and individual `mistakes` lists.
