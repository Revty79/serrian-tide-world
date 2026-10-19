# A7-C completion — visible and interactive physical cylinder editor

Approved baseline: `a5d7c8bc329f946628be1190b70c0a6604c75e4b`, branch `main`. Exact implementation SHA is in [delivery metadata](evidence/a7-c-delivery.json); [verification and changed-file inventory](evidence/a7-c-verification.json) bind the tested sources and preserved history.

## Open and test

Run `npm.cmd run dev` in `D:\serrian-tide-world`, then open **http://127.0.0.1:5173/dev/cylinder.html**. It starts a real blank cylinder at −100 m. The normal Atlas application remains at `/`.

1. Use Raise and drag on the visible side. Open **Cylinder tools** to adjust physical radius and strength.
2. Select **Surface map**. Draw vertically through a white tangent join to cross a side/cap rim. Dashed cuts require lifting/restarting or moving the working meridian with **Center region → Center selection**.
3. Paint both circular caps; use Smooth or signed-target Flatten on edited terrain. Undo/Redo restores complete gestures exactly.
4. Switch to **Physical view**, select **Rotate / Pan**, then drag, zoom or use **Center region → Start cap / End cap / Side**. All views read the same terrain. Arrows/+/-/Home work on the focused canvas; mouse, pen and native touch are verified.
5. Open/close the overlay tools and optionally fullscreen. Detail 64/128/256 is chosen in tools and applied only by **New blank cylinder**, with discard protection after editing.

**This preview cannot save.** Its notice remains visible, no Save button or storage adapter exists, and Ctrl/⌘ S explains the limitation. Reload/close loses terrain. A7-D remains separately authorized future work. The preview is not included in the production entry; the normal three-shape New World / Map and v1/v2/v3 library remain unchanged.

## Delivered architecture and numerical behavior

The [projection, rendering, visibility, input, cache and A7-D specification](CYLINDRICAL-EDITING.md) describes all formulas and limits. The physical view ray-casts the frontmost side/cap intersection of the actual reference cylinder. The connected map uses a metrically proportioned side rectangle and genuine oriented circular disks, with real tangent joins and marked visual cuts. Recenter/phase/pan/zoom alter view state only. No duplicate terrain, displaced mesh, false disk-to-rectangle geography or through-solid drawing shortcut is used.

The adapter runs the original B2B2 stroke engine and exact history. Visibility and derived-color staging occur before its actual history commit; there is no competing UI-only history. Each held gesture is one operation. Release drains accepted points; interruption discards pending work with an explicit retained-prefix message. Frozen source/camera checks also cover queued dabs. Physical dabs that reach hidden changed samples reject atomically; Surface map remains available for those edits. This preserves the accepted brush mathematics instead of silently changing its footprint.

The preview is an actual dry B2A job showing exact changed canonical samples, including aliases and real cap shortcuts. It is a numerical change stencil rather than a continuous outline; flat Smooth can show no changed samples. It never modifies terrain. The UI uses the existing configurable physical spacing at 0.2371 radius to avoid the predictable quarter-radius initial-center tie; the original B2B2 defaults and formulas remain unchanged. Exact boundary/precision failures remain explicit safe stops.

## Exact browser evidence

**78 recorded actual-pointer numerical replays pass**, with zero sample mismatches, zero hidden-surface writes and matching complete actual/reference word hashes. This includes **32 four-tool core workflows** (physical side, start rim, start center, end center across desktop/mobile), plus **32 supplemental held strokes crossing both rims in both directions with every tool**, seeding, angular wrapping, native pen/touch and a real cap-shortcut footprint. Browser assertions compare the entire initial/final Float32 word arrays after each Undo/Redo, not only history counts.

All 18 interruption scenarios (nine per profile), native two-finger navigation, keyboard ownership, replacement cancellation/acceptance, view switching, overlay coordinates, fullscreen and four viewport aspect ratios pass. Physical near-limb dabs that would change hidden samples are rejected with zero terrain writes. The large-footprint receipt explicitly changes canonical rim sample 8 even though its side-only distance exceeds 777,000 m; a feasible disk route is shorter than the radius. A higher-detail unsupported dry preview fails explicitly without changing terrain.

Main [desktop workflow](evidence/a7-c-desktop-workflow.json), [mobile workflow](evidence/a7-c-mobile-workflow.json), [desktop end-rim forward/reverse proof](evidence/a7-c-desktop-end-rim-proof.json), [mobile end-rim proof](evidence/a7-c-mobile-end-rim-proof.json), with start-rim/native/interruption/cut/large/replacement receipts in the inventory.

Genuine cylinder screenshots: [desktop physical landform](evidence/a7-c-desktop-physical-edited.png), [mobile physical landform](evidence/a7-c-mobile-physical-edited.png), [desktop connected map](evidence/a7-c-desktop-surface-map-edited.png), [mobile connected map](evidence/a7-c-mobile-surface-map-edited.png), [desktop held end-rim crossing](evidence/a7-c-desktop-end-rim-held.png), [mobile held crossing](evidence/a7-c-mobile-end-rim-held.png), [desktop tools](evidence/a7-c-desktop-tools.png), [mobile tools](evidence/a7-c-mobile-tools.png). Both cap-facing views, large footprints and measured N=128/256 captures are also in the inventory.

