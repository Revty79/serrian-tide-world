# A5.1 — Navigation, wrapping and screen-edge sculpting stabilization

October 17, 2026. Approved baseline: `bafedf08343eb48f2e1bd50b5a05db0da13a1dcb`. The owner supplied Ember's A6-B source/numerical approval and authorized this focused pass on `main`. This report records technical verification; owner hands-on acceptance remains separate. Stop after A5.1, before A6-C.

## Findings from the actual editor

The reports combined expected surface behavior with verified input defects. We reproduced the defects in the real App before editing it, at 1440 × 900, and retained the [baseline interaction trace](evidence/a5-1-baseline-trace.zip), [measured observations](evidence/a5-1-baseline.json) and [edge screenshot](evidence/a5-1-baseline-edge.png). The trace includes the reproduction source and interactive snapshots.

| Observation | Finding and cause | Correction |
| --- | --- | --- |
| Apparent mirror drawing | Wrapped views intentionally repeat one height field, with the same orientation. No duplicate authority or per-copy stamping was found. One actual App dab matches one direct numerical dab across all 262,144 Float32 words. | Faint vertical period guides, persistent “same terrain repeats” status and explanatory tools text. Fit Entire Map centers one complete canonical period between guides; surrounding repetitions remain legitimate. |
| Cannot pan horizontally after using controls | Actual defect: Space keydown was ignored when the last clicked toolbar/navigation button retained focus. Space+drag then sculpted instead of navigating. Baseline left stayed 270 while Undo became enabled. | Record Space outside text inputs, transfer focus to the canvas on map press, and preserve native button Space activation when no map drag occurs. |
| A second drag stops panning while Space remains held | Actual defect: pointer release cleared both the gesture and the physical Space-key state. The next drag sculpted. Baseline left stayed about 420 while Undo became enabled. | Separate gesture cleanup from key cleanup. Normal release preserves held Space until keyup; cancellation/focus loss clears it. Track lost navigation capture safely. |
| Bounded map moves vertically but not horizontally on a wide display | Expected at default Fill: a square map exactly spans the viewport width and is cropped vertically, leaving no horizontal content to reveal. After zooming, horizontal room exists. | Keep correct constraints and Fill/Fit distinction. Add guidance explaining when zoom creates horizontal room. Verify both limits after zoom in the actual wide App. |
| Drawing cannot continue at the visible edge | The old implementation had no assisted camera motion and ended a captured stroke when it left the visible wrapped stage. Any applied rectangle change also ended the stroke, preventing safe assistance. | Controlled edge scrolling translates the view, applies its transform synchronously and advances the same numerical stroke through newly exposed terrain. Whole-period gesture winding prevents false long segments when the periodic camera phase rebases. |
| Escape does not cancel drawing | Actual omission: Escape closed tools but neither input handler ended sculpting. | Escape ends the brush and navigation gesture as well as closing tools. |

## Delivered behavior

The App enables **Scroll while drawing at screen edges** by default; the checkbox in tools can switch it off. Embedding hosts opt in with `TerrainCanvas.edgePan`, keeping the numerical engine independent of browser behavior.

Only an active captured sculpt gesture can scroll. A 48 CSS-pixel edge band, 200 ms dwell and quadratic speed ramp make activation controlled. Speed is capped at 360 CSS pixels/second including diagonals. The frame interval is capped at 32 ms, avoiding catch-up jumps after slow frames. Ordinary hovering does nothing. Overlay controls obstruct assistance and finish a stroke that enters them. Pan, Space navigation and two-finger navigation take priority over sculpting.

The view moves beneath the pointer horizontally/vertically where the surface permits. Wrapped horizontal movement remains connected; bounded axes stop at actual terrain edges. Capture just outside the viewport clamps the brush to its visible edge. This does not create terrain in margins. One initial dab and radius/4 distance spacing remain the brush engine's rules. A stationary physical position adds no strength. Returning to already sculpted geography after a complete wrap is a real traversal of that same geography, so it can be sculpted again normally.

