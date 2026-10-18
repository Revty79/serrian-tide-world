# A5.2 — Wrapped editing cycle and connected context

October 17, 2026. Approved technical baseline: `cf146b4e0c441b4e81b2a7d516aaf77462ba587d`. The owner supplied Ember's A5.1 source, visual and automated-evidence approval; owner hands-on acceptance remains outstanding. This is the separately authorized presentation refinement on `main`. Stop after A5.2 for review, before A6-C.

## Delivered presentation

New and reopened wrapped maps default to **Focus Editing**. On ordinary landscape desktop displays, one centered horizontal working period occupies **82%** of the viewport, with **9% connected terrain previews** on each side. Preview strips use a light tint and thin boundaries, remain editable and share the same numerical terrain. The canvas still covers the full workspace; the toolbar overlays it without resizing it.

The focused window's boundaries are view cuts. Panning changes which geographic positions fall at those boundaries; they do not become permanent geographical seams. Periodic phase rebasing remains continuous, and all displayed points resolve through the same applied rectangle and canonical samples. The canonical seam guides remain available in the original full-height and Fit views.

**Fill View** retains the original full-height wrapped presentation. **Fit Entire Map** shows the complete terrain without cropping and resets its center. Focus and Fill reset zoom to 100% while preserving the working center where bounds allow. Zoom scales both axes uniformly; larger zoom can crop out the context strips. Selecting Focus again restores its base scale. Modes are session presentation, not new saved geography or a saved view-preference format.

For current square worlds, actual browser measurements at 100% are:

| Viewport | Focus period width | Width share | Each side preview | Period height |
| --- | ---: | ---: | ---: | ---: |
| Desktop 1440 × 900 | 1180.8 px | 82% | 129.6 px | 1180.8 px |
| Ultrawide 3440 × 1440 | 2820.8 px | 82% | 309.6 px | 2820.8 px |
| Square 900 × 900 | 900 px | 100% | 0 px | 900 px |
| Tall mobile 412 × 839 | 839 px | 203.6%, horizontally cropped | 0 px | 839 px |

The same world-unit scale applies to x and y. Vertical cropping on desktop is intentional and both limits remain reachable by Pan or assisted drawing. Square/tall views retain full-height coverage instead of creating large empty top/bottom margins. On a narrow screen, use Fit to inspect the entire period. Exceptionally wide displays cap focused magnification at twice the full-height scale; the target percentage may then be lower. This policy also preserves non-square geographic proportions. Full-height and Fit can coincide for a centered square world on a landscape screen; Fit additionally resets the canonical center and fits other aspect ratios without cropping.

The pure periodic policy computes `Pheight = stageHeight × worldWidth/worldHeight`, then `periodWidth = max(Pheight, min(0.82 × stageWidth, 2 × Pheight))`. Actual map dimensions and elevations never change. The focused cut beneath the left working-window boundary changes as the camera pans, without relocating or resampling geography.

## Accuracy and preservation

The numerical terrain, all four brush implementations, history, persistence codecs, surface providers, A5.1 input handling and edge-assistance logic are unchanged. The new mode only supplies camera scale and pointer-transparent decoration. The existing applied rectangle still drives rendering, brush inversion, preview copies and numerical readouts. Side strips never allocate a second terrain or independently apply a dab.

All four tools in the real focused App are compared against an independent direct numerical dab after repeated horizontal pans, including a dab in a side preview. Every saved Float32 word must match. One Undo restores the exact prior payload and one Redo restores the exact edited payload. Native touch and mouse edge strokes cross a visible focus boundary and an actual periodic phase rebase as one operation. The retained A5.1 all-tool assisted-stroke, cancellation and history regressions also run against the new default focused App.

Changing mode, zoom, cut, toolbar visibility or fullscreen preserves saved elevations and pending Redo. Full-height/Focus/Fit screenshots within each browser test use the same saved terrain identity and unchanged payload. Existing v1/v2 Open/Save compatibility, checksum validation, metadata and IndexedDB schema remain intact. The display cache is reused for camera-only motion, with no new numerical scans or zoom-sized elevation raster.

## Changed files

| Files | Change |
| --- | --- |
| `src/rendering/periodic-view.ts`, `periodic-view.test.ts` | Periodic-only focused scale/context policy and responsive/cut/pan/zoom tests |
| `src/rendering/camera.ts` | Additional Focus view mode; existing Fit/Fill meanings retained |
| `src/components/TerrainCanvas.tsx`, `TerrainCanvas.module.css` | Focus action/initial mode/callback, centered context decoration and mode-specific guides |
| `src/App.tsx`, `src/styles.css` | Wrapped Focus default, accessible mode buttons/guidance and responsive floating-control spacing |
| `tests/focused-view.spec.ts` | Actual browser layout measurements, all-tool reference comparisons, preservation, screenshots and edge interaction evidence |
| `tests/fixtures/terrain.tsx` | Forward the added ref action in the existing test host; no prior assertions changed |
| `README.md`, `docs/ARCHITECTURE.md`, `docs/WORLD-SURFACE-ARCHITECTURE.md`, `docs/PHASE-1-HEIGHTMAP-ROADMAP.md`, this report | Current behavior, future providers, Issue #1, review state and stop boundary |
| `docs/evidence/a5-2-*` | Same-world presentation screenshots, measured layout receipts, traces and verification receipt |

