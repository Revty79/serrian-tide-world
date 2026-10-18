# A6-D2-R — Globe-limb assisted sculpting

October 18, 2026. Repository `Revty79/serrian-tide-world`, branch `main`. Authorized baseline: **`44f3cea0e81809ad0a29328a9cad9d20eada1214`** (A6-F1). The owner explicitly authorized this pass and direct publication to main. Independent review and owner hands-on acceptance remain pending. The immutable implementation SHA is recorded in [delivery metadata](evidence/a6-d2-r-delivery.json).

## Delivered behavior

An active brush held within the outer 16% of the **actual orthographic globe radius** dwells for 240 ms, then rotates the camera smoothly toward the pointer. The pointer continues through genuinely connected spherical geography in the same held stroke. A contextual **Assist drawing near the globe limb** checkbox defaults on. The A6-F1 spacious workspace, overlay tools and contextual brush settings remain. There is no permanent brush panel.

Assistance follows a quadratic radial speed ramp, at most 0.35 radians/second, 32 ms per step and half a dab spacing (angular brush radius/8). Rotation pauses until the previous numerical segment drains, with no accumulated catch-up time. Existing numerical budgets, queue limits, history and raster budgets are unchanged. A slow device can therefore rotate more slowly instead of skipping geography or increasing work.

Release drains accepted input and commits one operation. Pointer cancellation, capture loss, Space, second touch, navigation/tool/settings/view changes, blur, visibility changes, resize or interruption stop assistance through existing input arbitration. Cancellation retains applied edits as one operation and drops unapplied input, matching D2 policy. Undo/Redo restores exact Float32 words. Save/Open retains the same v3 format, checksum, identity and atomic local storage; v1/v2 remain unchanged. No terrain data moves with the camera.

## Physical continuity and visibility proof

Let `f` be the starting forward unit vector, `t` the screen-radial tangent and `a = f × t`. At pointer radius `rho = sin(theta)`, inverse projection gives `p = f cos(theta) + t sin(theta)`. Assistance applies one rigid rotation `R(delta)` about `a` to the camera. The same held pointer then maps to:

`p(s) = f cos(theta + s delta) + t sin(theta + s delta)`, `0 ≤ s ≤ 1`.

Its path is a great circle of angular length `delta`, independent of face charts. The forward plane simultaneously follows `H(s) = f cos(s delta) + t sin(s delta)`. Each numerical dab uses the original radius/4 meter residual-distance integrator and **the viewing plane at that dab's arc fraction**. It neither freezes visibility at stroke start nor clips queued dabs against a mutable, later camera. The queue copies directions and both viewing planes at acceptance. The original static-domain API remains supported.

Delayed processing is also safe relative to the already displayed end frame. In the local frame at fraction `s`, a sample `q` inside the brush cap has tangent component at least `sin(theta - alpha) > 0`, since `theta ≥ asin(0.84)` and UI angular radius `alpha ≤ 0.2`. If visible at its dab, `q·H(s) ≥ 0`. The final plane is `H(1) = H(s) cos(epsilon) + T(s) sin(epsilon)`, where `0 ≤ epsilon ≤ delta < pi/2`. Both contributions are nonnegative, so `q·H(1) ≥ 0`. Thus every delayed assisted write remains on the displayed front hemisphere. Ordinary input drains before another camera step; its captured plane equals the stationary displayed camera. Smooth may read connected neighbors beyond the horizon but writes only visible outputs, as before.

Independent tests verify closed-form trigonometric motion against projection/inversion, frame orthogonality, bounds and intermediate-cap containment across desktop/ultrawide/square/mobile sizes, zoom 1–4, face normals, all corners, near poles and radial angles. Exact-horizon references use actual floating-point screen coordinates because inverse projection amplifies one-ulp radius rounding. Separate tests independently integrate residual dab spacing and compare each changing-domain dab with a fixed-plane single-dab reference. Delayed queues are mutated by the caller after enqueue, proving captured geometry survives asynchronously processed work. All four tools traverse a complete chart circuit and restore exact history.

