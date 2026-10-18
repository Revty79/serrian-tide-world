# A6-D2 — Interactive spherical heightmap editing

October 17, 2026. Repository `Revty79/serrian-tide-world`, branch `main`. Approved baseline **`7794953ddd0ee907d9de5052186b87f932530223`**. The owner supplied Ember's D1 source/projection/screenshot/browser-evidence approval and authorized this editing checkpoint with direct-to-main delivery. D2 independent review and owner hands-on acceptance remain pending. This report belongs to the delivered commit; its exact full SHA is supplied in the delivery message and repository log.

## Delivered behavior and architecture

**Open tools → explicit Sphere reference radius (m) → N=128/256 → Create blank sphere.** This creates one numerical −100 m ocean with sea level 0. The separate **Open spherical preview** remains a clearly labeled, read-only deterministic demonstration. Neither entry converts the planar/wrapped map, creates a database World or changes existing saved records.

Raise, Lower, Smooth and Flatten now work directly on the orthographic globe and oriented six-face spherical net. Controls use physical meter radius, m/dab strength, percentage intensity and signed meter Flatten target. A single canonical Float32 provider supplies both views, readouts and exact spherical history. Rotation, zoom, recenter, projection changes, Fullscreen and overlay controls never relocate/resample geography. Modified work is marked session-only, confirmed before discard and protected by the browser's supported beforeunload warning.

[SPHERICAL-EDITING.md](SPHERICAL-EDITING.md) specifies the implementation, physical domain, equations, scheduling, memory, gesture policies and limits. `SphericalSession` wraps canonical writes for dirty-index tracking and owns the original history plus bounded input queue. The renderer patches affected face texture rectangles, including aliases, and uploads only those regions. Numerical dabs yield cooperatively without changing source snapshots, spacing or floating-point expression order. Smooth caches immutable geometry, rereading current heights every time. Numerical/session/projection modules remain separate from the replaceable React development host and eventual Next.js authentication/permissions/World records.

True geodesic previews are split analytically at chart cuts and the globe horizon. Globe writes are clipped to the visible physical hemisphere; the preview shows the same intersection. Net strokes cross genuinely joined displayed edges. Entire input segments are checked: gaps, disconnected cuts and ambiguous diagonal corner shortcuts end the gesture, retaining applied work as one operation. Lift and restart on the desired geography. Mouse, pen and one-touch painting are separate from Rotate/Pan, Space/middle mouse and two-finger navigation. Release drains accepted input; cancellation drops unapplied input and commits the applied portion once.

## Verification

- **169 numerical tests pass**, including all 158 D1 baseline cases and 11 new cases. Internal loops cover all six faces, twelve physical edges, eight corners, exact/near poles and a clipped silhouette. New proofs compare previews to the actually affected sample set, cooperative versus synchronous bits for all four tools, exact history, zero-effect Redo, cached versus uncached Smooth expressions, bounded geometry payloads, all alias texture patches against full fresh builds and legacy encoder rejection of sphere data.
- **Browser result:** **181 passed, one existing intentional desktop native-touch skip, 182 total**, with zero retries. After the final bounded backlog-budget adjustment, **all 16 affected D2 desktop/mobile cases pass again**, and the build passes again. The unchanged original specs preserve A0–A5.2 navigation, edge assistance/phase rebasing, wrapped focus/full-height/Fit, brush/readout accuracy, local Save/Open, A3 v1 fixture compatibility and v2 records. D1's read-only demonstration remains tested separately. [Browser result manifest](evidence/a6-d2-browser-results.json) records the full case list and focused rerun.
- Eight new cases per desktop/mobile project cover actual blank creation at N=128 and N=256, all four tools in each view with bit-for-bit numerical replay, one-operation exact Undo/Redo, edited readouts, joined net edges/cut termination, screen-edge assistance with native touch on mobile, native pen/touch arbitration, cancellation, shortcuts, recenter/resume, visible-hemisphere clipping, and real projected painting around all twelve edges/eight corners/poles.
- Product tests verify discard cancellation/acceptance, reload cancellation, planar pixels and pending Redo preservation, physical control focus/Escape restoration, Fullscreen, and viewport layouts at 1440×900, 3440×1440, 900×900, 320×740, 412×839 and 839×412. Floating tools/status do not overlap when wrapping on narrow screens; the overlay never resizes the canvas.
- `npm.cmd run build` passes, including TypeScript; Vite builds 67 modules. No dependency, service, server schema or original-site code is added. Old v1/v2 codecs and IndexedDB code remain unchanged.
- 90 protected baseline source/test/config files match after line-ending normalization; 102 historical evidence artifacts and completion reports remain byte-identical. Seven existing source files are intentionally changed, with their exact paths recorded below and in verification.
- [Machine-readable verification](evidence/a6-d2-verification.json) records exact changed files, protected source hashes, historical artifact preservation, commands, final results, benchmark hashes and performance summaries. Historical evidence regenerated by older tests is restored to approved bytes. A temporary mid-run source edit caused a Vite fixture double-load in an exploratory run; the clean full suite and final affected-case rerun each use frozen source and a fresh server with zero retries. The full-suite shell wrapper flagged redirected `NO_COLOR` warning output as PowerShell `NativeCommandError`; Playwright itself reports no failed tests. The direct final D2 rerun returns exit 0.