## Verification

Final results: **135/135 numerical tests passed; 151 browser tests passed, 1 intentional existing desktop touch-capability skip / 152, no retries, 6.6 minutes; typecheck and build passed.** All 131 prior numerical checks and four new view-policy tests ran. All 138 prior browser cases and 14 new cases ran. Build output has 47 modules, CSS `index-DPuYz-bs.css` and JS `index-D7ei0THh.js`. Byte comparisons confirm 40 terrain/editor/persistence/surface/interaction files and A5.1 edge math are unchanged from the approved baseline. All 7 prior browser spec files are unchanged under Git line-ending normalization.

The complete browser suite retains all previous assertions and adds 14 real-App cases across Chromium desktop and Pixel 7 emulation. These cover desktop/ultrawide/square/mobile widths, actual preview frame dimensions, aspect, both vertical limits, moving cuts, repeated horizontal panning, all four side-preview brushes, exact full-payload Undo/Redo, mode/zoom/fullscreen/toolbar preservation, and mouse/native-touch assisted boundary crossing. Browser-injected dab reference positions use integer CSS pixels so browser event coordinate quantization does not alter a fractional reference input. No production input precision was changed.

The final browser command uses `.local/a5-2-playwright.config.ts`, an ignored override of the committed configuration that only chooses a dedicated loopback server on port 5175, disables server reuse and puts output in `test-results/a5-2`. Tests, projects, workers and zero-retry settings are unchanged. The regular `npm.cmd run test:browser` command remains available. Mobile is browser emulation with native CDP touch events, not physical-device acceptance.

## Same-map screenshots and interaction evidence

Each row shows the same saved world in the three requested modes; no terrain edit occurs between those screenshots.

| Viewport | Original full-height | Focus Editing | Fit Entire Map |
| --- | --- | --- | --- |
| Desktop | [Full-height](evidence/a5-2-desktop-desktop-full-height.png) | [Focused](evidence/a5-2-desktop-desktop-focused.png) | [Fit](evidence/a5-2-desktop-desktop-fit.png) |
| Ultrawide | [Full-height](evidence/a5-2-desktop-ultrawide-full-height.png) | [Focused](evidence/a5-2-desktop-ultrawide-focused.png) | [Fit](evidence/a5-2-desktop-ultrawide-fit.png) |
| Square | [Full-height](evidence/a5-2-desktop-square-full-height.png) | [Focused](evidence/a5-2-desktop-square-focused.png) | [Fit](evidence/a5-2-desktop-square-fit.png) |
| Tall mobile | [Full-height](evidence/a5-2-mobile-mobile-full-height.png) | [Focused](evidence/a5-2-mobile-mobile-focused.png) | [Fit](evidence/a5-2-mobile-mobile-fit.png) |

The other project/viewport combinations are retained under the same evidence prefix. [Desktop layout measurements](evidence/a5-2-desktop-layout.json) and [mobile layout measurements](evidence/a5-2-mobile-layout.json) record all mode/viewport combinations and unchanged saved metadata/payloads. [Desktop edge drawing](evidence/a5-2-desktop-edge-connected.png) and [landscape mobile touch drawing](evidence/a5-2-mobile-edge-connected.png) show active connected-edge strokes. The [desktop interaction trace](evidence/a5-2-desktop-edge-trace.zip) and [mobile interaction trace](evidence/a5-2-mobile-edge-trace.zip) include boundary/rebase input and exact Undo/Redo; open with `npx.cmd playwright show-trace <zip-path>`. See the [verification receipt](evidence/a5-2-verification.json) for final results and preservation evidence. Earlier completion reports and evidence remain historical and unchanged.

## Future architecture and scope

The future surface-specific view provider must choose the connected context appropriate to each geometry. Spheres need rotatable/local or cutout projections; physical cubes and pyramids need connected-face arrangements; cylinders may combine lateral panels and separately connected circular end caps. Hollow interior/exterior surfaces remain independently selectable. Rectangular strips are specific to today's periodic plane. This requirement is documented without implementing another geometry or a speculative universal interface.

The master roadmap now explicitly links [GitHub Issue #1](https://github.com/Revty79/serrian-tide-world/issues/1): real terrain measurements, numerical mountain elevations, distinct relative relief and key-saddle topographic prominence, slope/aspect/profiles, consistent 3D terrain and later Worlds linkage. Schedule the analysis in advanced heightmap/3D preparation before illustrated 2D generation, ready for Step 9. No measurement tool or 3D/Worlds runtime is implemented here.

The integration sequence remains **Step 9: Atlas into separately rebuilt Worlds and their joint functionality; Step 10: completed Worlds + Atlas into Serrian Tide; Step 11: reusable historical/modern Earth foundation**. No original-site integration, deployment, new brush, spherical UI, other geometry or procedural generator was added. Stop after A5.2 for review. Owner hands-on acceptance is outstanding; do not begin A6-C without authorization.
