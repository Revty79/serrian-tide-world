# A7-D completion — integrated Physical Cylinder and v4 Save/Open

Approved baseline: `cf9fb1ba6e18d07fcf1d1834d5232f5866c5cf95`, branch `main`. Exact implementation SHA is recorded in [delivery metadata](evidence/a7-d-delivery.json). The [verification inventory](evidence/a7-d-verification.json) binds the tested sources, changed files and preserved historical evidence.

## Owner launch and workflow

1. In `D:\serrian-tide-world`, run **`npm.cmd run dev`**.
2. Open **http://127.0.0.1:5173/**. The normal **New World / Map** dialog includes **Physical capped cylinder** alongside bounded, wrapped and spherical shapes.
3. Enter radius and axial length in meters, choose Lightweight 64, Standard 128 or Higher 256 detail, and create. The dialog explains the supported dimension envelope and mobile cost.
4. Draw with Raise/Lower/Smooth/Flatten. **Surface map** shows the side rectangle and true cap disks; white tangent joins permit continuous rim strokes. **Center region** exposes either cap in Physical view. The Atlas tools overlay supplies contextual settings and instructions.
5. Use the normal **Save** control or Ctrl/⌘ S. Open Atlas tools, select the cylinder in the same **Saved maps** library and choose **Open Map** to resume. Saves live in this browser on this device; there is no autosave or server synchronization.

The development URL remains diagnostic only. Integrated acceptance screenshots and traces below all originate at `/`.

## Architecture and correctness

The [v4 format, saved checkpoint, lifecycle and integration specification](CYLINDRICAL-PERSISTENCE.md) gives complete record fields, resource bounds and failure behavior. A7-C's actual `CylinderWorkspace`, renderer, projections, intrinsic brush engine and B2B2 history are reused by the normal document host. One authority and one derived RGBA cache serve both physical and connected views. No numerical engine or older codec is rewritten.

New/Open prepare a disposable candidate before replacing the active document. Save locks input, drains accepted work and atomically updates both IndexedDB stores; the checkpoint advances only after transaction completion. Exact sparse saved-content differences remain correct across Undo/Redo, renaming, branching and history eviction, including signed zero. Successful replacement disposes the old numerical session and derived resources. Original mathematical, projection and interaction limits remain explicit safe stops.

## Verification and numerical restoration

- **416/416 numerical tests passed**, zero failures/skips, 5765.32 ms: the complete 405-test baseline plus 11 new cylinder-format/checkpoint/host tests.
- **Fresh complete final-source browser run: 274 passed, four intentional retained baseline skips, 278 total**, zero failures, retries or flaky cases. Duration **15.17 minutes**. The earlier preliminary run (272 passed / four skipped) is retained separately. A subsequent real held-N256 check caught a stale saved badge despite a correct dirty checkpoint; adding the modified flag to the refresh dependency fixes it. A further queued-input exit probe found that beforeunload needed to protect an accepted first dab even before any sample changed. The additional host guard is covered at a deterministically paused real-input boundary, followed by full draining and exact checkpoint recovery. The intermediate badge-fixed run (274 passed / four skipped) is also retained; its outcomes are not used in final coverage. The final run includes two new held-status tests and screenshots proving Unsaved changes before release, followed by exact saved-content Undo/Redo. No preliminary case outcome is used in final coverage. The same run includes all 264 previously discovered cases plus 14 normal-workspace cylinder cases; all 177 runtime/test/dev/config files are unchanged before/after. This is a clean complete run, independent of A7-C's historical targeted recheck. [Full raw result](evidence/a7-d-browser-results.json), [complete log](evidence/a7-d-browser.txt), [frozen source proof](evidence/a7-d-frozen-source.json).
- **TypeScript and production build passed**: 93 modules; Vite compilation 234 ms. The production entry now includes the actual cylinder provider and v4 codec, as required.
- **22 normal-workspace actual-pointer numerical replays match every Float32 word**, with zero hidden writes and matching actual/reference hashes. Each workflow checks exact whole-array Undo/Redo, saved/restored identity and metadata, fresh history, continued edits and same-ID updates. All supported details preserve signed zero through the normal library. Separate unit tests cover finite Float32 extrema/subnormals, exact rim aliases/centers and private snapshots around yields.
- A separate [built-production smoke](evidence/a7-d-production-smoke.json) passes desktop/mobile normal / creation, editing, exact Undo/Redo and Save/Open, with **all four formats in one mixed library** and every payload/identity/metadata preserved through reopening and resaving. No development modules or diagnostics are used there. A [28-case rehashed malformed-record audit](evidence/a7-d-v4-guard-audit.json) independently proves structural/numerical rejection with valid recomputed integrity.
- Four write-failure modes per profile preserve the old record and catalog; seven damaged records per profile leave edited terrain/identity/history intact. Colliding geometry/identity/resolution rejects; rejected replacements, cancelled and failed preparation retain current work; disposal leaves old cache/history/pending input at zero. Native mouse/pen/touch, two-finger navigation, held-stroke Save, exact cancellation and fullscreen all pass.
- **174 baseline source/fixture/config/benchmark files** remain identical after EOL normalization, including all original terrain/surface/distance/path/brush/history math, v1/v2/v3 codecs and gesture arbiter. The only older test changes extend the required shape-list expectation and explicitly reject Cylinder in the historical pre-unification host. **471 historical evidence/completion files** are byte-identical to the approved baseline. The complete eleven-phase table and Issue #1 are preserved. Fresh old-cylinder four-tool/both-rim and N128/N256 spherical-limb proofs are separately archived under this pass's prefix.

