# Pass A1 — Raise and Lower sculpting

Date: October 17, 2026 (America/Denver). Approved baseline: `f60bf5be45279879b308aa1a249deb16f78e7e5f`.

A1 adds numerical Raise/Lower brushes, a small controlled toolbar, pointer interaction, and live rendering. The development shell still opens on A0's blank ocean. The completed branch is `codex/atlas-a1-sculpting`, prepared for the explicitly authorized push to `Revty79/serrian-tide-world` for Ember's review. There is no merge or deployment. The exact final commit SHA is supplied in the completion message and available from `git log -1 --format=%H`.

## Mathematics and units

The existing `Float32Array`, metadata, version 1 contract, planar coordinates, 512 × 512 resolution, −100-meter initial elevations, and sea level 0 are preserved. Both brushes directly mutate the same numerical buffer; presentation colors are still calculated from elevation relative to sea level.

For a sample at map-space distance `d` from the dab center and radius `r`, define `u = d / r`. Samples with `u >= 1` are unchanged. Inside the brush, use reversed smoothstep:

```text
falloff(u) = (1 - u)² × (1 + 2u)
delta     = direction × strength × falloff(u)
elevation = Float32(clamp(elevation + delta, -FLOAT32_MAX, FLOAT32_MAX))
direction = +1 for Raise, -1 for Lower
```

This gives full strength at the center, half strength halfway to the boundary, and zero influence at the edge, with zero slope at both endpoints. Changes add to current elevation, permitting repeated island building, high ridges, valleys, and continued lowering underwater. Values at or below sea level render as water, including equality.

Radius is in logical **map units**, not CSS or device pixels. The toolbar expresses radius as a percentage of the map's shorter side: 0.5–20%, default 6%. On the initial 1 × 1 map this defaults to `0.06` map units, roughly 31 sample intervals. The reusable engine accepts radii from one grid-cell diagonal through the map diagonal, avoiding unsupported sub-sample footprints.

Strength is **meters of elevation change at a dab center**, with 10–1,000 m/dab in the toolbar and a 200 m/dab default. A default click raises the center from approximately −100 m to +100 m. The engine supports other positive finite Float32-representable strengths and saturates finite overflow at ±3.4028234663852886e38 rather than producing infinity. Strength that rounds to zero is rejected.

Brush falloff is round in logical map coordinates. The retained A0 renderer fills the rectangular screen canvas, so map-space circles and their matching cursor preview can appear elliptical. Viewport size and device pixel ratio affect display scaling only, not radius, elevation deltas, or sample count.

## Continuous strokes and safety

`startBrushStroke` applies one initial dab, snapshots the settings, and places later dabs every `radius / 4` of distance along the supplied polyline. Residual distance carries across pointer-event boundaries and corners. Duplicate events, hovering, a stationary hold, and ending the stroke add no extra dabs. The final residual segment is covered by the overlapping footprint; release adds no special terminal dab.

Equivalent polylines with different subdivisions produce equivalent results within Float32 rounding tolerance: unit tests require differences below 0.001 m, and actual browser sparse/dense tests require below 0.01 m, including a segment exiting the map. Different curved paths sampled into different polylines are not claimed to be identical. Pressure and elapsed time are intentionally not brush-strength inputs.

The pointer adapter uses primary-button mouse/pen and a primary touch pointer, pointer capture, and optional coalesced pointer samples. Brush footprints clip to the valid sample rectangle. An exiting segment intersects the actual map boundary, then ends the stroke; simply clamping each event independently would bend the path differently at different event rates. Re-entering requires a new press.

Release, pointer cancellation, lost capture, focus loss, hidden/page exit, viewport resize, changed canvas bounds, disabling editing, and component disposal end a stroke. Later movement cannot continue it. Cancellation retains changes already applied; it does not provide Undo. Additional pointers and non-primary mouse buttons do not initiate painting.

The engine validates settings, coordinates, grid shape, and all source elevations before the first dab. Each later dab checks its affected region before writing that dab. Invalid inputs throw without spreading non-finite values or partially applying the rejected dab. Prior valid dabs remain applied; there is no transaction or rollback system. The UI stops a failed stroke and reports the error separately from rendering errors.

## Rendering and integration

