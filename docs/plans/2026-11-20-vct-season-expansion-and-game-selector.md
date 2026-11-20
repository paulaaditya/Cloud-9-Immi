# 2026 VCT Season Dataset Expansion & Filtered Game Selection Tool

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand C9 Oracle to provide a comprehensive 2026 VCT Season match catalog (replacing obsolete 2024 rosters with authentic 2026 teams and expanding from 5 to 22 matches across 2026 Kickoff, Stage 1, Stage 2, Masters Bangkok, Masters Toronto, and Champions Paris) and build an interactive Game Selection Tool with team, date, and event filters.

**Architecture:** Extend backend `vlr_2026_season.py` with 22 deterministic 2026 VCT Season series complete with realistic 2026 rosters (e.g., Cloud9 with OXY/Xeppaa/v1c/moose/Rossy, Sentinels with N4RRATE/bang/zekken/johnqt/Zellsis, NRG with FNS/s0m/Ethan/mada/crashies) and round telemetry; update `/api/v1/featured-series` to support team, event, date, and search query parameters; implement a modern glassmorphic `GameSelectionTool.tsx` component in Next.js with reactive filtering by team, date, and event; and integrate it into `page.tsx` with full backward compatibility for existing selectors.

**Tech Stack:** Python 3.11, FastAPI, Pydantic v2, Next.js 14/15, TypeScript, Tailwind CSS, Jest, React Testing Library, Pytest.

