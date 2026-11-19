# Authentic Cloud9 Logo and Radar Map Harmonization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Cloud9 logo with the authentic standalone 3-interlocking-9s esports emblem and harmonize all radar and minimap assets, coordinate transforms, and site landmarks so telemetry and radar maps match 100% across all Valorant maps.

**Architecture:** 
1. Embed the authentic official Cloud9 3-swirl emblem in `Cloud9Logo.tsx` and `c9-logo.svg` with zero lettering, exact viewBox `0 0 50 36`, and frosted cyan watermark matching the team's esports aesthetic.
2. Harmonize radar image loading in `MinimapReplay.tsx`: synchronously clear previous map textures on map change, eliminate wrong fallback to Ascent, and render subtle tactical site landmark overlays on the radar canvas.
3. Update `mapCoords.ts` with calibrated world boundaries for all maps (including `corrode` and `summit`) from real match telemetry, and generate high-tech tactical radar images for `corrode.png` and `summit.png`.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, HTML5 Canvas 2D, Jest, Python (PIL/numpy for asset harmonization).

**Spec:** User feedback specifying authentic Cloud9 logo without text (`media_1795070513853_a3e7642b.jpg`) and elimination of radar/map image mismatches across all maps.

## Global Constraints
- No emojis anywhere in UI, code, tests, or documentation.
- Always act as orchestrator and use Gemini Flash models for subagent tasks and testing.
- Maintain 100% test pass rate across Jest and Pytest test suites.
- All file links must use valid markdown file URLs.

---

### Task 1: Update Cloud9 Logo with Authentic 3-Swirl Esports Emblem

**Files:**
- Modify: `c9-oracle/frontend/src/components/Cloud9Logo.tsx`
- Modify: `c9-oracle/frontend/public/c9-logo.svg`
- Test: `c9-oracle/frontend/src/components/Cloud9Logo.test.tsx`

**Interfaces:**
- Consumes: SVG vector path for official 3-swirl Cloud9 emblem with viewBox `0 0 50 36`.
- Produces: `<Cloud9Logo size={number} glow={boolean} showWatermark={boolean} className={string} />`

- [ ] **Step 1: Write test for Cloud9Logo component**

Create `c9-oracle/frontend/src/components/Cloud9Logo.test.tsx`:
```tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { Cloud9Logo } from "./Cloud9Logo";

describe("Cloud9Logo", () => {
  it("renders official Cloud9 logo SVG with correct viewBox and accessibility role", () => {
    render(<Cloud9Logo size={40} glow={true} showWatermark={true} />);
    const logo = screen.getByRole("img", { name: "Cloud9 Logo" });
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("viewBox", "0 0 50 36");
  });

  it("renders watermark layer when showWatermark is true", () => {
    const { container } = render(<Cloud9Logo size={40} showWatermark={true} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(2);
  });

  it("does not render watermark layer when showWatermark is false", () => {
    const { container } = render(<Cloud9Logo size={40} showWatermark={false} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd c9-oracle/frontend; npm test -- src/components/Cloud9Logo.test.tsx --watchAll=false`
Expected: FAIL (viewBox mismatch, currently `0 0 256 234`).

- [ ] **Step 3: Update Cloud9Logo.tsx and c9-logo.svg**

