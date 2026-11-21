# Multi-Map Series Telemetry & 2026 VCT Authentic Season Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide authentic multi-map series telemetry for every match across the complete 2026 VCT Season (VCT Americas Kickoff, Stage 1, Stage 2, Masters Santiago, Masters London, Champions Shanghai), ensuring Cloud9 only appears in VCT Americas tournaments, and enable seamless map-by-map switching with individual round telemetry, player stats, and tactical insights.

**Architecture:**
- Backend `vlr_2026_season.py`: Ingest authentic 2026 VCT matches with multi-map data structures (maps array with distinct maps, map-specific scores, rosters, and round-by-round events for game_id "1", "2", "3", etc.).
- Normalizer `vlr_parser.py` & API `routes.py`: Expose all series maps in `ParsedSeries.games`, compute active map telemetry for the requested `game_id`, and ensure `/api/v1/featured-series` indexes all tournaments with team, date, and event filters.
- Frontend `page.tsx` & `GameSelectionTool.tsx`: Dynamically render map tabs (`Map 1: Haven`, `Map 2: Abyss`, etc.) from the active series, re-fetching map-specific telemetry on click and updating minimap replay, round scrubber, and player mistake cards.

**Tech Stack:** Python 3.11, FastAPI, Pydantic v2, Next.js 14/15, TypeScript, Tailwind CSS, Jest, React Testing Library, Pytest.