The unified-workspace browser tests compare **every saved canonical Float32 word** with synchronous physical replay. Their short monotonic limb strokes require newly exposed samples behind the initial hemisphere to change and require zero changed samples on the final hidden hemisphere. Those final-hemisphere checks apply to these short local strokes; geography painted earlier in a long global stroke may naturally rotate out of view later. Seams, three-face corners and poles are separately exercised with manually rotated cameras. Contextual settings receive actual UI/preview checks and numerical one-dab reference comparisons on Globe and Net, including raised seeds for Smooth, zero intensity, signed targets and invalid drafts.

## Verification

The [machine-readable receipt](evidence/a6-d2-r-verification.json) contains exact results, file hashes and preservation checks. The [full browser JSON](evidence/a6-d2-r-browser-results.json), [numerical transcript](evidence/a6-d2-r-numerical.txt) and [build transcript](evidence/a6-d2-r-build.txt) record exact results and timings. Reproduce with Node 24: `npm.cmd test`, `npm.cmd run test:browser`, `npm.cmd run build`. The recorded final browser run uses a fresh loopback Vite server on port 5180, standard desktop/Pixel 7 projects, two workers and zero retries. Source digests confirm the implementation stayed frozen during that run.

- **187/187 numerical tests pass**, zero skipped/failed (4,150.81 ms recorded run).
- **234 browser cases pass; two intentional desktop native-touch skips.** Total 236, zero failures/retries/flaky cases; 12.10 minutes. All 202 pre-existing cases remain.
- **TypeScript and production build pass**, 73 modules; Vite compilation 728 ms.
- **117 unaffected sources/fixtures/configuration files** match F1 after EOL normalization; **182 historical reports/evidence artifacts** are byte-identical. The final frozen-source check covers 127 files.

All earlier numerical and browser assertions remain. The only prior test adapter change carries optional per-segment viewing planes into the existing D2 replay oracle. Historical launch/overlay fixtures and all saved formats remain intact. The six added seam/corner/pole cases initially had a test variable shadowing `window.location`; that test error was corrected before the frozen full run. No acceptance thresholds or numerical assertions were relaxed.

## Screenshots and interaction evidence

| Actual unified workspace | Desktop | Mobile |
| --- | --- | --- |
| Held continuous stroke, N=128 | [Screenshot](evidence/a6-d2-r-desktop-n128-held.png) | [Screenshot](evidence/a6-d2-r-mobile-n128-held.png) |
| Held continuous stroke, N=256 | [Screenshot](evidence/a6-d2-r-desktop-n256-held.png) | [Screenshot](evidence/a6-d2-r-mobile-n256-held.png) |
| Saved and reopened, N=128 | [Screenshot](evidence/a6-d2-r-desktop-n128-reopened.png) | [Screenshot](evidence/a6-d2-r-mobile-n128-reopened.png) |
| Saved and reopened, N=256 | [Screenshot](evidence/a6-d2-r-desktop-n256-reopened.png) | [Screenshot](evidence/a6-d2-r-mobile-n256-reopened.png) |

Geometry traces, exact sample counts/hashes and timing observations: [desktop N128](evidence/a6-d2-r-desktop-n128-stroke.json), [desktop N256](evidence/a6-d2-r-desktop-n256-stroke.json), [mobile N128](evidence/a6-d2-r-mobile-n128-stroke.json), [mobile N256](evidence/a6-d2-r-mobile-n256-stroke.json). These record the physical start, each accepted segment, immutable planes and consecutive assist serials. Product diagnostics retain only the latest step, not an accumulating interaction history.

Genuine Playwright interaction traces: [desktop N128](evidence/a6-d2-r-desktop-n128-trace.zip), [desktop N256](evidence/a6-d2-r-desktop-n256-trace.zip), [mobile N128](evidence/a6-d2-r-mobile-n128-trace.zip), [mobile N256](evidence/a6-d2-r-mobile-n256-trace.zip). Open with `npx playwright show-trace <path>`. Screenshots were inspected at actual desktop/mobile dimensions; they are browser captures, not mockups.

## Performance observations