## Genuine integrated browser evidence

All acceptance captures below show the **normal Atlas application at /**:

| Evidence | Desktop | Mobile |
| --- | --- | --- |
| Cylinder in New World / Map with explicit dimensions/detail | [image](evidence/a7-d-desktop-shape-selection.png) | [image](evidence/a7-d-mobile-shape-selection.png) |
| Unified physical cylinder editor with shared Save/history/tools | [image](evidence/a7-d-desktop-physical-editor.png) | [image](evidence/a7-d-mobile-physical-editor.png) |
| Edited connected side/cap map | [image](evidence/a7-d-desktop-connected-editor.png) | [image](evidence/a7-d-mobile-connected-editor.png) |
| Reopened saved cylinder | [image](evidence/a7-d-desktop-reopened.png) | [image](evidence/a7-d-mobile-reopened.png) |
| Full integrated editing/Save/Open trace | [trace](evidence/a7-d-desktop-workflow-trace.zip) | [trace](evidence/a7-d-mobile-workflow-trace.zip) |
| Fault/replacement trace | [trace](evidence/a7-d-desktop-failures-trace.zip) | [trace](evidence/a7-d-mobile-failures-trace.zip) |
| Held Save / pen / touch / cancellation trace | [trace](evidence/a7-d-desktop-native-input-trace.zip) | [trace](evidence/a7-d-mobile-native-input-trace.zip) |

[Desktop numerical restoration/workflow](evidence/a7-d-desktop-workflow.json), [mobile workflow](evidence/a7-d-mobile-workflow.json), [desktop failure proof](evidence/a7-d-desktop-failures.json), [mobile failure proof](evidence/a7-d-mobile-failures.json), [desktop native input](evidence/a7-d-desktop-native-input.json), [mobile native input](evidence/a7-d-mobile-native-input.json). Held-N256 dirty-state screenshots and traces are included; built-production reopened screenshots are [desktop](evidence/a7-d-desktop-production-reopened.png) and [mobile](evidence/a7-d-mobile-production-reopened.png). Every supported detail also has a genuine reopened signed-zero screenshot and exact-word receipt; N256 persistence traces are included. Observers only read actual pointer events and immutable snapshots; only explicit test database fixtures inject corrupt records or failures. No test hook writes into the active cylinder.

## Desktop/mobile performance and memory

| Profile/detail | Preparation ms | First presentation ms | Largest numerical slice ms | Largest active frame gap ms | Max recorded input-to-presentation ms | Encode ms | Validate + atomic write ms | Read ms | Validate + restore ms | Prepare restored colors ms | Persistence observed max frame gap ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| desktop N64 | 5.30 | 137.40 | 3.20 | 25.30 | 199.90 | 0.50 | 1.10 | 0.40 | 1.20 | 1.70 | 0.00 |
| desktop N128 | 4.70 | 115.30 | 3.20 | 29.60 | 154.80 | 0.90 | 2.60 | 1.00 | 4.70 | 5.50 | 0.00 |
| desktop N256 | 5.40 | 91.40 | 10.90 | 70.80 | 498.40 | 2.10 | 5.50 | 1.30 | 17.30 | 15.20 | 0.00 |
| mobile (4x CPU) N64 | 19.50 | 339.30 | 6.70 | 51.20 | 128.90 | 2.00 | 3.90 | 1.30 | 5.60 | 13.10 | 0.00 |
| mobile (4x CPU) N128 | 28.50 | 371.40 | 13.40 | 129.70 | 283.10 | 1.20 | 6.70 | 2.20 | 29.60 | 19.10 | 16.50 |
| mobile (4x CPU) N256 | 23.20 | 344.90 | 30.80 | 259.90 | 715.80 | 5.00 | 7.40 | 2.20 | 45.40 | 72.90 | 16.70 |

Raw receipts: [desktop N64](evidence/a7-d-desktop-n64-performance.json), [desktop N128](evidence/a7-d-desktop-n128-performance.json), [desktop N256](evidence/a7-d-desktop-n256-performance.json), [mobile N64](evidence/a7-d-mobile-n64-performance.json), [mobile N128](evidence/a7-d-mobile-n128-performance.json), [mobile N256](evidence/a7-d-mobile-n256-performance.json). The frame clock is observed over the actual encode/write/read/validate/restore/prepare pipeline; fast pipelines may finish within one vsync. Existing A7-C cap tools, long/cancelled strokes and navigation were also freshly rerun in the full regression suite.

The [normal-workspace CDP memory receipt](evidence/a7-d-browser-memory.json) records actual post-GC V8/embedder/backing-store categories for six create/edit/Save cases. Its separate intrusive collections are excluded from timing measurements. It includes the real App/library/modules/history rather than isolated cache cost. `performance.memory` is not enumerable in the timing fixture and its empty JSON heap field is not treated as a measurement. Explicit CDP numeric fields supply the memory evidence.

The [explicit-GC allocation receipt](evidence/a7-d-preview-allocation.json), reproduced using the unchanged A7-C allocation workload against this pass's adapter, confirms declared typed display/history/stencil payload and **zero additional retained ArrayBuffer bytes after disposal**, with the caller-owned authority/session still referenced, for all three details. Checkpoint JS Map overhead is additional and is covered by browser heap observations rather than claimed as zero. Canonical palette payload is **16,136 / 65,032 / 261,128 bytes**; no additional authoritative elevation field is retained.

These are actual local Chromium observations, including browser automation/observer overhead. Mobile performance cases use 4× CPU throttling, not a physical-device certification. No improvement or universal frame-rate claim is made. High detail/large footprints can have visible queued-input delay. Numerical solvers, history commits and a bounded raster/stencil slice contain synchronous, non-preemptible work. The unchanged 64 detail option remains available for weaker devices; unsupported brush work stops safely.

The live display cache remains packed colors, four bytes per sample. V4 payload is at most 261,128 bytes; encode/validation/restoration snapshots are bounded temporary buffers. Exact saved-state differences require at most one baseline Float32 number per changed canonical index, with additional JS Map overhead. Native canvas/compositor buffers, JS heap and unreachable GC transients are additional; heap observations are not exact working-set bounds.

## Changed files and preservation

Implementation/test paths (18; 11 changed baseline paths and seven new files):

- `src/App.tsx`
- `src/components/CylinderPreview.css`
- `src/components/CylinderPreview.tsx`
- `src/components/NewWorldDialog.tsx`
- `src/components/WorkspaceChrome.tsx`
- `src/editor/atlas-document.ts`
- `src/editor/cylinder-preview-session.ts`
- `src/persistence/local-map-store.ts`
- `src/persistence/map-format.ts`
- `tests/fixtures/legacy-app.tsx`
- `tests/unified-workspace.spec.ts`
- `src/editor/cylinder-configuration.ts`
- `src/editor/prepare-cylinder-session.ts`
- `src/editor/cylinder-persistence.test.ts`
- `src/persistence/cylindrical-format.ts`
- `src/persistence/cylindrical-format.test.ts`
- `tests/fixtures/cylinder-storage.ts`
- `tests/cylinder-workspace.spec.ts`

Current documentation (12 paths):

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/PHASE-1-HEIGHTMAP-ROADMAP.md`
- `docs/WORLD-SURFACE-ARCHITECTURE.md`
- `docs/UNIFIED-WORKSPACE.md`
- `docs/CYLINDRICAL-EDITING.md`
- `docs/CYLINDRICAL-PERSISTENCE.md`
- `docs/CYLINDRICAL-HEIGHTMAP-FOUNDATION.md`
- `docs/CYLINDRICAL-SCULPTING.md`
- `docs/CYLINDRICAL-STROKES.md`
- `docs/CYLINDER-PHYSICAL-PATHS.md`
- `docs/A7-D-COMPLETION.md`

All other changed paths are a7-d-prefixed evidence, the verification inventory and exact-SHA delivery metadata. Historical reports/evidence are preserved. The machine-readable inventory lists normalized bytes/SHA-256 for every implementation path, plus protected source and raw historical hashes.

The entire eleven-phase roadmap and Issue #1 remain preserved. No original Serrian Tide website, Worlds database, production environment, paid infrastructure or server GPU changes are included. No additional geometry, procedural generation, map conversion, illustrated assets, terrain intelligence, linked settlements/interiors/dungeons, displaced 3D or living-history feature is implemented.

## Remaining limitations and review gate

- Local explicit saves only, in the existing browser database; clearing browser storage removes them. No autosave, import/export, server synchronization or cross-tab collaboration is added.
- The initial host supports only the documented three detail triples and dimension envelope. Physical view protects hidden samples by rejecting the complete dab; it does not silently clip or alter intrinsic geography. Cut crossings require recentering or restarting except at genuine tangent joins.
- Large/high-detail work can be slower or stop at the accepted precision/work/history limits. The exact numerical change stencil is not a continuous high-resolution outline. Display interpolation creates no additional terrain detail.
- The saved checkpoint assumes writes pass through the document adapter. Future external/worker writers must synchronize checkpoint and display updates.
- Camera orientation and zoom are view state; reopened cylinders start in a fitted physical view with fresh history. Geography and identity are restored exactly.

**A7-D is submitted for Ember's independent review and the owner's hands-on acceptance. Stop here; do not begin another geometry phase automatically.**