Update `c9-oracle/frontend/src/components/Cloud9Logo.tsx`:
```tsx
"use client";

import React from "react";

interface Cloud9LogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
  showWatermark?: boolean;
}

export function Cloud9Logo({
  className = "",
  size = 38,
  glow = true,
  showWatermark = true,
}: Cloud9LogoProps) {
  // Authentic official Cloud9 esports 3-interlocking-9s emblem (zero lettering)
  const c9EmblemPath =
    "m19.0 2.0c3.597-2.7652 9.1928-2.6555 12.602 0.37684 2.319 2.0316 3.3247 5.2972 2.9252 8.3106-0.31256 1.8136-1.1356 3.4861-1.9724 5.1081-1.433 2.6215-2.8635 5.2467-4.3065 7.8632 2.7198 1.5111 5.4345 3.0298 8.1518 4.5435 0.66923 0.38818 1.3876 0.69696 2.135 0.90239 1.2868 0.36424 2.7803 0.024 3.7142-0.95406 1.3927-1.3964 1.4116-3.9108 0.0366-5.3249-1.2679-1.3712-3.4924-1.4431-5.0652-0.59235-1.225 0.71586-1.6586 2.2056-1.7279 3.539-1.709-0.93894-3.4331-1.8464-5.1484-2.774 0.60118-2.653 2.4702-4.9468 4.9203-6.1151 3.82-1.8476 8.8992-0.99188 11.656 2.3203 2.9378 3.5705 2.8824 9.3188-0.21048 12.78-1.7178 1.9598-4.3343 2.9945-6.9141 3.0046-2.1413 0.0907-4.1276-0.86458-6.0067-1.7733-7.0767-3.8163-14.09-7.7472-21.143-11.609-1.065-0.52051-2.2711-0.98179-3.4722-0.71208-1.2402 0.21047-2.3026 1.1469-2.7248 2.324-0.48397 1.3775-0.20543 3.0525 0.8608 4.0885 1.2603 1.2666 3.36 1.341 4.8913 0.55832 1.2906-0.67931 1.743-2.2131 1.8237-3.5718 1.7153 0.92256 3.442 1.8262 5.1421 2.7752-0.86585 4.028-4.7653 7.0591-8.8614 7.0465-2.4891 0.10587-5.0438-0.70956-6.8915-2.406-4.178-3.7646-3.9423-11.325 0.56462-14.741 2.6404-2.0039 6.3772-2.498 9.4272-1.1734 3.4193 1.3914 6.502 3.4684 9.823 5.0665 1.5968-2.8584 3.2-5.7131 4.793-8.574 0.59613-1.1734 1.0902-2.5396 0.68688-3.8566-0.44364-1.7367-2.3001-2.8647-4.0494-2.6316-1.6183 0.10587-3.0752 1.404-3.3096 3.0197-0.16511 1.2288 6e-3 2.6177 0.88475 3.5592 0.8066 0.84568 2.0077 1.1166 3.1319 1.1998-0.93516 1.7115-1.8212 3.452-2.7929 5.1421-3.636-0.81921-6.5171-4.0646-6.957-7.7548-0.4701-3.2983 0.702-6.8927 3.384-8.9647";

  const height = Math.round((size * 36) / 50);

  return (
    <div
      className={`inline-flex items-center justify-center relative select-none ${className}`}
      style={{ width: size, height }}
    >
      {/* Soft Ambient Cyan Glow */}
      {glow && (
        <div
          className="absolute inset-0 rounded-full bg-[#008cd4]/25 blur-md pointer-events-none transform scale-125"
          aria-hidden="true"
        />
      )}

      {/* Background Frosted Watermark Layer (matching reference image) */}
      {showWatermark && (
        <svg
          width={Math.round(size * 1.45)}
          height={Math.round((size * 1.45 * 36) / 50)}
          viewBox="0 0 50 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute pointer-events-none opacity-30 transform -translate-x-0.5 -translate-y-0.5"
          aria-hidden="true"
        >
          <path d={c9EmblemPath} fill="#7dd3fc" />
        </svg>
      )}

      {/* Foreground Official Cloud9 Blue Emblem */}
      <svg
        width={size}
        height={height}
        viewBox="0 0 50 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 transition-transform duration-300 hover:scale-105 drop-shadow-[0_2px_8px_rgba(0,140,212,0.4)]"
        role="img"
        aria-label="Cloud9 Logo"
      >
        <defs>
          <linearGradient
            id="c9OfficialGrad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#00aaec" />
            <stop offset="50%" stopColor="#008cd4" />
            <stop offset="100%" stopColor="#006bb3" />
          </linearGradient>
        </defs>
        <path d={c9EmblemPath} fill="url(#c9OfficialGrad)" />
      </svg>
    </div>
  );
}
```

