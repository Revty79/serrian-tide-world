# Pass A2 — Smooth, Flatten, elevation controls, and review readiness

Date: October 17, 2026 (America/Denver). Approved A1 baseline: `e1297e3ff9df421440f93d04128f082bb4ff61e4`.

A2 implements only the authorized refinement, inspection, reset, aspect, and roadmap work. The owner's subsequent message directs delivery to **`main`**, superseding the initial dedicated-branch/no-main instruction. Local main was fast-forwarded to the approved A1 commit before implementation; no A2 branch or merge commit was created. The exact A2 commit SHA and confirmed push result are supplied in the completion message; `git log -1 --format=%H` confirms the local commit.

## Numerical brush behavior

Raise/Lower preserve A1's meters-per-dab additive operation, finite Float32 bounds, smooth radial falloff, and quarter-radius stroke spacing. Smooth/Flatten use the same reusable stroke engine and falloff, with a separate percentage intensity rather than a misleading meter-strength label.

```text
u       = distance from dab center / brush radius
falloff = clamp((1 - u)² × (1 + 2u), 0, 1), for u < 1; otherwise 0
alpha   = intensity × falloff, with intensity in [0, 1]
new h   = Float32(clamp((1 - alpha) × old h + alpha × target, Float32 limits))
```

For **Smooth**, the target is the mean of the sample's valid 3 × 3 neighborhood, including itself. Each dab reads from an independent pre-dab tile covering the brush plus a one-cell halo. All output samples therefore use the same source state, eliminating in-place directional scan artifacts. Edges use only existing neighbors, with no wraparound. The brush changes no samples outside its radius, supports water and land, and repeated passes progressively reduce local height contrasts without forcing the region to one uniform height.

For **Flatten**, the target is an explicitly entered positive, zero, or negative elevation in meters. Intensity determines how far each dab moves toward that target. The radial falloff softens the edge, and the convex blend never intentionally overshoots. At 100% intensity only the exact dab center receives a full target blend; surrounding samples approach it through falloff and overlapping/repeated dabs. A target of zero does not make every sample under the brush instantly equal sea level.

The UI uses 1–100% intensity per dab (default 50%). The engine also accepts zero as a safe no-op. Radius remains 0.5–20% of the map's shorter logical side in the UI, with a 6% default. Raise/Lower keep 10–1,000 m/dab and a 200 m/dab default. Controls retain separate meter strength, percentage intensity, and target drafts across tool selection. An empty or non-Float32-finite Flatten target disables editing until corrected. No tool switch resets the terrain.

All tools mutate the same existing `Float32Array`. The initial 512 × 512 grid, −100 m floor, sea level 0, terrain identity, metadata, and contract version 1 remain unchanged. Equivalent supplied polylines share fixed-distance stamp phase independent of pointer-event frequency. Per-dab snapshots are numerical implementation details, not Undo or saved historical states.

## Display, pointer accuracy, and inspection

The editing surface uses a centered **contain fit**:

```text
scale  = min(available width / logical width, available height / logical height)
map px = logical dimensions × scale
margin = (available dimensions - map px) / 2
```

The actual canvas and brush preview live in that fitted rectangle. The square initial map stays square; circular map-space brushes remain circular. Non-square logical dimensions retain their own aspect rather than being forced square. Grid resolution does not control screen aspect. Surrounding margins belong to the display container, have no terrain pointer listeners, show no terrain samples, and cannot initiate painting.

Pointer conversion uses the fitted canvas's actual CSS bounds. Device pixel ratio affects only its bitmap. Resize updates layout and rendering without resampling or modifying elevations. Active strokes stop on window-size or canvas-bound changes, even before delayed resize callbacks or fitting frames arrive. A1 capture, cancellation, release, touch, pen, boundary clipping, and frame scheduling remain in use.

The readout shows planar X/Y to three decimals in map units, nearest-sample elevation to one decimal in meters, and the actual above/at/below sea-level relation. It clears outside the map. Its reserved layout space keeps changes in text from moving the editing surface; the browser test verifies stable canvas bounds across readout updates. The relation uses the numerical value, not its rounded displayed text. Canvas accessibility text names all four tools correctly. No geographic coordinate system was added. Water and land legend bands call the same elevation color function as the raster, including deep/shallow water and low/high land colors.

Pointer readouts and the brush preview update through refs/DOM, with no React application render for each pointer event. The retained batching test confirms 60 pointer events in one task cause one repaint and zero React commits. Full-raster repainting remains frame-scheduled; no new dependency, server, worker, GPU, or performance framework was added.

## Confirmed Reset Terrain

The application asks for an explicit native confirmation before reset and states that Undo is unavailable. Cancellation preserves the edits. Acceptance fills the complete existing buffer with −100 m, retaining the terrain object, ID, metadata, array identity, and sample count. The host increments a `revision` prop to cancel any old component interaction and queue repainting after the explicit numerical mutation.

Reset is never called by resizing, tool switching, ordinary repainting, or cursor movement. The reusable engine exposes `resetTerrainToOcean`; the host owns confirmation and intent. Reloading the development example still creates a fresh blank map because persistence remains out of scope.