Reproduce with `npm.cmd test`, `npm.cmd run test:browser`, `npm.cmd run build`. The final local suite uses an ignored loopback override at port 5177, no server reuse, the existing two Chromium projects/two workers and zero retries. Run just D2 with `npm.cmd run test:browser -- tests/spherical-editing.spec.ts`. Numerical performance reproduction is `node scripts/measure-spherical-tools.mjs output.json`; the script itself remains unchanged.

## Real screenshots and interaction traces

All screenshots below are the actual App, starting blank and painting the same N=128 sphere through the UI, then switching projection and rotating its camera. No preset terrain is substituted.

| State | Desktop | Mobile |
| --- | --- | --- |
| Initially blank ocean | [Blank](evidence/a6-d2-desktop-blank.png) | [Blank](evidence/a6-d2-mobile-blank.png) |
| Painted continent | [Continent](evidence/a6-d2-desktop-continent.png) | [Continent](evidence/a6-d2-mobile-continent.png) |
| Same terrain in connected spherical net | [Net](evidence/a6-d2-desktop-net.png) | [Net](evidence/a6-d2-mobile-net.png) |
| Same sphere after camera rotation | [Rotated](evidence/a6-d2-desktop-rotated.png) | [Rotated](evidence/a6-d2-mobile-rotated.png) |

Actual Playwright traces include sources, actions, snapshots, screenshots and network evidence:

- [Desktop painting, switching/rotation, history and work guards](evidence/a6-d2-desktop-editing-trace.zip).
- [Mobile native touch/pinch, pen, cancellation and resumed editing](evidence/a6-d2-mobile-editing-trace.zip).
- [Desktop connected net and held screen-edge drawing](evidence/a6-d2-desktop-net-edge-trace.zip).
- [Mobile connected net and native-touch screen-edge drawing](evidence/a6-d2-mobile-net-edge-trace.zip).

Open a trace with `npx.cmd playwright show-trace docs/evidence/<filename>.zip`. The application has no test inspection globals; numerical recording/oracles live only in the separate test fixture.

## Measured performance and limits

The unchanged A6-C benchmark runs 272 dabs over a multi-face path with history, one warmup and three timed trials. All four N/tool combinations retain the exact A6-C initial/edited hashes and exact Undo/Redo. The [new receipt](evidence/a6-d2-numerical-performance.json) records raw runs and counters:

| Tool | N | Prior A6-C median | D2 median |
| --- | ---: | ---: | ---: |
| Smooth | 128 | 586.46 ms | 197.32 ms |
| Smooth | 256 | 2,242.94 ms | 703.34 ms |
| Flatten | 128 | 91.45 ms | 89.86 ms |
| Flatten | 256 | 279.21 ms | 271.75 ms |