Numerical edits request a repaint through `requestAnimationFrame`; only one frame may be outstanding. A frame displays all mutations accumulated before it runs. Resize and initial display use the same scheduler. Successful rendering does not clear unrelated brush errors. Painting and resizing never rewrite terrain metadata or resample the heightmap.

Pointer movement uses imperative stroke state and a DOM brush preview, without React application state updates. The test-only component host verifies that 60 pointer events in one JavaScript task produce exactly one canvas repaint and zero React commits. This validates scheduling and lifecycle behavior, not a universal frame-rate guarantee.

The brush engine is ordinary TypeScript without React or browser dependencies. DOM pointer handling is separate. The Next.js-compatible client component and toolbar use scoped CSS. The optional `brush` prop controls local editing; omitting it makes the component read-only and disabling it stops an active gesture. Authentication, authoritative permissions, database persistence, and actual World associations remain future responsibilities of the existing Serrian Tide host. No main-site or old-Atlas code was read, copied, or changed. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Verification

- `npm.cmd test`: **29 passed**, including all 13 original A0 numerical/raster tests and 16 brush tests.
- `npm.cmd run test:browser`: **41 passed, 1 intentionally skipped** across 42 scheduled cases. The skipped case is the desktop duplicate of the native-touch test; that test passes in the mobile project.
- `npm.cmd run build`: **passed**, including strict TypeScript checking and the Vite production build.
- Desktop: Chromium, 1440 × 900, DPR 1. Mobile: Chromium Pixel 7 emulation, 412 × 839, DPR 2.625, touch enabled.

Coverage includes raising/lowering actual samples, both sea-level transitions, smooth falloff, radius and strength, fast strokes without gaps, event-frequency independence, invalid operations, bounds, hover/release/cancellation, active-stroke resize and read-only transitions, live pixel changes, native pen, native mobile touch without scrolling, full-buffer preservation on resize, frame coalescing, and no React commits during brush movement.

The first browser run completed its assertions but needed interruption during sandboxed Windows dev-server cleanup. Running with normal process permissions resolved the cleanup issue. Extra lifecycle checks then exposed resize and error-clearing races; both were corrected before the final passing suite. There are no unresolved test failures.

Actual screenshots from terrain sculpted through the application toolbar and canvas:

- [Desktop islands, higher terrain, and a lowered channel](evidence/a1-desktop-sculpted.png)
- [Mobile-emulated sculpted terrain](evidence/a1-mobile-sculpted.png)

Both screenshots were visually inspected by Cody. The original A0 completion record and ocean screenshots are preserved unchanged. Current initial-ocean browser screenshots go into ignored test output instead of overwriting historical evidence.

## Exact files changed from A0

Modified:

```text
README.md
docs/ARCHITECTURE.md
src/App.tsx
src/components/TerrainCanvas.tsx
src/components/TerrainCanvas.module.css
src/styles.css
tests/atlas.spec.ts
```

Created:

```text
docs/A1-COMPLETION.md
docs/evidence/a1-desktop-sculpted.png
docs/evidence/a1-mobile-sculpted.png
src/components/BrushToolbar.tsx
src/components/BrushToolbar.module.css
src/interaction/canvas-sculpting.ts
src/terrain/brush.ts
src/terrain/brush.test.ts
tests/fixtures/terrain.html
tests/fixtures/terrain.tsx
tests/sculpting.spec.ts
```

No dependencies or lockfile changes were needed. Test fixture inspection hooks and counters do not enter the application build.

## Scope and review status

A0's numerical model, color mapping, standalone local command, successful build, responsive blank-ocean startup, and rendering/data separation remain intact. Only A0 browser locators and screenshot output paths changed to reflect the required accessibility update and preserve historical evidence.

The original Serrian Tide application and old Atlas were untouched. There is no Smooth/Flatten, Undo/Redo, Save/Load, Zoom/Pan, generation, simulation, Worlds integration, 3D, server infrastructure, merge, or deployment. Work remains in the standalone development workspace with integration boundaries preserved.

Known limits: mobile and pen checks are browser emulation rather than physical hardware; no Safari or cross-device performance benchmark is claimed. The in-memory example still resets on reload. The A0 aspect/scaling policy remains unchanged. These are not A1 acceptance blockers.

Ember's A1 review is pending. Owner hands-on testing is deferred until A2 has been completed and reviewed, as instructed. Stop after A1; A2 requires separate authorization.
