# Make Map Fill Padded Space and Render as Square Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate dead padding and letterbox gutters around the tactical minimap canvas, ensuring the map container and canvas fill the allotted space seamlessly edge-to-edge as an exact 1:1 square.

**Architecture:** Refactor the radar canvas container in `MinimapReplay.tsx` to remove internal padding (`p-3`) and letterboxed vertical stretching. Encapsulate the radar container as an exact 1:1 aspect-ratio element (`aspect-square`) with `max-w-full max-h-full`, clipping to its borders with `rounded-xl overflow-hidden`. Have the `<canvas>` fill 100% of this container (`w-full h-full block`), anchoring the zoom/pan overlay buttons directly onto the top-right corner of the active map canvas.

**Tech Stack:** React 19, Next.js 15, Tailwind CSS, HTML5 Canvas 2D, Jest, Testing Library.

**Spec:** User request: "make the map fill the padded space and make it a square" along with screenshot `media_1795091326814_84b12017.jpg` highlighting the excessive dark padding around the floating square map.

## Global Constraints

- No emojis anywhere in the codebase, tests, or documentation.
- Maintain 100% test pass rate across Jest (66 tests) and Pytest (40 tests).
- Preserve existing zoom (1.0x-4.0x) and pan drag interactions and 1:1 inverse coordinate hit detection.
- Do not run `npm run build` concurrently with active `next dev` daemon.

---

### Task 1: Refactor Radar Container in MinimapReplay.tsx to Square Edge-to-Edge Layout

**Files:**
- Modify: `c9-oracle/frontend/src/components/MinimapReplay.tsx:688-745`
- Test: `c9-oracle/frontend/src/components/MinimapReplay.test.tsx`

**Interfaces:**
- Consumes: `MinimapReplayProps`, `mapImageLoaded`, `zoom`, `pan`, `isDragging`
- Produces: Seamless 1:1 square radar card with edge-to-edge canvas and integrated overlay zoom controls

- [x] **Step 1: Write unit test verifying radar container has aspect-square and canvas fills container without padding**

In `c9-oracle/frontend/src/components/MinimapReplay.test.tsx`, add test:
```tsx
it("renders the radar container as an aspect-square wrapper with edge-to-edge canvas", () => {
  render(
    <MinimapReplay
      currentRound={1}
      totalRounds={24}
      mistakes={mockMistakes}
      kills={mockKills}
      onRoundChange={jest.fn()}
      mapName="Ascent"
    />
  );

  const radarContainer = screen.getByTestId("radar-container");
  expect(radarContainer).toBeInTheDocument();
  expect(radarContainer).toHaveClass("aspect-square");
  expect(radarContainer).not.toHaveClass("p-3");

  const canvas = screen.getByTestId("minimap-canvas");
  expect(canvas).toHaveClass("w-full");
  expect(canvas).toHaveClass("h-full");
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- -t "renders the radar container as an aspect-square wrapper"` in `c9-oracle/frontend`.
Expected: FAIL ("Unable to find an element by: [data-testid=\"radar-container\"]").

- [x] **Step 3: Update MinimapReplay.tsx layout structure**

Replace lines 688-742 in `MinimapReplay.tsx` with:
```tsx
      {/* Main Center Area: Radar Canvas & High-Detail Analysis Stream */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch flex-1 min-h-0">
        {/* Radar Column: Centers square radar container without dead letterbox margins */}
        <div className="md:col-span-7 flex items-center justify-center min-h-0 min-w-0 h-full overflow-hidden">
          {/* Square Radar Container: 1:1 Aspect Ratio edge-to-edge container */}
          <div
            data-testid="radar-container"
            className="relative aspect-square max-h-full max-w-full w-full h-auto rounded-xl overflow-hidden border border-sky-300/60 shadow-lg bg-[#050d1a] flex items-center justify-center"
          >
            {/* Floating Zoom & Pan Controls */}
            <div
              data-testid="radar-zoom-controls"
              className="absolute top-2.5 right-2.5 flex items-center gap-1 z-10 bg-slate-900/85 backdrop-blur-xs border border-sky-400/30 rounded-lg p-1 shadow-md"
            >
              <button
                type="button"
                data-testid="zoom-in-btn"
                aria-label="Zoom in"
                onClick={handleZoomIn}
                className="w-7 h-7 flex items-center justify-center text-xs font-mono font-bold text-sky-200 hover:text-white hover:bg-sky-500/20 active:bg-sky-500/30 rounded transition-colors"
              >
                +
              </button>
              <button
                type="button"
                data-testid="zoom-out-btn"
                aria-label="Zoom out"
                onClick={handleZoomOut}
                className="w-7 h-7 flex items-center justify-center text-xs font-mono font-bold text-sky-200 hover:text-white hover:bg-sky-500/20 active:bg-sky-500/30 rounded transition-colors"
              >
                -
              </button>
              <button
                type="button"
                data-testid="zoom-reset-btn"
                aria-label="Reset zoom"
                onClick={handleResetZoom}
                className="px-2 h-7 flex items-center justify-center text-[11px] font-mono font-bold text-sky-200 hover:text-white hover:bg-sky-500/20 active:bg-sky-500/30 rounded transition-colors"
              >
                1x
              </button>
            </div>

            <canvas
              ref={canvasRef}
              data-testid="minimap-canvas"
              width={600}
              height={600}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onClick={handleCanvasClick}
              className={`w-full h-full block object-contain shadow-inner ${
                zoom > 1.0 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-crosshair"
              }`}
            />
          </div>
        </div>
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test` in `c9-oracle/frontend`.
Expected: PASS (all 67 unit tests pass).

- [x] **Step 5: Verify TypeScript diagnostics**

Run: `npx tsc --noEmit` in `c9-oracle/frontend`.
Expected: Exit code 0 with 0 errors.