Update `c9-oracle/frontend/public/c9-logo.svg`:
```xml
<svg viewBox="0 0 50 36" width="500" height="360" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="c9BlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00aaec" />
      <stop offset="50%" stop-color="#008cd4" />
      <stop offset="100%" stop-color="#006bb3" />
    </linearGradient>
  </defs>
  <path d="m19.0 2.0c3.597-2.7652 9.1928-2.6555 12.602 0.37684 2.319 2.0316 3.3247 5.2972 2.9252 8.3106-0.31256 1.8136-1.1356 3.4861-1.9724 5.1081-1.433 2.6215-2.8635 5.2467-4.3065 7.8632 2.7198 1.5111 5.4345 3.0298 8.1518 4.5435 0.66923 0.38818 1.3876 0.69696 2.135 0.90239 1.2868 0.36424 2.7803 0.024 3.7142-0.95406 1.3927-1.3964 1.4116-3.9108 0.0366-5.3249-1.2679-1.3712-3.4924-1.4431-5.0652-0.59235-1.225 0.71586-1.6586 2.2056-1.7279 3.539-1.709-0.93894-3.4331-1.8464-5.1484-2.774 0.60118-2.653 2.4702-4.9468 4.9203-6.1151 3.82-1.8476 8.8992-0.99188 11.656 2.3203 2.9378 3.5705 2.8824 9.3188-0.21048 12.78-1.7178 1.9598-4.3343 2.9945-6.9141 3.0046-2.1413 0.0907-4.1276-0.86458-6.0067-1.7733-7.0767-3.8163-14.09-7.7472-21.143-11.609-1.065-0.52051-2.2711-0.98179-3.4722-0.71208-1.2402 0.21047-2.3026 1.1469-2.7248 2.324-0.48397 1.3775-0.20543 3.0525 0.8608 4.0885 1.2603 1.2666 3.36 1.341 4.8913 0.55832 1.2906-0.67931 1.743-2.2131 1.8237-3.5718 1.7153 0.92256 3.442 1.8262 5.1421 2.7752-0.86585 4.028-4.7653 7.0591-8.8614 7.0465-2.4891 0.10587-5.0438-0.70956-6.8915-2.406-4.178-3.7646-3.9423-11.325 0.56462-14.741 2.6404-2.0039 6.3772-2.498 9.4272-1.1734 3.4193 1.3914 6.502 3.4684 9.823 5.0665 1.5968-2.8584 3.2-5.7131 4.793-8.574 0.59613-1.1734 1.0902-2.5396 0.68688-3.8566-0.44364-1.7367-2.3001-2.8647-4.0494-2.6316-1.6183 0.10587-3.0752 1.404-3.3096 3.0197-0.16511 1.2288 6e-3 2.6177 0.88475 3.5592 0.8066 0.84568 2.0077 1.1166 3.1319 1.1998-0.93516 1.7115-1.8212 3.452-2.7929 5.1421-3.636-0.81921-6.5171-4.0646-6.957-7.7548-0.4701-3.2983 0.702-6.8927 3.384-8.9647" fill="url(#c9BlueGrad)" />
</svg>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd c9-oracle/frontend; npm test -- src/components/Cloud9Logo.test.tsx --watchAll=false`
Expected: PASS (all tests pass).

---

### Task 2: Harmonize Radar Map Bounds and Landmarking in `mapCoords.ts`

**Files:**
- Modify: `c9-oracle/frontend/src/lib/mapCoords.ts`
- Modify: `c9-oracle/frontend/src/lib/mapCoords.test.ts`
- Create: `c9-oracle/frontend/public/maps/corrode.png`
- Create: `c9-oracle/frontend/public/maps/summit.png`

**Interfaces:**
- Consumes: Known Valorant map identifiers and telemetry bounds.
- Produces: `KNOWN_MAPS`, `MAP_BOUNDS`, `MAP_LANDMARKS`, `normalizeMapName`, `getMapDisplayName`, `mapWorldToCanvas`.

- [ ] **Step 1: Write failing tests for mapCoords extensions**

