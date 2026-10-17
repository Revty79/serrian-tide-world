# Pass A3 completion — navigation, history and local preservation

Date: October 17, 2026. Repository: `Revty79/serrian-tide-world`. Development/delivery branch: `main`.

Approved A2 baseline: `c975e9c132dd2447c1ce89f9b557f6a128ab4f51`.

The owner supplied Ember's A2 source/visual approval and authorized A3, explicitly directing commits/pushes to main. The additional full-screen workspace requirement arrived before A3 implementation began and is included in this checkpoint. No subdivision or later-pass map feature was introduced.

## Delivered behavior

- Full browser-viewport workspace without the old page header, surrounding page padding or map frame. Contain-fit letterboxing preserves actual terrain proportions.
- A collapsible left slide-in tool panel overlays the map. It starts closed, scrolls independently, supports reduced motion, accessible names/expanded state, keyboard opening, focus entry and Escape/close focus return. Hidden controls leave the tab order. Opening/closing does not reflow the map or end an existing stroke. Nonmodal focus can move to floating controls and canvas.
- Accessible floating Undo, Redo, Save and navigation controls. On narrow screens the navigation controls stack outside an open panel rather than covering its contents.
- Pointer-centered wheel zoom, visible Zoom In/Out/Fit, 100–800% limits and bounded pan. Explicit Pan, Space + drag and two-finger pinch/pan claim navigation before editing. Navigation changes camera only.
- Accurate transformed sampling and brush previews; one aspect scale for both axes. Zoom magnifies a fitted/DPR bitmap, avoiding zoom-squared raster allocation. Navigation does not regenerate terrain pixels.
- Complete-stroke Undo/Redo for Raise, Lower, Smooth and Flatten. Confirmed Reset is undoable; partial cancelled strokes remain one operation. New edits clear incompatible Redo; no-ops do not. Shortcuts preserve native text-field Undo. Exact Float32 bits, metadata, ID and buffer identity are retained by history.
- Bounded history: 16 MiB of retained delta payloads/accounting and 100 entries, plus one transient before-stroke snapshot (1 MiB at 512², at most 4 MiB at the save-format limit). Entries select sparse changed indices or a compact span, each with before/after words. Oldest entries are evicted. No unlimited stack of full-map copies.
- Explicit local Save/Open, map naming, saved selection and clear Not saved / Unsaved changes / Saved states. New Blank Map creates a new UUID, standard 512² −100 m ocean and empty history. It does not overwrite other saved maps.
- New/Open discard guards and standard browser departure warning. Open validates before prompting/replacing current work. Corrupt/incompatible data and unavailable storage produce errors while preserving current work. Successful save checkpoints are marked only after the atomic IndexedDB transaction completes. Undo/Redo can return to the saved checkpoint.

See [ARCHITECTURE.md](ARCHITECTURE.md) for exact camera formulas, component boundaries, history accounting and persistence validation.

## Local format and future integration

Format identifier `serrian-tide-heightmap`, version 1, with same identity, nonempty trimmed name, ISO timestamp, validated v1 terrain metadata, `float32-le-row-major` encoding, exact elevation ArrayBuffer and SHA-256 over canonical header + bytes. Each axis supports 2–4096 samples, product at most 1,048,576. Validation checks units, version, shape, limits, byte count, finite values, identity and checksum. Float32 words use explicit little-endian encoding and retain signed zero.

IndexedDB database `serrian-tide-atlas`, version 1, has full `heightmaps` and small `catalog` stores keyed by ID. Save updates both atomically; list reads catalog summaries. Storage code is separate from the codec, document/history, camera and numerical engine. The future Serrian Tide host will supply its actual authentication, server-side permissions, database and World association. No separate account system, World schema, speculative server adapter or main-site changes were created.

The UI explicitly says saves belong to this browser on this device and are not synchronized. They are origin/profile specific and can be removed by clearing browser data or browser policy. Save explicitly before leaving; no autosave or crash recovery is implied. A mobile app kill can bypass the browser's unload prompt. External import/export stays in A7.

## Verification

| Check | Result |
| --- | --- |
| `npm.cmd test` | 62/62 passed: all 49 A0–A2 tests plus 13 A3 camera/history/format/document tests |
| `npm.cmd run test:browser` | 89 passed, 1 skipped of 90 scheduled; Chromium desktop 1440 × 900 and Pixel 7 mobile profile |
| Existing skipped case | Desktop duplicate of native single-touch drag; native mobile drag and desktop/mobile A3 pinch gestures pass |
| Focused native touch recheck | Both projects pass pinch/pan, remaining-finger suppression, stroke Undo and deferred single-touch tap |
| `npm.cmd run build` | Passed, including `tsc --noEmit`; Vite bundle generated locally |
| Browser errors | No page/console errors in assertions |
| `git diff --check` | Passed after normalizing text files |