The same stroke and history operation span assisted translations. Ordinary manual navigation, zoom, resize and unrelated transform changes still finish the stroke. Release, cancel, lost capture, blur, Escape, pagehide/hidden visibility, tool changes and entering an overlaid control stop assistance. Completed partial work remains one undoable operation. Pending touch capture is also released during cleanup.

Both bounded and periodic inversion use the applied render rectangle. A translation is painted before the gesture adopts its new bounds. Wrapped phase changes add a whole-period offset to the gesture's unwrapped coordinates, without changing canonical samples, metadata or the camera's bounded phase representation. Brushes, preview, elevation inspection and saving still consume one authority.

Camera movement alone reuses the existing elevation presentation cache. The edge loop performs no grid scan or history snapshot per frame. Actual brush changes invalidate the presentation raster as before; beginning/ending one stroke still owns one numerical validation/history lifecycle. Display interpolation, aspect ratio, Fill, Fit and optional fullscreen remain in place.

## Files

| Files | Change |
| --- | --- |
| `src/interaction/canvas-navigation.ts` | Held-Space lifecycle, button/map focus arbitration, Escape, cancellation and lost capture |
| `src/interaction/canvas-sculpting.ts` | Active-only edge loop, dwell/timing, clamped captured pointer, shared applied bounds, gesture winding, capture cleanup and cancellation |
| `src/rendering/edge-pan.ts`, `edge-pan.test.ts` | Pure symmetric velocity and whole-period gesture correction; long bidirectional phase-rebase tests |
| `src/components/TerrainCanvas.tsx`, `TerrainCanvas.module.css` | Optional host edge control, synchronous assisted view application, shared inversion, seam guides |
| `src/App.tsx`, `src/styles.css` | Assistance checkbox, guidance, repeat explanation, accessible checkbox layout |
| `tests/navigation-stabilization.spec.ts` | Real App interactions, full saved-payload comparisons, cancellation, native browser touch/pen, screenshot/trace capture |
| `README.md`, `docs/ARCHITECTURE.md`, `docs/WORLD-SURFACE-ARCHITECTURE.md`, `docs/PHASE-1-HEIGHTMAP-ROADMAP.md`, this report | Current usage/contract, findings, owner review state, A5.1 checkpoint and corrected steps 9–11 |
| `docs/evidence/a5-1-*` | Baseline and corrected browser evidence |

No spherical numerical/provider/history source, planar brush math, terrain metadata, codec or storage schema changed. Existing completion reports and earlier evidence remain historical receipts.

## Verification and evidence