Add tests to `c9-oracle/frontend/src/lib/mapCoords.test.ts`:
```ts
  it("recognizes corrode and summit maps", () => {
    expect(normalizeMapName("corrode")).toBe("corrode");
    expect(normalizeMapName("summit")).toBe("summit");
    expect(getMapDisplayName("corrode")).toBe("Corrode");
    expect(getMapDisplayName("summit")).toBe("Summit");
  });

  it("translates real telemetry coordinates for Ascent accurately within bounds", () => {
    // Real Ascent kill coords: X=-4838.0, Y=-9554.2
    const pos = mapWorldToCanvas("ascent", -4838.0, -9554.2, 600, 600);
    expect(pos.x).toBeGreaterThan(0);
    expect(pos.x).toBeLessThan(600);
    expect(pos.y).toBeGreaterThan(0);
    expect(pos.y).toBeLessThan(600);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd c9-oracle/frontend; npm test -- src/lib/mapCoords.test.ts --watchAll=false`
Expected: FAIL ("corrode" returns "ascent").

- [ ] **Step 3: Update mapCoords.ts and generate missing map radar images**

1. In `c9-oracle/frontend/src/lib/mapCoords.ts`:
   - Add `"corrode"` and `"summit"` to `KNOWN_MAPS`.
   - Update `MAP_BOUNDS` for `ascent`: `{ minX: -5500, maxX: 8000, minY: -10500, maxY: -1500 }`.
   - Update `MAP_BOUNDS` for `pearl`: `{ minX: 0, maxX: 11000, minY: -6500, maxY: 7000 }`.
   - Add `MAP_BOUNDS` and `MAP_LANDMARKS` for `corrode` and `summit`.
2. Generate high-contrast tactical radar PNGs for `corrode.png` and `summit.png` in `public/maps/`.
3. Process `lotus.png`, `sunset.png`, and `abyss.png` to harmonize contrast with dark tactical themes.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd c9-oracle/frontend; npm test -- src/lib/mapCoords.test.ts --watchAll=false`
Expected: PASS.

---

### Task 3: Fix Radar Image Loading & Synchronous State in `MinimapReplay.tsx`

**Files:**
- Modify: `c9-oracle/frontend/src/components/MinimapReplay.tsx`
- Test: `c9-oracle/frontend/src/components/MinimapReplay.test.tsx`

**Interfaces:**
- Consumes: `mapName`, `currentRound`, `mistakes`, `kills`, `rounds`.
- Produces: Tactical radar canvas with synchronous map switching, zero incorrect fallback to Ascent, and persistent semi-transparent landmark overlays.

- [ ] **Step 1: Write failing test for synchronous map clearing**

In `c9-oracle/frontend/src/components/MinimapReplay.test.tsx`:
Add a test verifying that when `mapName` changes, it updates without defaulting to Ascent.

- [ ] **Step 2: Run test to verify failure**

Run: `cd c9-oracle/frontend; npm test -- src/components/MinimapReplay.test.tsx --watchAll=false`

- [ ] **Step 3: Update MinimapReplay.tsx**

In `c9-oracle/frontend/src/components/MinimapReplay.tsx`:
1. In `useEffect` for map image loading:
   - Call `setMapImageLoaded(false)` and set `mapImageRef.current = null` immediately on `mapName` change.
   - Remove `ascent.png` fallback from `img.onerror`:
     ```ts
     img.onerror = () => {
       mapImageRef.current = null;
       setMapImageLoaded(false);
     };
     ```
2. Canvas rendering pipeline:
   - Draw the radar image when loaded.
   - Draw tactical site landmark badges (`A Site`, `B Site`, etc.) as crisp, semi-transparent tactical overlays on top of the radar image so the user can easily correlate kill positions with sites.
   - Ensure the radar canvas fills the available height without excessive padding or wasted black space.

- [ ] **Step 4: Run test to verify all tests pass**

Run: `cd c9-oracle/frontend; npm test -- --watchAll=false`
Expected: PASS across all test suites.

---

### Task 4: Subagent End-to-End Visual Verification

**Role:** Browser QA Tester & Visual Verifier (Gemini Flash Subagent)
**Prompt:** Verify that the official Cloud9 logo appears correctly in the header and minimap replay, that radar maps switch cleanly without flashing Ascent, and that telemetry pins align with landmarks across all maps.
