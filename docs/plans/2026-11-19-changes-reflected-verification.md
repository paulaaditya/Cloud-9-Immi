# Changes Reflected Verification and Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify, validate, and harden the reflection of watercolor gradients, unslopped human coaching debriefs, and RoundSelection watercolor wash styling across both unit tests and runtime.

**Architecture:** 
1. Audit and verify `globals.css` watercolor linear gradients (`.c9-watercolor-card`, `.c9-watercolor-card-selected`, `.c9-watercolor-accent`) with `!important` overrides.
2. Verify all 7 `actionable_summary` entries in `MOCK_COACHING_REPORT` (`c9-oracle/frontend/src/app/page.tsx`) strictly adhere to `<Player>: <Instruction>` format with no occurrences of "incurred" or "Actionable fix:".
3. Verify `RoundSelection.tsx` uses `c9-watercolor-card`.
4. Add regression assertions to `RoundSelection.test.tsx` and `CoachDashboard.test.tsx` to explicitly test watercolor class binding and the elimination of robotic phrasing.
5. Run full test suite (`npm test`, 50 unit tests) and static type check (`npx tsc --noEmit`).

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, TypeScript, Jest, React Testing Library.

**Spec:** Task specifications from user request:
- CSS gradients with high visual contrast in `globals.css`
- 7 unslopped summaries in `MOCK_COACHING_REPORT` in `page.tsx`
- `c9-watercolor-card` container class on `RoundSelection.tsx`
- All 50 unit tests passing, zero TypeScript errors, no emojis.

## Global Constraints
- Do not use emojis in code, tests, or messages.
- Do not run `npm run build` while `next dev` is running.
- Ensure all 50 unit tests pass.

---

### Task 1: Audit and Verify Target Files

**Files:**
- `c9-oracle/frontend/src/app/globals.css`
- `c9-oracle/frontend/src/app/page.tsx`
- `c9-oracle/frontend/src/components/RoundSelection.tsx`

- [x] Verify `.c9-watercolor-card`, `.c9-watercolor-card-selected`, and `.c9-watercolor-accent` in `globals.css`.
- [x] Verify all 7 `actionable_summary` entries in `MOCK_COACHING_REPORT` in `page.tsx`.
- [x] Verify `RoundSelection.tsx` has `c9-watercolor-card` on the outer card container.

### Task 2: Add Regression Test Assertions for Watercolor and Unslopped Summaries

**Files:**
- `c9-oracle/frontend/src/components/RoundSelection.test.tsx`
- `c9-oracle/frontend/src/components/CoachDashboard.test.tsx`

- [ ] Add explicit assertion for `.toHaveClass("c9-watercolor-card")` on `round-selection-card` in `RoundSelection.test.tsx`.
- [ ] Add explicit assertions in `CoachDashboard.test.tsx` verifying:
  - `round-selection-card` has `c9-watercolor-card`.
  - `screen.getByText(/OXY: Establish buddy-system spacing/i)` is rendered in mock state.
  - Neither `incurred` nor `Actionable fix:` is present anywhere in rendered dashboard.

### Task 3: Execute Verification Suite

**Files:**
- `c9-oracle/frontend`

- [ ] Run `npm test` in `c9-oracle/frontend` to verify all 50 tests pass.
- [ ] Run `npx tsc --noEmit` in `c9-oracle/frontend` to verify 0 type errors.
- [ ] Verify runtime responses via HTTP curl against running dev server on `http://localhost:3000`.