## Verification and evidence

| Check | Final result |
| --- | --- |
| `npm.cmd test` | **49 passed**: all 29 prior tests plus 20 new numerical/fitting tests |
| `npm.cmd run test:browser` | **71 passed, 1 intentionally skipped** across 72 scheduled cases |
| TypeScript | **Passed**, also included in the build |
| `npm.cmd run build` | **Passed** |
| Browser errors | No page or console errors in the final interaction suite |

The skipped desktop case is the duplicate of native touch coverage; that test passes in the mobile project. Desktop is Chromium at 1440 × 900/DPR 1; mobile is Pixel 7 Chromium emulation at 412 × 839/DPR 2.625 with touch. Fitting tests also resize to 1400 × 650, 420 × 1000, and 900 × 900.

New coverage includes Smooth intensity, repeated passes, symmetry, underwater/land behavior, corner neighborhoods, preserved outside samples, Flatten positive/zero/negative targets, edge blending, finite extreme values, invalid-input rejection, source-halo validation, equivalent strokes, cursor accuracy, sea-level relation, target validation, reset cancellation/acceptance, whole-buffer identity, aspect/cursor placement, actual circular rendered terrain, uneditable margins, and palette agreement. All A0/A1 Raise/Lower and lifecycle regressions pass.

Testing exposed a resize race introduced by deferred fitting; recording window dimensions in the active stroke resolves it before delayed layout callbacks. The test host also needed its imports to use the exact timestamped Vite script URL to avoid mounting a second fixture when reusing a development server. The final suite passes after both corrections.

Screenshots captured from actual toolbar-and-canvas interactions, visually inspected by Cody:

| Operations demonstrated | Desktop | Mobile emulation |
| --- | --- | --- |
| Raise/Lower: island, high ridge, lowered channel | [Desktop](evidence/a2-desktop-raise-lower.png) | [Mobile](evidence/a2-mobile-raise-lower.png) |
| Smooth: repeated refinement of added rough terrain | [Desktop](evidence/a2-desktop-smooth.png) | [Mobile](evidence/a2-mobile-smooth.png) |
| Flatten: blend toward a 1,200 m target | [Desktop](evidence/a2-desktop-flatten.png) | [Mobile](evidence/a2-mobile-flatten.png) |

The historical A0/A1 completion reports and screenshots remain unchanged. A1 regression screenshots now go into ignored test output, preventing later layouts from overwriting prior evidence.

## Expanded Phase 1 roadmap

[PHASE-1-HEIGHTMAP-ROADMAP.md](PHASE-1-HEIGHTMAP-ROADMAP.md) records the full requested brush inventory, brush controls/targeting, whole-map operations, templates, image conversion, preview/interchange, contours/hachures, drainage/depressions/erosion, basic 3D preview, navigation, preservation, and recovery. Implemented, partial, and planned capabilities are explicit. Living history, future Worlds/Next.js integration, and map-style goals remain architectural considerations, not A2 implementations.

## Exact modified and created files

Modified:

```text
README.md
docs/ARCHITECTURE.md
src/App.tsx
src/components/BrushToolbar.tsx
src/components/BrushToolbar.module.css
src/components/TerrainCanvas.tsx
src/components/TerrainCanvas.module.css
src/interaction/canvas-sculpting.ts
src/styles.css
src/terrain/brush.ts
src/terrain/modifications.ts
src/terrain/sampling.ts
tests/fixtures/terrain.tsx
tests/sculpting.spec.ts
```

Created:

```text
docs/A2-COMPLETION.md
docs/PHASE-1-HEIGHTMAP-ROADMAP.md
docs/evidence/a2-desktop-raise-lower.png
docs/evidence/a2-desktop-smooth.png
docs/evidence/a2-desktop-flatten.png
docs/evidence/a2-mobile-raise-lower.png
docs/evidence/a2-mobile-smooth.png
docs/evidence/a2-mobile-flatten.png
src/components/ElevationLegend.tsx
src/components/ElevationLegend.module.css
src/rendering/fit-map.ts
src/rendering/fit-map.test.ts
src/terrain/refinement.test.ts
tests/refinement.spec.ts
```

No dependency, lockfile, server infrastructure, terrain-contract version, or database changes were needed.

## Limits and review boundary

No unresolved A2 acceptance blocker was found. Smooth uses a local 3 × 3 neighborhood; broad terrain changes require repeated passes rather than a separate large-kernel or whole-map operation. The readout uses nearest-sample values and rounded display text. Flatten approaches its target through falloff and repeated stamps. Mobile and pen checks use browser emulation rather than physical hardware, and no Safari or universal frame-rate claim is made.

The original Serrian Tide website and old Atlas were untouched. This remains a modular component intended for later integration into that website; authentication, permissions, database, and actual World records were not implemented or modified. There is no Zoom/Pan, persistence, Undo/Redo, procedural generation, additional advanced brush, terrain simulation, timeline, 3D, or Production change.

Delivery to main follows the owner's latest instruction. There is no deployment or new A2 branch. Stop after A2 for Ember's independent review; owner hands-on testing is not requested until Ember approves technical readiness. No A3 work is authorized by the roadmap.