These are local Node measurements, not a cross-machine guarantee. The geometry cache is capped at 8,192 stencils and never stores elevation. It avoids repeated adjacency/angle calculation while preserving ordered operations exactly.

Browser measurements include native input, complete numerical changes, dirty patches, raster presentation, queue delay and commit. The desktop profile is 1440×900; the Pixel 7 profile is 412×839 with **4× CPU throttling during measured editing/navigation**, on this Windows host. It is not a physical-phone test. The browser records input-segment completion-to-display timings, including queued work. End-to-end wall time also includes Playwright input dispatch, frame/poll waits and commit. Bounded observation arrays retain the most recent 120 cumulative events; raw receipts preserve all measured trials/counters.

| Profile | N | Input segment → terrain median / p95 / max (ms) | Globe / net p95 (ms) | Eight complete stroke wall times (ms), Raise/Lower/Smooth/Flatten per view |
| --- | ---: | ---: | ---: | --- |
| Desktop | 128 | 15.1 / 60.4 / 66.1 | 61.9 / 28.4 | 498 / 461 / 449 / 436 / 179 / 194 / 213 / 186 |
| Desktop | 256 | 23.5 / 76.1 / 93.9 | 71.1 / 91.6 | 679 / 575 / 746 / 521 / 296 / 285 / 345 / 258 |
| Mobile, 4x CPU | 128 | 71.5 / 162.4 / 201.8 | 162.4 / 144.8 | 1289 / 1038 / 1366 / 992 / 557 / 654 / 755 / 504 |
| Mobile, 4x CPU | 256 | 169.5 / 399.1 / 531.8 | 410.7 / 360.0 | 2282 / 1712 / 2056 / 1619 / 868 / 796 / 1067 / 808 |

These results are usable development evidence, not a claim of universal 60 fps. The most demanding throttled mobile profile has 399.1 ms p95 input-segment completion latency (N=256); long Smooth work and settled CPU raster refinement remain noticeable on weaker devices. Exact work is preserved and progress remains visible. Prefer N=128 or a smaller physical radius on constrained devices. Further worker/GPU or finer-grained scheduling requires separately scoped work, with numerical-equivalence proofs.

Raw browser receipts: [desktop N128](evidence/a6-d2-desktop-n128-performance.json), [desktop N256](evidence/a6-d2-desktop-n256-performance.json), [mobile N128](evidence/a6-d2-mobile-n128-performance.json), [mobile N256](evidence/a6-d2-mobile-n256-performance.json). Ordinary tracked editing reports zero full-cache rebuilds. Small dabs update affected regions, never six full textures per input. The same precise elevations feed every displayed result.

The browser allows nominal 6 ms/eight-dab slices, increasing to a bounded 16 ms slice when input queues up or a released stroke drains. A complete dab or history snapshot can exceed the nominal budget; atomic pre-dab semantics remain intact. Accepted segments are retained, not coarsened or dropped. Released backlogs display **Finishing numerical stroke…**. The queue is bounded at 2,048 inputs and explicitly stops on overflow. Current raster budgets are temporary 80k/35k pixels for desktop/coarse-pointer painting, D1's 180k/70k navigation, and 420k/220k settled quality. This improves screen cost without changing numerical resolution. Higher-resolution/tiled terrain, workers/GPU acceleration and physical-device qualification remain later design work.

At N=128/256 authority payload is 393,224 / 1,572,872 bytes; RGBA cache plus retained canonical index lattices is 1,984,560 / 7,901,232 bytes. History is capped at 16 MiB/100 operations; pending/commit snapshots, dab preparation, bounded stencil/queue state, Canvas2D copies/backing/scratch images, JS/GC and browser graphics memory are additional. No total-RSS or universal frame-rate limit is claimed. Interpolation adds no geographic detail.

## Explicit remaining limitation and stopping point

