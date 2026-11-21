# Tactical Radar Canvas Zoom and Pan Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Review, refine, and robustly fix the tactical radar zoom and pan feature in MinimapReplay component with boundary clamping, scale-aware panning, trackpad precision, and comprehensive test coverage.

**Architecture:** Client-side React component (`MinimapReplay.tsx`) with 2D HTML5 canvas rendering transformed via `ctx.save()`, `ctx.translate(pan.x, pan.y)`, `ctx.scale(zoom, zoom)`, `ctx.restore()`. Overlay controls for Zoom In, Zoom Out, and Reset. Mouse wheel zoom with zero-delta guard, click-and-drag panning scaled to canvas dimensions with drag-jitter threshold, pan boundary clamping, and inverse-transformed mistake hit detection.

**Tech Stack:** Next.js, React 18, TypeScript, Tailwind CSS, Jest, React Testing Library.

**Spec:** Original task requirements in `<original_task>`.

## Global Constraints
- Manage `zoom` state (range 1.0x to 4.0x, default 1.0) and `pan` state (`{ x: number, y: number }`, default `{ x: 0, y: 0 }`).
- Overlay buttons: Zoom In (`+`, `data-testid="zoom-in-btn"`, `aria-label="Zoom in"`), Zoom Out (`-`, `data-testid="zoom-out-btn"`, `aria-label="Zoom out"`), Reset (`1x`, `data-testid="zoom-reset-btn"`, `aria-label="Reset zoom"`).
- Mouse wheel zooming on canvas (wheel up: zoom in, wheel down: zoom out).
- When `zoom > 1.0`, enable click-and-drag panning with `cursor-grab` / `cursor-grabbing`. When reset or at 1.0x, reset pan to `(0, 0)`.
- Canvas render transformation: `ctx.save()`, `ctx.translate(pan.x, pan.y)`, `ctx.scale(zoom, zoom)`, `ctx.restore()`.
- Mistake hit-detection inverse transformation: `worldX = (clickX - pan.x) / zoom`, `worldY = (clickY - pan.y) / zoom`.
- `npm test` passes completely in `c9-oracle/frontend`.
- `npx tsc --noEmit` passes with 0 diagnostics.
- Do NOT run `npm run build`.
- Do NOT use emojis in code or messages.

---

### Task 1: Fix edge cases and precision bugs in MinimapReplay.tsx

**Files:**
- Modify: `c9-oracle/frontend/src/components/MinimapReplay.tsx`

**Key Fixes:**
1. Fix `handleZoomIn` and `handleZoomOut` rounding precision from `* 10 / 10` to `* 100 / 100` so 0.25 wheel increments cleanly align with 0.5 button steps without jumping from 1.25 to 1.8.
2. In `handleWheel`, guard against `e.deltaY === 0` to prevent horizontal trackpad scroll from triggering unwanted zoom outs.
3. In `handleMouseDown`, verify `e.button === 0` so right/middle clicks do not initiate drag state.
4. Scale drag delta `dx` and `dy` by `(canvas.width / rect.width)` so panning follows the cursor 1:1 on screens of any resolution instead of lagging.
5. Increase drag-jitter threshold from 3px to 5px so stationary clicks on mistake pins are not misclassified as drags.
6. Cleanly manage `hasDraggedRef` across mouse leave and mouse up so stale drag flags do not suppress subsequent legitimate clicks.
7. Implement pan boundary clamping so the map cannot be lost in an unbounded void.
8. Reset zoom and pan when `mapName` changes.
9. Enhance mistake selection matching logic (`player_id`, `round_number`, `mistake_type`, `occurred_at`) to prevent false identity matches when `occurred_at` is undefined.

- [ ] **Step 1: Apply edits to `MinimapReplay.tsx`**
- [ ] **Step 2: Run `npx tsc --noEmit` to verify type safety**

### Task 2: Expand unit tests in MinimapReplay.test.tsx

**Files:**
- Modify: `c9-oracle/frontend/src/components/MinimapReplay.test.tsx`

**Key Tests to Add:**
1. Wheel event with `deltaY: 0` does not alter zoom.
2. Button zoom after fractional wheel zoom (e.g. 1.25 + 0.5 = 1.75x) preserves two-decimal precision.
3. Non-primary mouse button clicks (e.g. right click `button: 2`) do not trigger dragging cursor or pan changes.
4. Pan clamping prevents dragging map beyond visible boundary threshold.
5. Map change (switching `mapName` from Ascent to Lotus) resets zoom to 1.0x and pan to (0, 0).
6. Verify hit-detection when canvas is displayed with scaled client dimensions (`getBoundingClientRect` returns fractional scale).

- [ ] **Step 1: Update `MinimapReplay.test.tsx` with edge-case tests**
- [ ] **Step 2: Run `npm test` to verify all tests pass**
- [ ] **Step 3: Run `npx tsc --noEmit` to verify no type regressions**