**Spec:** [docs/plans/2026-11-20-multi-map-series-telemetry-and-switcher.md](file:///c:/Users/adity/OneDrive/Desktop/Desktop/College/c9%20Hackathon/c9-oracle/docs/plans/2026-11-20-multi-map-series-telemetry-and-switcher.md)

## Global Constraints

- Do not use emojis anywhere in code, markdown, logs, or UI text.
- Cloud9 matches must ONLY appear in VCT Americas tournaments (Kickoff, Stage 1, and Stage 2). Cloud9 must NOT appear in Masters Santiago, Masters London, or Champions Shanghai.
- Every match must feature multi-map series telemetry (minimum 2 to 3 maps for Bo3, up to 5 maps for Bo5 Grand Finals) with authentic map names and scores.
- Zero fake or hardcoded single-map duplicates; all data reflects authentic 2026 VCT tournament records.
- All tasks must follow strict Test-Driven Development (TDD): failing test first, minimal implementation, passing test, and commit.
- All implementation tasks are orchestrated using Gemini Flash models.
- Browser environment testing must be performed using a subagent with a smaller model.

---

## Subpart Breakdown & Bite-Sized Tasks

### Task 1: Authentic 2026 VCT Tournament Catalog & Multi-Map Telemetry Generator (Backend)

**Files:**
- Modify: `c9-oracle/backend/src/data/vlr_2026_season.py`
- Test: `c9-oracle/backend/tests/test_vlr_2026_season.py`

**Interfaces:**
- Consumes: None (Built-in verified 2026 VCT telemetry data store)
- Produces:
  - `get_2026_matches_catalog() -> List[Dict[str, Any]]`: returns catalog covering VCT Americas Kickoff, Stage 1, Stage 2, Masters Santiago, Masters London, Champions Shanghai.
  - `get_2026_match_details(match_id: str) -> VLRMatchDetailsResponse`: returns full `maps` list with `map_id`, `map_name`, `team1_score`, `team2_score`, and map-specific player stats.
  - `get_2026_match_logs(match_id: str, game_id: str = "1") -> VLRMatchLogsResponse`: returns map-specific round-by-round events matching the selected map.

- [ ] **Step 1: Write failing tests for authentic 2026 VCT tournaments and multi-map structure**

```python
def test_cloud9_only_in_vct_americas():
    catalog = get_2026_matches_catalog()
    for item in catalog:
        teams = [item["team1_name"].lower(), item["team2_name"].lower()]
        if "cloud9" in teams:
            assert "VCT Americas" in item["event_name"], f"Cloud9 found in non-Americas event: {item['event_name']}"

def test_tournaments_present_in_catalog():
    catalog = get_2026_matches_catalog()
    events = {item["event_name"] for item in catalog}
    assert any("Kickoff" in e for e in events)
    assert any("Stage 1" in e for e in events)
    assert any("Stage 2" in e for e in events)
    assert any("Santiago" in e for e in events)
    assert any("London" in e for e in events)
    assert any("Shanghai" in e for e in events)

def test_all_matches_have_multiple_maps():
    catalog = get_2026_matches_catalog()
    for item in catalog:
        details = get_2026_match_details(item["match_id"])
        assert len(details.data.maps) >= 2, f"Match {item['match_id']} has fewer than 2 maps"
```

- [ ] **Step 2: Run test to verify failure**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_vlr_2026_season.py -k "cloud9_only or tournaments_present or multiple_maps"`
Expected: FAIL

- [ ] **Step 3: Implement authentic multi-map tournament dataset in vlr_2026_season.py**

Populate authentic 2026 matches:
- VCT Americas 2026 Kickoff: C9 vs LOUD (Haven 13-7, Abyss 13-11), C9 vs NRG (Pearl 2-13, Breeze 9-13), C9 vs LEV (Bind 13-5, Breeze 13-7), C9 vs G2 (Corrode 11-13, Bind 9-13), C9 vs 100T (Pearl 12-14, Split 13-11, Abyss 2-13), FURIA vs G2 (Abyss 13-7, Bind 6-13, Split 13-3).
- VCT Masters 2026 Santiago: Nongshim RedForce vs Paper Rex (Corrode 13-11, Bind 13-9, Haven 13-8), Paper Rex vs FURIA (Haven 9-13, Breeze 13-4, Split 13-7), NRG vs FURIA (Ascent 13-10, Sunset 11-13, Bind 13-9), Paper Rex vs NRG (Sunset 13-8, Bind 13-11, Ascent 9-13, Haven 13-7). (NO C9)
- VCT Americas 2026 Stage 1: C9 vs LEV (Pearl 6-13, Haven 5-13), C9 vs Envy (Split 13-11, Pearl 5-13, Haven 9-13), MIBR vs C9 (Breeze 12-14, Split 12-14), G2 vs C9 (Lotus 13-6, Split 13-9), SEN vs 100T (Ascent 13-9, Bind 13-11), LOUD vs LEV (Icebox 13-8, Sunset 13-10).
- VCT Masters 2026 London: LEV vs PRX (Fracture 3-13, Split 6-13, Breeze 13-11, Ascent 13-10, Lotus 13-5), PRX vs TH (Bind 13-8, Sunset 11-13, Haven 13-10), LEV vs FNC (Pearl 13-9, Ascent 13-7). (NO C9)
- VCT Americas 2026 Stage 2: SEN vs C9 (Summit 13-4, Haven 11-13, Lotus 16-14), C9 vs LOUD (Haven 13-8, Sunset 8-13, Summit 8-13), C9 vs KRÜ (Ascent 13-7, Bind 13-10), 100T vs C9 (Split 13-11, Pearl 11-13, Breeze 13-8), EG vs C9 (Sunset 13-9, Haven 13-11), SEN vs NRG (Sunset 13-11, Ascent 13-8).
- VALORANT Champions 2026 Shanghai: LOUD vs Team Vitality (Summit 13-11, Lotus 8-13, Sunset 13-9, Haven 13-7), PRX vs LOUD (Bind 13-10, Ascent 9-13, Haven 13-11), VIT vs NRG (Pearl 13-9, Split 13-11), TL vs PRX (Lotus 11-13, Sunset 13-9, Breeze 13-10). (NO C9)

Update `_build_match_details` to return all map details.
Update `_build_match_logs` to index round events matching the selected `game_id`.

- [ ] **Step 4: Run test to verify pass**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_vlr_2026_season.py`
Expected: PASS

- [ ] **Step 5: Commit backend telemetry changes**

```bash
git add c9-oracle/backend/src/data/vlr_2026_season.py c9-oracle/backend/tests/test_vlr_2026_season.py
git commit -m "feat(data): implement authentic 2026 VCT tournaments and multi-map telemetry generator"
```

---

### Task 2: Multi-Map Normalization & API Routing Integration (Backend)

**Files:**
- Modify: `c9-oracle/backend/src/data/vlr_parser.py`
- Modify: `c9-oracle/backend/src/api/routes.py`
- Test: `c9-oracle/backend/tests/test_vlr_parser.py`
- Test: `c9-oracle/backend/tests/test_api_vlr_pure.py`

**Interfaces:**
- Consumes: `VLRMatchLogsResponse`, `VLRMatchDetailsResponse`
- Produces:
  - `normalize_vlr_series(logs, details) -> ParsedSeries`: includes all maps from `details.data.maps` in `games`, with active map rounds populated.
  - `GET /api/v1/vlr/match/{match_id}/coaching-report?game_id={game_id}`:
    - `total_games`: reflects total maps in series (e.g. 2, 3, or 5).
    - `selected_game_index`: index corresponding to `game_id`.
    - `games`: array of all maps in series.
    - `player_stats`: populated for the active map.
    - `mistakes` & `round_insights`: calculated for the active map.

- [ ] **Step 1: Write failing tests for multi-map coaching report**

```python
def test_coaching_report_multi_map_series():
    resp_map1 = client.get("/api/v1/vlr/match/vlr-c9-loud-kickoff2026/coaching-report?game_id=1")
    assert resp_map1.status_code == 200
    data1 = resp_map1.json()
    assert data1["total_games"] == 2
    assert len(data1["games"]) == 2
    assert data1["games"][0]["map_name"] == "Haven"
    assert data1["games"][1]["map_name"] == "Abyss"
    assert data1["selected_game_index"] == 0

    resp_map2 = client.get("/api/v1/vlr/match/vlr-c9-loud-kickoff2026/coaching-report?game_id=2")
    assert resp_map2.status_code == 200
    data2 = resp_map2.json()
    assert data2["selected_game_index"] == 1
    assert data2["games"][1]["map_name"] == "Abyss"
    assert len(data2["games"][1]["rounds"]) == 24
```

- [ ] **Step 2: Run test to verify failure**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests\test_api_vlr_pure.py -k "coaching_report_multi_map"`
Expected: FAIL

- [ ] **Step 3: Update normalize_vlr_series and routes.py**

- In `vlr_parser.py`: iterate over all maps in `details.data.maps`. Populate `games` with all maps, setting active rounds for `game_id`.
- In `routes.py`:
  - Determine `selected_game_index = next((i for i, m in enumerate(details.data.maps) if m.map_id == str(game_id)), 0)`.
  - Extract active map stats and round events.
  - Return `total_games = len(details.data.maps)` and `selected_game_index`.

- [ ] **Step 4: Run backend tests to verify pass**

Run: `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests`
Expected: All tests pass

- [ ] **Step 5: Commit backend API changes**

```bash
git add c9-oracle/backend/src/data/vlr_parser.py c9-oracle/backend/src/api/routes.py c9-oracle/backend/tests/test_vlr_parser.py c9-oracle/backend/tests/test_api_vlr_pure.py
git commit -m "feat(api): support multi-map series navigation and active map telemetry"
```

---

### Task 3: Map Switcher Dynamic Integration (Frontend)

**Files:**
- Modify: `c9-oracle/frontend/src/app/page.tsx`
- Test: `c9-oracle/frontend/src/components/CoachDashboard.test.tsx`

**Interfaces:**
- Consumes: `report.games` (all maps in series), `currentGameIndex` from `useCoachStore`
- Produces:
  - Renders all map buttons in header (`Map 1: Haven`, `Map 2: Abyss`, etc.).
  - Clicking a map button updates `currentGameIndex` and fetches map-specific telemetry.
  - Scrubber, total rounds, player cards, and SLM coaching insights update dynamically.

- [ ] **Step 1: Write test in CoachDashboard.test.tsx for map switching**

```typescript
it("renders all map tabs and switches active map data when Map 2 is clicked", async () => {
  await act(async () => {
    render(<CoachDashboardPage />);
  });

  const map1Btn = screen.getByRole("button", { name: /map 1/i });
  const map2Btn = screen.getByRole("button", { name: /map 2/i });
  expect(map1Btn).toBeInTheDocument();
  expect(map2Btn).toBeInTheDocument();

  await act(async () => {
    fireEvent.click(map2Btn);
  });

  expect(useCoachStore.getState().currentGameIndex).toBe(1);
});
```

- [ ] **Step 2: Run test to verify failure or pass**

Run: `npm --prefix c9-oracle\frontend test src/components/CoachDashboard.test.tsx -- --watchAll=false -t "switches active map data"`
Expected: FAIL or verify behavior

- [ ] **Step 3: Update page.tsx for reactive map switching**

- Update `fetchCoachingReport` call when `currentGameIndex` changes.
- Reset `currentRound` to 1 on map switch.
- Sync active map name and round counts.

- [ ] **Step 4: Run frontend tests to verify pass**

Run: `npm --prefix c9-oracle\frontend test -- --watchAll=false`
Expected: All tests pass

- [ ] **Step 5: Commit frontend changes**

```bash
git add c9-oracle/frontend/src/app/page.tsx c9-oracle/frontend/src/components/CoachDashboard.test.tsx
git commit -m "feat(frontend): implement reactive multi-map switching and score synchronization"
```

---

### Task 4: End-to-End Verification & Browser QA

- [ ] **Step 1: Run complete backend test suite (`pytest`)**
- [ ] **Step 2: Run complete frontend test suite (`jest`)**
- [ ] **Step 3: Verify Next.js production build (`npm run build`)**
- [ ] **Step 4: Launch browser subagent using smaller model for interactive browser testing of game selection tool and map switcher**
- [ ] **Step 5: Commit final updates and documentation**