| Profile | N | Held wall ms | Frame gap median / p95 / max ms | Paint task median / p95 / max ms | Max atomic dab ms | Dabs / changed samples |
| --- | --- | --- | --- | --- | --- | --- |
| desktop | 128 | 2397.5 | 16.7 / 33.4 / 50.1 | 18.2 / 37.4 / 87.7 | 4.7 | 35 / 884 |
| desktop | 256 | 2427.6 | 33.2 / 33.4 / 50.0 | 20.3 / 34.2 / 97.0 | 21.2 | 34 / 3493 |
| mobile (4× CPU) | 128 | 3081.3 | 33.4 / 66.6 / 116.8 | 31.6 / 39.9 / 171.9 | 17.8 | 43 / 1054 |
| mobile (4× CPU) | 256 | 3242.7 | 50.0 / 66.7 / 116.6 | 37.5 / 52.8 / 205.0 | 40.3 | 34 / 3455 |

The exact distributions, input-to-presentation observations and counters are in [performance summary](evidence/a6-d2-r-performance.json). The prior all-tool N128/N256 browser performance cases also ran unchanged; their fresh observations are retained under `a6-d2-r-*-editing-regression.json`.

The pre-screenshot `heldPerformance` interval starts just before native input and ends at the rotation threshold. It includes dwell and event/frame/poll scheduling. The complete geometry trace also includes screenshot capture and stopping checks. Raster timings cover the viewport paint task, including that frame's numerical/cache/preview work. Brush latency includes queue time until presentation; arrays retain the latest 120 observations. These are actual host measurements with tracing and two concurrent browser workers. Pixel 7 mobile emulation at 4× CPU throttling is not a physical-device benchmark. This pass makes no before/after speed or frame-rate improvement claim.

## Changed-file inventory

Product changes:

- `src/rendering/spherical-limb-assist.ts`: pure limb detection, bounded rigid camera transport.
- `src/components/SphericalViewport.tsx`: bounded dwell/backpressure scheduling, input reprojection, immutable viewing planes and latest-step diagnostics.
- `src/components/SphericalBrushControls.tsx`: contextual assistance option/instructions.
- `src/editor/spherical-session.ts`: copied per-segment geometry through the existing bounded queue.
- `src/terrain/spherical-brush.ts`: optional moving visible domain, interpolated at each original dab fraction; brush expressions/spacing unchanged.

Verification changes:

- `src/rendering/spherical-limb-assist.test.ts`: independent geometry/containment tests.
- `src/editor/spherical-limb-session.test.ts`: asynchronous capture, per-dab reference, all-tool chart continuity and exact history.
- `tests/fixtures/sphere-editor.tsx`: retain viewing planes in the established replay adapter.
- `tests/fixtures/limb-workspace.ts`: test-only observer, canonical replay/comparison and timing collection; no DOM root or product mutation.
- `tests/spherical-limb-workspace.spec.ts`: actual unified-workspace held strokes, native input, stopping, persistence, previews and contextual settings.

Documentation changes: README, architecture, master roadmap, spherical editing/views/persistence, unified workspace, this report and `docs/evidence/a6-d2-r-*`. The receipt gives every exact path/hash. All prior completion reports and evidence are preserved byte-for-byte; unaffected numerical, interaction, persistence and host sources are checked against the approved F1 baseline.

## Limits and review boundary

Assistance requires an active valid brush on the visible actual limb. It stops outside the globe and does not invent viewport-edge scrolling if zoom clips the globe's limb. The center remains near the held pointer's chosen radius; this is deliberate geographical continuation, while manual rotation/recentering remains available for precise work. Orthographic foreshortening and low-resolution raster appearance at the horizon remain. Interpolation adds no geographic detail.

Single atomic dabs/history snapshots can exceed nominal frame budgets, particularly N=256 Smooth on weaker devices. Backpressure slows assistance; no numerical or rendering limit was increased. The separate N=256 mobile performance-hardening phase remains outstanding. Existing 2,048-point, 65,536-dab segment and 16 MiB/100-entry history limits retain their existing safe-stop/retention policies; an indefinitely held global stroke is subject to those established limits. Browser-local explicit saves are not cloud synchronization or crash recovery.

No new geometry, conversion, brush, generator, cartographic asset, 3D, Worlds/site integration, database work or deployment is included. The master roadmap preserves Issue #1 (measurement, elevations, prominence, slope, 3D consistency and eventual Worlds linkage), Issue #2, and Steps 9 → 10 → 11. **Stop after A6-D2-R and await independent review.**