Browser proofs cover fit/resize, all four brushes and controls, actual colors/readout, circular previews, sparse/dense paths, clipping, cancellation, read-only/invalid settings, native pen, native touch, frame scheduling, pointer-anchored zoom, unchanged full Uint32 buffers through navigation, zoomed brush location/footprint, overlay geometry/focus/active-stroke preservation, complete/partial/reset history, keyboard shortcuts and dirty checkpoints.

The actual application persistence test names and sculpts using all four tools, zooms, clicks Save, decodes the committed IndexedDB record, closes the page, opens a new page in the same browser profile, selects/Open Map, then saves again. The full elevation-byte digest, metadata and identity match. Continued editing changes the elevation digest while retaining identity and metadata. No application inspection hooks were added; numerical instrumentation lives only in the test fixture or ordinary storage codec.

Additional application tests corrupt finite elevation bytes in an existing save, attempt Open, and verify camera/history/unsaved work remain intact. Undo returns to the earlier saved checkpoint, then a successful Save reproduces the original numerical digest. Tests also exercise storage denial, discard-warning cancellation for New/Open, a real dismissed `beforeunload` dialog, new identity, blank-ocean preservation and multiple independent saves.

## Visual evidence

All screenshots are generated by actual UI interactions and personally inspected, with no image editing:

- [Desktop sculpted / panel closed](evidence/a3-desktop-sculpted.png)
- [Desktop zoomed / overlay tools](evidence/a3-desktop-zoomed-tools.png)
- [Mobile sculpted / panel closed](evidence/a3-mobile-sculpted.png)
- [Mobile zoomed / overlay tools](evidence/a3-mobile-zoomed-tools.png)

Desktop evidence is 1440 × 900; mobile is 1082 × 2202 physical pixels (412 × 839 CSS pixels at the emulated DPR). Fit screenshots intentionally show letterboxing for the square map; zoomed views demonstrate clipping and overlay behavior. Numerical assertions establish data/coordinate integrity independently of appearance. A0–A2 completion reports and screenshots remain unchanged. Old A2 visual regression tests now write to ignored test output instead of overwriting historical evidence.

## Modified files

- `docs/A3-COMPLETION.md`
- `docs/ARCHITECTURE.md`
- `docs/evidence/a3-desktop-sculpted.png`
- `docs/evidence/a3-desktop-zoomed-tools.png`
- `docs/evidence/a3-mobile-sculpted.png`
- `docs/evidence/a3-mobile-zoomed-tools.png`
- `docs/PHASE-1-HEIGHTMAP-ROADMAP.md`
- `package.json`
- `README.md`
- `src/App.tsx`
- `src/components/BrushToolbar.module.css`
- `src/components/TerrainCanvas.module.css`
- `src/components/TerrainCanvas.tsx`
- `src/editor/terrain-document.ts`
- `src/editor/terrain-history.test.ts`
- `src/editor/terrain-history.ts`
- `src/interaction/canvas-navigation.ts`
- `src/interaction/canvas-sculpting.ts`
- `src/persistence/local-map-store.ts`
- `src/persistence/terrain-format.test.ts`
- `src/persistence/terrain-format.ts`
- `src/rendering/camera.test.ts`
- `src/rendering/camera.ts`
- `src/styles.css`
- `tests/atlas.spec.ts`
- `tests/fixtures/terrain.tsx`
- `tests/refinement.spec.ts`
- `tests/sculpting.spec.ts`
- `tests/workspace.spec.ts`
- `tests/workspace-helpers.ts`

## Review and delivery boundary

Technical implementation and automated/visual verification are complete. Ember's independent A3 review and owner hands-on acceptance are pending; automated checks do not claim those approvals. Native pen/touch proof uses Chromium's input pipeline and mobile emulation, not a claim of testing every physical device, browser engine or assistive technology.

The delivery commit is the Git commit containing this report and is reported by exact SHA in the owner-facing completion response. That avoids an impossible self-referential SHA inside the commit. The owner authorized direct push to `main`; no routine development branch or deployment is part of this pass.

Stop after A3. No advanced A4 tools, A5 whole-map operations, procedural generation, images, rivers/biomes/erosion, history timelines, 3D, server infrastructure or Worlds integration was implemented. The original Serrian Tide website and its database were not modified.
