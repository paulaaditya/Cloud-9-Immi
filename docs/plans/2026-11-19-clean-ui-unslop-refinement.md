# Clean UI, Layout Void Removal & Unslop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the vertical blank gap in `MinimapReplay.tsx`, declutter UI across all coaching panels, eliminate nested borders and badge soup in favor of clean inline meta and watercolor gradient accents, and unslop AI tells in coaching copy and test fixtures.

**Architecture:** 
1. Replace all remaining `justify-between` vertical flex constraints with top-aligned flex flows (`justify-start flex-1 min-h-0`) in `MinimapReplay.tsx` and `DrillPrescriptions.tsx`.
2. Refactor card hierarchy in `MinimapReplay.tsx` and `PlayerReportCards.tsx`: replace multi-box nested borders with soft subtle dividers and clean inline dot-separated metadata (`supamen · Astra · Evil Geniuses`).
3. Apply watercolor gradient classes (`.c9-watercolor-card`, `.c9-watercolor-card-selected`, `.c9-watercolor-accent`) to featured cards (selected player, top primary flaw card, active drill).
4. Remove AI vocabulary tells ("crucial") in `mistake_detector.py` and robotic summary strings in test fixtures.

**Tech Stack:** Next.js 15 (React 19), Tailwind CSS, Python FastAPI backend, Jest / React Testing Library, Pytest.

**Spec:** Original task requirements and screenshot evaluation.

## Global Constraints
- No emojis anywhere in code, markdown, or messages.
- All automated tests must pass (`npm test` in frontend, `pytest` in backend).
- `npm run build` must compile cleanly without Next.js invariant errors.

---

### Task 1: Fix Vertical Spacing & Remove Nested Borders in MinimapReplay.tsx
**Files:**
- Modify: `frontend/src/components/MinimapReplay.tsx`
- Test: `frontend/src/components/MinimapReplay.test.tsx`

- [ ] Remove `justify-between` on line 443 and ensure top-aligned flex layout on line 492 (`flex-1 min-h-0 justify-start`).
- [ ] Refactor breakdown mode mistake items: remove nested 4-sided borders (`border border-sky-100 bg-slate-50/60`), use subtle hover states, clean dividers between multiple flaws, and clean inline meta (`R{round} · {mistake_type} · {severity}`).
- [ ] Add `m.team_name` to list mode inline meta so it displays `playerLabel · characterName · teamName · R{round}`.
- [ ] Use `.c9-watercolor-accent` for Coach Note in mistake cards.
- [ ] Run `npm test` to verify all 50 tests pass.

### Task 2: Declutter PlayerReportCards.tsx & Apply Top Card Watercolor Accent
**Files:**
- Modify: `frontend/src/components/PlayerReportCards.tsx`
- Test: `frontend/src/components/PlayerReportCards.test.tsx`

- [ ] Apply `.c9-watercolor-card` to index 0 (top primary flaw card) as well as selected card.
- [ ] Convert agent character badge pill to clean inline dot-separated item (`displayName · characterName · teamName`).
- [ ] Replace harsh stacked horizontal borders (`border-t border-sky-100/70`) with a clean cohesive stats pill or grid.
- [ ] Declutter flaws breakdown list by replacing nested 4-sided borders with soft subtle backgrounds and dividers.
- [ ] Update test fixture in `PlayerReportCards.test.tsx` to use unslopped summary copy.
- [ ] Run `npm test` to verify all tests pass.

### Task 3: Clean Up DrillPrescriptions.tsx, RoundSelection.tsx & Globals.css
**Files:**
- Modify: `frontend/src/components/DrillPrescriptions.tsx`
- Modify: `frontend/src/components/RoundSelection.tsx`
- Modify: `frontend/src/app/globals.css`

- [ ] Change `justify-between` to `justify-start gap-2.5` in drill cards to avoid awkward vertical stretching.
- [ ] Soften borders in `RoundSelection.tsx` scrubber track.
- [ ] Ensure `.c9-watercolor-card-selected` explicitly specifies `border: 1px solid #00aeef;`.
- [ ] Run `npm test` and `npm run build` to verify build succeeds.

### Task 4: Unslop Remaining AI Vocabulary in Backend
**Files:**
- Modify: `backend/src/analytics/mistake_detector.py`
- Test: `backend/tests/test_unslop_coaching.py`

- [ ] Replace AI vocabulary word "crucial" in `mistake_detector.py:168` with plain direct language.
- [ ] Run backend tests with pytest.