Actual interaction traces: [desktop complete workflow](evidence/a7-c-desktop-editing-trace.zip), [mobile complete workflow](evidence/a7-c-mobile-editing-trace.zip), [desktop end-rim trace](evidence/a7-c-desktop-end-rim-trace.zip), [mobile end-rim trace](evidence/a7-c-mobile-end-rim-trace.zip). Start-rim traces are included as well. These show the real cylinder editor and numerical tools.

The observer reads actual pointer events and immutable development snapshots. It cannot install terrain or call a hidden painting shortcut. Browser replay proves input-to-engine wiring using a separate instance of the accepted numerical engine; the previously independent Decimal mathematics remain preserved in their original receipts. Sample-array comparisons include exact whole-stroke Undo/Redo, canonical rim aliases and cap centers. Map/camera changes and the overlay are checked for word preservation and uniform proportions at desktop, ultrawide, square and mobile sizes.

## Performance and memory

| Browser/profile detail | Preparation ms | First presentation ms | Largest numerical slice ms | Largest raster step ms | Largest overlay ms | Largest active frame gap ms | Max recorded input-to-terrain presentation ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| desktop N128 | 0.70 | 120.60 | 3.80 | 3.00 | 2.50 | 30.10 | 248.10 |
| desktop N256 | 3.90 | 112.90 | 7.70 | 2.90 | 5.20 | 45.30 | 219.50 |
| mobile (4x CPU) N128 | 10.90 | 273.30 | 10.60 | 15.50 | 7.10 | 55.20 | 346.60 |
| mobile (4x CPU) N256 | 4.90 | 258.80 | 31.50 | 11.40 | 27.30 | 76.40 | 598.60 |

Raw measurements: [desktop N128](evidence/a7-c-desktop-n128-measurements.json), [desktop N256](evidence/a7-c-desktop-n256-measurements.json), [mobile N128](evidence/a7-c-mobile-n128-measurements.json), [mobile N256](evidence/a7-c-mobile-n256-measurements.json). Each 161-position long path plus final pointer-up records **162 accepted positions**, zero discarded positions on normal release, one exact reversible gesture and no numerical failure. Long-gesture wall measurements include native event injection, input queue processing and display wait. Separate cancelled strokes retain a reversible committed prefix.

Across these four measured cases, observed cap-center Smooth completion is **193.00-726.00 ms**, Flatten **270.00-488.00 ms**, including display completion. The largest recorded brush-latency p95 is **314.20 ms**; bounded arrays retain the latest 120 observations, with raw values and timing-record truncation counts available. These are actual observations and include outliers.

Canonical RGBA cache payload is **16,136 / 65,032 / 261,128 bytes** at 64/128/256 angular detail. The [explicit-GC allocation receipt](evidence/a7-c-preview-allocation.json) finds retained payload exactly equal to cache + history + current stencils (**28684 / 78348 / 290828 bytes** for the measured cap dab). After 100 cancelled dry previews it matches the reduced declared payload. Cancelling a pending raster releases its coherent color snapshot and raster storage; disposing the still-referenced session returns derived ArrayBuffer delta to **0 bytes** at all three resolutions. The pre-existing, caller-owned authority remains referenced and is excluded from that delta. Native Canvas, heap/VM, Map bookkeeping and GC transients are additional.

Actual measurements include startup, navigation/rotation, repeated strokes, cap-center Smooth/Flatten, rim crossing, long accepted input and cancellation. Mobile performance cases use 4× CPU throttling. Logs retain observed outliers, queued-input latency and frame gaps. Timing includes browser/test/observer overhead and is not a controlled improvement comparison. Bounded tasks still contain non-preemptible solver/history/stencil/raster work; no hard frame-time guarantee is claimed.

The palette cache holds RGBA values, never another elevation field. Pending render snapshots are derived colors. Native canvas/compositor memory and bounded JS bookkeeping are additional to typed payload; heap readings are not exact working-set bounds. An explicit-GC Node receipt verifies exact live payload and release after disposal while the caller still retains the session and authority.

## Complete regression and preservation