**Automatic globe rotation during a held stroke at the limb is not implemented.** Lift, rotate/recenter, then resume. Net edge assistance is implemented and tested. The owner explicitly permits a specifically documented assisted-gesture limitation; the required globe correction is isolated as **A6-D2-R** in the UI/architecture/roadmap, requiring moving-domain/anchor transport and matching preview/spacing/history proofs. This gesture is not presented as complete, and no follow-up work begins here.

Spherical work remains session-only: no save/reopen, autosave or recovery. Browser warnings are subject to browser/mobile lifecycle support. The current globe is a colored reference sphere, not an extruded mountain mesh; the net is a distorted spherical-chart layout, not a physical cube. UI radius is limited to 0.005R–0.2R. Near-limb precision and small-net CSS-pixel quantization require zoom/recenter. Owner acceptance and independent review remain outstanding.

The master roadmap now explicitly preserves editable professional illustrated 2D cartography across **every supported shape and valid map scale**, including globe/flat projections, cylinders, hollow surfaces, polyhedra, and regional/city/building/interior/dungeon maps where valid. Placement derives from terrain and appropriate Worlds data; style changes never change numerical geography. Issue #1, all advanced tools/geometry/history inventory and mandatory integration steps **9 → 10 → 11** remain intact. This is documentation only.

**STOP after A6-D2. Do not begin A6-E without authorization.** No new shapes, persistence, actual 3D extrusion, procedural/illustrated generation, historical simulation, Worlds/database/main-site integration or deployment is included.

## Exact changed files

- `README.md`
- `docs/A6-D2-COMPLETION.md`
- `docs/ARCHITECTURE.md`
- `docs/PHASE-1-HEIGHTMAP-ROADMAP.md`
- `docs/SPHERICAL-EDITING.md`
- `docs/SPHERICAL-SCULPTING.md`
- `docs/SPHERICAL-VIEWS.md`
- `docs/WORLD-SURFACE-ARCHITECTURE.md`
- `docs/evidence/a6-d2-browser-results.json`
- `docs/evidence/a6-d2-desktop-blank.png`
- `docs/evidence/a6-d2-desktop-continent.png`
- `docs/evidence/a6-d2-desktop-editing-trace.zip`
- `docs/evidence/a6-d2-desktop-n128-performance.json`
- `docs/evidence/a6-d2-desktop-n256-performance.json`
- `docs/evidence/a6-d2-desktop-net-edge-trace.zip`
- `docs/evidence/a6-d2-desktop-net.png`
- `docs/evidence/a6-d2-desktop-rotated.png`
- `docs/evidence/a6-d2-mobile-blank.png`
- `docs/evidence/a6-d2-mobile-continent.png`
- `docs/evidence/a6-d2-mobile-editing-trace.zip`
- `docs/evidence/a6-d2-mobile-n128-performance.json`
- `docs/evidence/a6-d2-mobile-n256-performance.json`
- `docs/evidence/a6-d2-mobile-net-edge-trace.zip`
- `docs/evidence/a6-d2-mobile-net.png`
- `docs/evidence/a6-d2-mobile-rotated.png`
- `docs/evidence/a6-d2-numerical-performance.json`
- `docs/evidence/a6-d2-verification.json`
- `src/App.tsx`
- `src/components/SphericalBrushControls.tsx`
- `src/components/SphericalPreview.module.css`
- `src/components/SphericalPreview.tsx`
- `src/components/SphericalViewport.tsx`
- `src/editor/spherical-session.test.ts`
- `src/editor/spherical-session.ts`
- `src/interaction/spherical-editing.ts`
- `src/rendering/spherical-brush-preview.ts`
- `src/rendering/spherical-editing.test.ts`
- `src/rendering/spherical-gesture-path.ts`
- `src/rendering/spherical-raster.ts`
- `src/rendering/spherical-texture-updates.ts`
- `src/terrain/spherical-brush.ts`
- `src/terrain/spherical-smoothing.ts`
- `tests/fixtures/sphere-editor.html`
- `tests/fixtures/sphere-editor.tsx`
- `tests/spherical-editing.spec.ts`