**Spec:** [docs/plans/2026-11-20-vct-season-expansion-and-game-selector.md](file:///c:/Users/adity/OneDrive/Desktop/Desktop/College/c9%20Hackathon/c9-oracle/docs/plans/2026-11-20-vct-season-expansion-and-game-selector.md)

## Global Constraints

- Do not use emojis anywhere in code, markdown, logs, or UI text.
- Replace all legacy 2024 roster anomalies (e.g. TenZ on active SEN roster, Demon1 on active NRG roster, Derke on active FNC roster) with authentic 2025/2026 competitive VCT rosters.
- Expand match catalog from 5 matches to at least 20 matches spanning the full 2026 competitive circuit: VCT Americas Kickoff, VCT Masters Bangkok, VCT Americas Stage 1, VCT Masters Toronto, VCT Americas Stage 2, and VCT Champions Paris.
- Maintain 100% backward compatibility for `/api/v1/featured-series` and `select[aria-label="Select Series"]` to ensure all existing backend and frontend tests pass without breakage.
- All tasks must follow strict Test-Driven Development (TDD): failing test first, minimal implementation, passing test, and commit.
- All implementation tasks are orchestrated using Gemini Flash models.
- Browser environment testing must be performed using a subagent with a smaller model.

---

## Subpart Breakdown & Bite-Sized Tasks

### Task 1: Comprehensive 2026 VCT Season Catalog & Filtering API (Backend)

**Files:**
- Modify: `c9-oracle/backend/src/data/vlr_2026_season.py`
- Modify: `c9-oracle/backend/src/api/routes.py`
- Test: `c9-oracle/backend/tests/test_vlr_2026_season.py`
- Test: `c9-oracle/backend/tests/test_api_vlr_pure.py`

**Interfaces:**
- Consumes: None (Built-in verified 2026 VCT telemetry generator)
- Produces:
  - `get_2026_matches_catalog(team: Optional[str] = None, event: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]`
  - `get_2026_match_logs(match_id: str, game_id: str = "1") -> VLRMatchLogsResponse`
  - `get_2026_match_details(match_id: str) -> VLRMatchDetailsResponse`
  - Endpoint: `GET /api/v1/featured-series?team={team}&event={event}&start_date={start_date}&end_date={end_date}&search={search}`

- [x] **Step 1: Write failing tests for 2026 match catalog expansion and filtering**
...
- [x] **Step 2: Run test to verify failure**
...
- [x] **Step 3: Implement expanded 2026 VCT season catalog with authentic 2026 rosters and filter logic**
...
- [x] **Step 4: Run backend tests to verify pass**
...
- [x] **Step 5: Commit backend changes**

```bash
git add c9-oracle/backend/src/data/vlr_2026_season.py c9-oracle/backend/src/api/routes.py c9-oracle/backend/tests/test_vlr_2026_season.py c9-oracle/backend/tests/test_api_vlr_pure.py
git commit -m "feat(backend): expand 2026 vct season catalog to 22 matches and add filter parameters"
```

---

### Task 2: Game Selection Tool Component with Team, Date, and Event Filters (Frontend)

**Files:**
- Create: `c9-oracle/frontend/src/components/GameSelectionTool.tsx`
- Test: `c9-oracle/frontend/src/components/GameSelectionTool.test.tsx`

**Interfaces:**
- Props:
  ```typescript
  export interface GameSelectionToolProps {
    isOpen: boolean;
    onClose: () => void;
    matches: FeaturedSeries[];
    selectedSeriesId: string;
    onSelectMatch: (seriesId: string) => void;
  }
  ```
- Capabilities:
  - Text search bar (matches team name, player names, map name, or event name).
  - Team filter pills: "All Teams", "Cloud9 Only", "Sentinels", "NRG", "Fnatic", "Paper Rex", "Leviatán", "Gen.G", "Team Heretics", "G2 Esports".
  - Event filter dropdown/pills: "All Events", "VCT Americas 2026 Kickoff", "VCT Masters Bangkok 2026", "VCT Americas 2026 Stage 1", "VCT Masters Toronto 2026", "VCT Americas 2026 Stage 2", "VCT Champions Paris 2026".
  - Date filter options: Preset stage months (All Season, Feb: Kickoff, Mar: Bangkok, Apr-May: Stage 1, Jun: Toronto, Jul-Aug: Stage 2, Aug-Sep: Champions Paris) and custom date inputs.
  - Active filter badges with "Clear Filters" button.
  - Match cards with event name, date, teams, scores, map, C9 badge, and active selection state.
  - Accessible modal dialog with overlay, ESC key closing, and focus handling.

- [x] **Step 1: Write failing unit test for GameSelectionTool**
...
- [x] **Step 2: Run test to verify failure**
...
- [x] **Step 3: Implement GameSelectionTool.tsx**
...
- [x] **Step 4: Run test to verify pass**
...
- [x] **Step 5: Commit GameSelectionTool component**

```bash
git add c9-oracle/frontend/src/components/GameSelectionTool.tsx c9-oracle/frontend/src/components/GameSelectionTool.test.tsx
git commit -m "feat(frontend): create game selection tool with team, date, and event filters"
```

---

### Task 3: Integrate Game Selection Tool into Coach Dashboard Header (Frontend)

**Files:**
- Modify: `c9-oracle/frontend/src/app/page.tsx`
- Modify: `c9-oracle/frontend/src/types/api.ts`
- Modify: `c9-oracle/frontend/src/components/CoachDashboard.test.tsx`

**Interfaces:**
- Consumes: `GameSelectionTool`, `featuredSeries` catalog, `setMatchId(seriesId)`
- Produces: Integrated header experience with a "Select Match" interactive button displaying current match details, opening `GameSelectionTool`, while keeping `<select aria-label="Select Series">` synced for seamless testing and accessibility.

- [x] **Step 1: Write test in CoachDashboard.test.tsx verifying Game Selection Tool trigger and interaction**
...
- [x] **Step 2: Run test to verify failure**
...
- [x] **Step 3: Update page.tsx with GameSelectionTool trigger and modal state**
...
- [x] **Step 4: Run all frontend tests to verify pass**
...
- [x] **Step 5: Commit dashboard integration**

```bash
git add c9-oracle/frontend/src/app/page.tsx c9-oracle/frontend/src/types/api.ts c9-oracle/frontend/src/components/CoachDashboard.test.tsx
git commit -m "feat(frontend): integrate game selection tool with interactive filters into dashboard header"
```

---

### Task 4: Full End-to-End Verification and Browser QA

**Files:**
- Test verification: Pytest suite, Jest suite, Next.js build check.
- Browser test: Subagent browser verification using smaller model.

- [x] **Step 1: Run complete backend test suite**
- [x] **Step 2: Run complete frontend test suite**
- [x] **Step 3: Verify Next.js production build**
- [x] **Step 4: Launch browser subagent using smaller model for interactive browser verification**
- [x] **Step 5: Commit final updates and documentation**
