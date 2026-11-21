# Wireframe Layout Overhaul & Responsive Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Cloud9 Oracle HUD layout to strictly adhere to the uploaded wireframe specification (Top: Header, Left: Round Selection + Map, Right: Player Error Report + Training Drills), fixing responsive clipping, composition encapsulation, and aspect ratio scaling.

**Architecture:** 
- Composed 4-card HUD layout directly at page level in `page.tsx`.
- First-class `RoundSelection` component taking top of left column.
- `MinimapReplay` taking bottom of left column with `standalone` backward compatibility for existing test suites.
- Modern CSS flex/grid layout supporting full-viewport fit on desktop (`lg:`) and seamless document scrolling on mobile/tablet (`< lg`).
- Flexible canvas scaling respecting both width and height bounds (`max-w-full max-h-full aspect-square object-contain`).

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, TypeScript, Jest, React Testing Library, Lucide React.

**Spec:** Target wireframe at `C:/Users/adity/.gemini/antigravity/brain/6167cf8c-bcf4-4131-aeaf-b018fa47d442/.user_uploaded/media_1795080148176_1cdd61d9.png`.

## Global Constraints
- Do NOT use emojis in code or messages.
- Keep all existing functionality, interactive state, and data loading intact.
- Zero regressions in existing frontend tests (`npm test`) and build checks (`npm run build`).

---

### Task 1: Refactor MinimapReplay and RoundSelection Composition

**Files:**
- Modify: `c9-oracle/frontend/src/components/MinimapReplay.tsx`
- Modify: `c9-oracle/frontend/src/components/RoundSelection.tsx`
- Test: `c9-oracle/frontend/src/components/MinimapReplay.test.tsx`
- Test: `c9-oracle/frontend/src/components/RoundSelection.test.tsx`

**Interfaces:**
- `MinimapReplayProps`: add `standalone?: boolean` (defaults to `true`).
  When `standalone = true`, renders `RoundSelection` internally (retaining 100% test compatibility with `MinimapReplay.test.tsx`).
  When `standalone = false`, renders the tactical map replay card directly as a discrete component.
- Fix canvas container heights from hardcoded `min-h-[380px]` to responsive `min-h-0 flex-1` with `max-w-full max-h-full aspect-square object-contain`.

- [ ] **Step 1: Update MinimapReplay with standalone prop and responsive height classes**
- [ ] **Step 2: Run tests in frontend to verify MinimapReplay.test.tsx and RoundSelection.test.tsx pass**

---

### Task 2: Refactor Page Level Layout in page.tsx

**Files:**
- Modify: `c9-oracle/frontend/src/app/page.tsx`

**Interfaces:**
- Import `RoundSelection` directly into `page.tsx`.
- Left column:
  - Top: `<RoundSelection ... />`
  - Bottom: `<MinimapReplay ... standalone={false} />`
- Right column:
  - Top: `<div data-testid="player-error-report-card"><PlayerReportCards ... /></div>`
  - Bottom: `<div data-testid="training-drills-card"><DrillPrescriptions ... /></div>`
- Outer container: `min-h-screen lg:h-screen lg:overflow-hidden`
- Main grid: `overflow-y-auto lg:overflow-hidden grid-cols-1 lg:grid-cols-12`
- Responsive columns: `col-span-12 lg:col-span-7 flex flex-col min-h-0 lg:h-full gap-3.5` and `col-span-12 lg:col-span-5 flex flex-col min-h-0 lg:h-full gap-4`.

- [ ] **Step 1: Update page.tsx with explicit RoundSelection + MinimapReplay composition and responsive scrolling**
- [ ] **Step 2: Run test suite to verify zero regressions**

---

### Task 3: Comprehensive Test & Build Verification

**Files:**
- Run: `npm test` in `c9-oracle/frontend`
- Run: `npm run build` in `c9-oracle/frontend`
- Run: `pytest` in `c9-oracle/backend`

- [ ] **Step 1: Run all frontend test suites**
- [ ] **Step 2: Run Next.js production build**
- [ ] **Step 3: Run backend test suite**
- [ ] **Step 4: Verify live dev server HTTP 200 response**