| Command/check | Final result |
| --- | --- |
| `npm.cmd test` | **131/131 passed**: all 129 prior numerical tests plus 2 edge-view math checks; includes the A6-A/A6-B spherical foundation, brushes and exact history |
| Full Playwright suite | **137 passed, 1 intentional existing skip / 138**, 6.5 minutes, no retries; all prior 116 cases retained and 22 new real-App desktop/mobile cases |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run build` | Passed, 46 modules; CSS `index-VbDVD76i.css`, JS `index-DShmU3zm.js` |
| Preservation | Planar brush/falloff, spherical terrain/brush, both numerical history implementations and map-format dispatcher compared byte-for-byte with the approved baseline; unchanged. Prior evidence restored unchanged after regression capture. |

The existing skipped test requires desktop native-touch capability. The new CDP native-touch/pen checks ran successfully on both projects; the existing mobile native-touch test also passed. Existing raster-cache assertions include 4× CPU throttling, zero source rebuilds during navigation and the original bounded display-cache budget/edit-latency threshold. No prior assertions were weakened. The gesture also snapshots stage dimensions/origin so an embedding-host resize cannot be mistaken for assisted movement before ResizeObserver applies the new transform.

The final browser invocation was `npm.cmd run test:browser -- --config .local/a5-1-playwright.config.ts`. This ignored local override extends the committed configuration with the same tests, projects, assertions, workers and zero retries; it only sets a dedicated loopback origin/server on port 5174, `reuseExistingServer: false`, and output directory `test-results/a5-1-final`. A preceding shared-server rerun briefly failed to load pages with `ERR_CONNECTION_REFUSED`; the final isolated result avoids depending on that server's lifetime. The regular `npm.cmd run test:browser` command and committed configuration are unchanged.

Open the [desktop corrected interaction trace](evidence/a5-1-desktop-edge-trace.zip) or [mobile corrected interaction trace](evidence/a5-1-mobile-edge-trace.zip) with `npx.cmd playwright show-trace <path-to-zip>`. These include actual App input, screen snapshots, the assisted phase rebase, Save and the full-payload Undo/Redo comparisons. The [baseline trace](evidence/a5-1-baseline-trace.zip) captures the original failed navigation behavior. A static screenshot alone does not establish continuous motion.

The new real-App checks cover Space from a focused button, repeated drags with one held key, both pan directions, bounded Fill constraints and zoomed exploration, exact one-dab authority despite repeated views, sixteen horizontal pans without data mutation or source-raster rebuilds, a recentered seam-crossing stroke matching direct engine editing, and matching elevation readouts. Assisted Raise/Lower/Smooth/Flatten strokes each cross a periodic phase rebase, remain within the intended latitude band, and restore every saved Float32 word with one Undo and one Redo. Further checks cover reverse-edge scrolling, an unrelated host resize without a window resize event, bounded two-axis limits, stationary strength, disabled assistance, hover, Escape/cancel/capture/blur/tool/toolbar termination, touch/pen navigation, native touch edge strokes and two-finger takeover.

Actual corrected screenshots:

- [Desktop assisted stroke](evidence/a5-1-desktop-edge-stroke.png) and [mobile assisted stroke](evidence/a5-1-mobile-edge-stroke.png).
- [Desktop recentered seam](evidence/a5-1-desktop-seam.png) and [mobile recentered seam](evidence/a5-1-mobile-seam.png).
- [Wide bounded exploration](evidence/a5-1-desktop-bounded-pan.png).
- [Desktop native-touch stroke](evidence/a5-1-desktop-touch-edge.png) and [mobile native-touch stroke](evidence/a5-1-mobile-touch-edge.png).
- [Desktop applied phase movement](evidence/a5-1-desktop-motion.json) and [mobile applied phase movement](evidence/a5-1-mobile-motion.json), including a complete equivalent phase jump and exact history results.
- [Verification receipt](evidence/a5-1-verification.json).

Screenshots depict active strokes; the saved-state label updates when the stroke commits on release. Traces show the movement and completion that static images cannot establish.

## Remaining limits and owner check

These are Chromium desktop and emulated Pixel 7 tests, including native browser-dispatched touch/pen events. Physical touch hardware and other browser engines were not exercised. The frame cap deliberately slows scrolling on heavily loaded devices rather than accumulating a large movement jump. Browser focus loss ends drawing; this is not OS-wide pointer tracking. Overlay controls intentionally stop an assisted stroke entering them. Periodic copies remain visible by design; Fit shows a full centered period with legitimate surrounding repeated views. Keyboard-only terrain drawing and autosave remain outside this pass.

For hands-on acceptance, use New Wrapped Map and make one held stroke near either screen edge; release and Undo/Redo once. Pan a seam to the center, then sculpt it. Use New Blank Map at wide Fill, confirm there is initially no horizontal excess, zoom in and explore both sides. Try edge scrolling with each tool, switch it off, cancel a held stroke with Escape, and Save/Open both map types. Owner acceptance is still required as a separate human review.

The master roadmap now explicitly puts A5.1 before A6-C and preserves **step 9: Atlas into separately rebuilt Worlds, then joint functionality; step 10: accepted combined Worlds + Atlas into the existing site; step 11: final reusable modern/historical Earth content**. This pass performs none of those integrations. No A6-C, new geometry, generation, art, server service or deployment was begun.