- **405/405 numerical tests pass**, zero failures/skips: all 390 baseline tests plus 15 new projection/adapter/cache/control tests. Recorded total 5516.82 ms.
- **Final browser coverage: 260 passed, four intentional skips, 264 unique cases.** The initial full run was **255 passed / four skipped / one failed**, 260 cases in 14.39 minutes. The existing desktop toolbar-obstruction test moved underneath the panel before its slide animation finished. A test-only change uses the existing animation-wait helper after keyboard opening; every original assertion and application source is preserved. The focused run passed **6/6** in 1.35 minutes: that same case on desktop/mobile plus four new both-rim/direction cases. No automatic retries or flaky classifications occurred. These two corrected-case outcomes replace their original outcomes in final coverage; the union exactly matches final discovery. The initial failure remains in the [raw full result](evidence/a7-c-browser-results.json), [failed trace](evidence/a7-c-initial-toolbar-failure-trace.zip), [screenshot](evidence/a7-c-initial-toolbar-failure-screenshot.png) and [error context](evidence/a7-c-initial-toolbar-failure-error-context.md). The report does not claim the initial run was clean.
- **TypeScript and production build pass**: 73 modules, Vite compilation 168 ms, original production CSS/JS asset IDs unchanged. An additional TypeScript check passes after the test-only supplement.
- **170 baseline source/fixture/test/config/benchmark files** match after EOL normalization, with no numerical math, brush, history, input or codec modification. The only changed baseline test adds the toolbar animation wait above; removing that block exactly restores its original source and assertions. **399 historical completion/evidence files** are byte-identical to baseline. The entire eleven-phase table is identical.
- The main run freezes **169** runtime/test/dev/config files. Afterward, only the supplemental rim test file and toolbar test synchronization are added. Restoring the captured original toolbar-test hash and omitting the new rim test exactly reproduces the main-run digest. The focused run freezes all **170 final files** before/after. No application implementation changes between runs. Fresh old-workspace N128/N256 limb receipts have zero mismatches/hidden writes and positive newly exposed geography; they are archived with a separate regression prefix.

The entire eleven-phase roadmap is preserved, including Issue #1 and functional linked settlements/cities/buildings/interiors/floors/dungeons before Atlas joins existing Worlds in isolated development. No other geometry, conversion, procedural generation, illustrated assets, save format, database, original-site, Worlds or production-deployment work was included.

## Changed-file inventory

Implementation, tests and reproducer (15 paths: 14 new, one existing test synchronization):

- `dev/cylinder.html`
- `src/dev/cylinder.tsx`
- `src/components/CylinderPreview.tsx`
- `src/components/CylinderPreview.css`
- `src/editor/cylinder-controls.ts`
- `src/editor/cylinder-preview-session.ts`
- `src/editor/cylinder-preview-session.test.ts`
- `src/rendering/cylindrical-view.ts`
- `src/rendering/cylindrical-raster.ts`
- `src/rendering/cylindrical-view.test.ts`
- `tests/cylinder-preview.spec.ts`
- `tests/cylinder-rims.spec.ts`
- `tests/navigation-stabilization.spec.ts`
- `tests/fixtures/cylinder-observer.ts`
- `scripts/measure-cylinder-preview.mjs`

Current documentation (10 files):

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/PHASE-1-HEIGHTMAP-ROADMAP.md`
- `docs/WORLD-SURFACE-ARCHITECTURE.md`
- `docs/CYLINDRICAL-HEIGHTMAP-FOUNDATION.md`
- `docs/CYLINDRICAL-SCULPTING.md`
- `docs/CYLINDRICAL-STROKES.md`
- `docs/CYLINDER-PHYSICAL-PATHS.md`
- `docs/CYLINDRICAL-EDITING.md`
- `docs/A7-C-COMPLETION.md`

All remaining changed paths are this pass's a7-c-prefixed screenshots, traces, numerical/browser/allocation/projection receipts, complete logs, discovery/source-bridge/frozen-source proofs, verification and exact-SHA delivery metadata. Earlier evidence remains preserved.

The machine-readable inventory lists every implementation path, normalized bytes and SHA-256, plus all protected baseline source/configuration/script paths and byte-identical historical evidence/completion records. Delivery metadata is a separate commit naming the implementation SHA without a self-reference.

## Remaining limits and next gate

- The development preview is session-only. No cylinder persistence, normal New World option, document-library extension or map conversion is implemented.
- Physical view rejects a dab reaching occluded changed samples. Use the connected map, reduce radius or reorient. Both cap interiors cannot be simultaneously visible on a convex opaque cylinder.
- Map disk/straight-rim correspondence requires cuts; only displayed real tangent joins continue a held stroke. Long/ambiguous jumps stop with an explanation. No cylinder automatic limb/edge assistance is introduced.
- The stencil shows actual numerical word changes, not an infinitely precise continuous contour. Display interpolation adds no geographic detail. High detail and large footprints can be slower; explicit limits or certified-boundary ambiguity can stop work safely.
- Bounded counts and soft scheduling budgets do not remove synchronous work or guarantee a frame rate. Actual measured limits appear above and in the raw receipts.
- A7-D must add explicit validated preservation, atomic failure-safe Save/Open, saved checkpoints, unified document/library/shape selection and v1/v2/v3 compatibility before ordinary cylinder creation is exposed. The original Next.js host remains responsible for eventual authentication, permissions, database and World records in the roadmap's prescribed sequence.

Technical completion is submitted for Ember's independent review. Owner hands-on acceptance remains separate. **Stop after A7-C. Do not begin A7-D without authorization.**
