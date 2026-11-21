# Clean Code Refactoring: Complete Purge of Hardcoded & Obsolete Data

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely eliminate all hardcoded mock telemetry (`MOCK_MISTAKES`, `MOCK_COACHING_REPORT`, and silent mock fallbacks) from the frontend dashboard, extracting a dedicated API client and introducing clean loading, error, and live states following SOLID principles.

**Architecture:** Extract `frontend/src/lib/api.ts` for typed REST communication with the FastAPI backend; refactor `frontend/src/app/page.tsx` into a clean orchestrating container using `isLoading`, `error`, and `data: CoachingReportResponse | null`; remove 400+ lines of hardcoded mock objects; and ensure the dashboard exclusively renders live VLR 2026 VCT Season telemetry.

**Tech Stack:** Next.js 14/15, TypeScript, Tailwind CSS, Jest, React Testing Library.

**Spec:** [docs/plans/2026-11-20-clean-refactor-purge-hardcoded-data.md](file:///c:/Users/adity/OneDrive/Desktop/Desktop/College/c9%20Hackathon/c9-oracle/docs/plans/2026-11-20-clean-refactor-purge-hardcoded-data.md)

## Global Constraints

- Do not use emojis anywhere in code, markdown, logs, or UI text.
- Completely remove all hardcoded mock match and blunder objects from `page.tsx`. Zero silent fallbacks to mock data.
- The UI must exclusively display live 2026 VCT Season telemetry returned by the backend API.
- All tasks must follow strict Test-Driven Development (TDD) and pass without regressions.
- All implementation tasks are orchestrated using Gemini Flash models.

---

## Code Quality & Anti-Pattern Analysis

### Identified Code Smells & Hotspots:
1. **Bloated Container (SRP Violation):** `frontend/src/app/page.tsx` contains 785 lines, of which ~430 lines are static mock objects (`MOCK_MISTAKES`, `MOCK_COACHING_REPORT`).
2. **Silent Degradation Anti-Pattern:** On any network error, abort signal, or parsing delay, the application silently replaced live state with stale mock objects (`setData(MOCK_COACHING_REPORT)`), masking backend issues and misleading the user.
3. **Scattered Direct Fetches:** Inline `fetch()` calls with repeated string concatenation and duplicate query parameter formatting across components.
4. **Missing Loading / Error States:** No explicit loading skeleton or error retry state; UI was coupled to initial dummy data.

---

## Refactoring Plan & Ordered Tasks

### Task 1: Dedicated Frontend API Service Module

**Files:**
- Create: `c9-oracle/frontend/src/lib/api.ts`
- Test: `c9-oracle/frontend/src/lib/api.test.ts`

**Interfaces:**
- Consumes: `process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"`
- Produces:
  - `fetchFeaturedSeries(): Promise<FeaturedSeries[]>`
  - `fetchCoachingReport(matchId: string, gameId?: number): Promise<CoachingReportResponse>`
  - `fetchRoundInsight(matchId: string, roundNum: number): Promise<RoundCoachingInsight>`

- [ ] **Step 1: Write failing test for API service**

```typescript
// c9-oracle/frontend/src/lib/api.test.ts
import { fetchFeaturedSeries, fetchCoachingReport, fetchRoundInsight } from "./api";

describe("API Service Client", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("fetches featured series from /api/v1/featured-series", async () => {
    const mockSeries = [{ series_id: "vlr-c9-sen-2026", teams: "Cloud9 vs Sentinels", event: "VCT Americas 2026" }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSeries,
    } as Response);

    const result = await fetchFeaturedSeries();
    expect(result).toEqual(mockSeries);
    expect(global.fetch).toHaveBeenCalledWith("http://localhost:8000/api/v1/featured-series");
  });

  it("fetches coaching report from /api/v1/vlr/match/{id}/coaching-report", async () => {
    const mockReport = { series_id: "vlr-c9-sen-2026", team1_name: "Cloud9", team2_name: "Sentinels" };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockReport,
    } as Response);

    const result = await fetchCoachingReport("vlr-c9-sen-2026", 1);
    expect(result).toEqual(mockReport);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/vlr/match/vlr-c9-sen-2026/coaching-report?game_id=1",
      expect.any(Object)
    );
  });
});
```

- [x] **Step 2: Run test to verify failure**
- [x] **Step 3: Implement src/lib/api.ts**
- [x] **Step 4: Run test to verify pass**
- [x] **Step 5: Commit**

```bash
git add c9-oracle/frontend/src/lib/api.ts c9-oracle/frontend/src/lib/api.test.ts
git commit -m "feat(frontend): create dedicated typed api service client"
```

---

### Task 2: Purge Hardcoded Mock Data from Dashboard

**Files:**
- Modify: `c9-oracle/frontend/src/app/page.tsx`
- Modify: `c9-oracle/frontend/src/components/CoachDashboard.test.tsx`

**Interfaces:**
- Refactor `CoachDashboardPage`:
  - Delete `MOCK_MISTAKES` and `MOCK_COACHING_REPORT`.
  - Introduce `isLoading: boolean`, `error: string | null`, and `data: CoachingReportResponse | null`.
  - Add sleek glassmorphic loading spinner / skeleton when `isLoading && !data`.
  - Add explicit error banner with "Retry" action if fetching fails.
  - Render live match data without synthetic fallbacks.

- [x] **Step 1: Update CoachDashboard.test.tsx with pure live data mocking**
- [x] **Step 2: Run test to verify failure**
- [x] **Step 3: Refactor page.tsx to purge all mock arrays and use clean state**
- [x] **Step 4: Run test to verify pass**
- [x] **Step 5: Commit**

```bash
git add c9-oracle/frontend/src/app/page.tsx c9-oracle/frontend/src/components/CoachDashboard.test.tsx
git commit -m "refactor(frontend): purge all hardcoded mock data and implement clean live states"
```

---

### Task 3: Full Test Suite and Live Browser Verification

**Files:**
- Test: All backend and frontend test suites
- Test: Chrome DevTools MCP browser QA subagent

- [x] **Step 1: Run backend test suite (pytest)**
  `c9-oracle\backend\.venv\Scripts\pytest.exe c9-oracle\backend\tests`
- [x] **Step 2: Run frontend test suite (jest)**
  `npm --prefix c9-oracle\frontend test`
- [x] **Step 3: Dispatch Browser QA subagent with smaller model**
  Confirm that `http://localhost:3000` renders exclusively live 2026 VCT telemetry directly from the running backend.

---

## Execution Handoff & Choices

Plan complete and saved to `c9-oracle/docs/plans/2026-11-20-clean-refactor-purge-hardcoded-data.md`. How would you like to proceed with execution?

1. **Subagent-Driven Execution (Recommended):**
   - Dispatch Gemini Flash subagents to execute Task 1 (API service client) and Task 2 (clean refactor of `page.tsx`).
   - Run two-stage review and browser verification.

2. **Inline / Pair-Programming Execution:**
   - Execute tasks step-by-step in the current session.
   - Follow strict TDD: Red -> Green -> Refactor -> Commit.
