# A6-F1 — Unified Atlas workspace and world shape selection

October 18, 2026. Repository `Revty79/serrian-tide-world`, branch `main`. Approved A6-E baseline: **`5f71ced6b85f6f9a5d674334610b7193f35ac546`**. The owner supplied Ember's E approval and authorized this bounded hosting refactor. F1 independent review and owner hands-on acceptance remain pending. The immutable implementation SHA is recorded in [delivery metadata](evidence/a6-f1-delivery.json); the final publication SHA is also supplied in the delivery message.

## Delivered behavior

Atlas opens with **New World / Map** before allocating any terrain. Choose bounded flat, horizontally wrapped flat, or spherical world. A sphere requires an explicit reference radius in meters and N=128/256. Wrapping is explained as periodic flat geography with bounded top/bottom, not a complete physical cylinder. Future shapes are not offered as functional choices.

All three types use the same full-viewport workspace, overlay tools, tool selection, Map name, Save/Open, mixed library, modified/saved indicator, Undo/Redo, shortcuts and fullscreen action. Bounded Fill/Fit and wrapped Focus/connected previews/continuous panning remain. Globe and Six-face Net retain shared spherical authority, physical brush parameters and navigation. There is one active document and one canvas, with no flat editor hidden behind a sphere. Shape-specific controls keep map-unit planar radius distinct from physical spherical meter radius.

New/Open drain accepted input, prepare candidates and respect unsaved changes. A failed operation or canceled replacement keeps current terrain/camera/history and previous committed saves. Cooperative creation can be canceled without a stale completion replacing a later document. Successful Open intentionally starts fresh camera/history. Save changes its checkpoint only after the original atomic storage transaction succeeds. Errors remain separate from the actual modified/saved state. Browser-local warnings apply to every shape.

[Architecture and lifecycle](UNIFIED-WORKSPACE.md) describe `AtlasDocument`, the shared host/chrome, contextual view slots and future provider boundary. Numerical providers, canonical ownership, all brushes, histories, projections, display interpolation, storage codecs and IndexedDB schema remain unchanged. No geography is converted, resampled, duplicated or rewritten by choosing a view or a new world's shape. The optional physical conversion workflow is documented separately under [Issue #2](https://github.com/Revty79/serrian-tide-world/issues/2), with source preservation, preview/cancel, new identity, dimensions, distortion, resolution, topology, cuts, poles/caps and face/surface connectivity requirements.

## Automated verification

Final counts, source preservation and exact file hashes are in [verification](evidence/a6-f1-verification.json); every browser result is in [the full JSON report](evidence/a6-f1-browser-results.json). Reproduction: `npm.cmd test`, `npm.cmd run test:browser`, `npm.cmd run build` with Node 24. Final browser evidence uses a fresh loopback server at port 5179, the standard desktop/Pixel 7 projects, two workers and zero retries. Source digests before/after the run verify a frozen implementation.

- **178/178 numerical tests pass.**
- **201 browser cases pass; one existing intentional desktop native-touch skip.** Total 202, zero failures/retries/flaky cases.
- **TypeScript and production build pass**, 72 modules.
- **88 protected sources/fixtures/configuration files** match the approved baseline after line-ending normalization. **141 historical reports/evidence artifacts** are byte-identical.
- Final browser duration: 9.46 minutes. The frozen-source check covers 122 files.

The retained A0–A6-E cases still exercise exact numerical data, sparse/dense strokes, cancellation, native mouse/pen/touch, Space navigation, automatic edge scrolling, periodic phase rebasing, previews/readouts, view/cut changes, history, old saves, invalid records and persistence faults. Product entry helpers now choose a shape explicitly and reopen the overlay panel where the new workflow closes it. No numerical assertions or pass thresholds were removed.

Five logical retired launcher/overlay cases (ten desktop/mobile cases) run against a clearly named, test-only frozen A6-E host because they specifically assert keeping a planar editor behind a separate sphere preview. The product intentionally removes that hosting behavior. Their existing assertions and original isolated D1/D2 numerical/browser hosts remain. New product tests instead verify direct shape creation without a hidden planar authority, all four tools in bounded/wrapped/globe/net modes, exact per-operation Undo/Redo, mixed v1/v2/v3 Save/Open, shared authority, corrupt/failing operations, both directions of cross-shape discard cancellation, cancellable N=256 preparation, focus, ultrawide/square/tall layouts and native fullscreen on each implemented type.

## Screenshots and interaction traces

| Actual product view | Desktop | Mobile |
| --- | --- | --- |
| Shape setup | [Screenshot](evidence/a6-f1-desktop-world-setup.png) | [Screenshot](evidence/a6-f1-mobile-world-setup.png) |
| Bounded map | [Screenshot](evidence/a6-f1-desktop-bounded-workspace.png) | [Screenshot](evidence/a6-f1-mobile-bounded-workspace.png) |
| Wrapped Focus | [Screenshot](evidence/a6-f1-desktop-wrapped-workspace.png) | [Screenshot](evidence/a6-f1-mobile-wrapped-workspace.png) |
| Sphere Globe | [Screenshot](evidence/a6-f1-desktop-sphere-workspace.png) | [Screenshot](evidence/a6-f1-mobile-sphere-workspace.png) |
| Sphere Net | [Screenshot](evidence/a6-f1-desktop-sphere-net.png) | [Screenshot](evidence/a6-f1-mobile-sphere-net.png) |
| Common library/tools | [Screenshot](evidence/a6-f1-desktop-mixed-library.png) | [Screenshot](evidence/a6-f1-mobile-mixed-library.png) |

Additional actual screenshots cover 1440×900, 3440×1440, 900×900 and 412×915 in both browser profiles. Viewport receipts record actual map width/height and proportions. Workflow receipts identify the v1/v2/v3 records and exact payload hashes. Main-cycle width remains 82% on typical landscape desktops; square/tall layouts retain the established full-height behavior. All viewport/mode/fullscreen changes preserve the saved numerical hash.

Replay the [desktop workflow](evidence/a6-f1-desktop-workflow-trace.zip), [mobile workflow](evidence/a6-f1-mobile-workflow-trace.zip), [desktop recovery](evidence/a6-f1-desktop-recovery-trace.zip) and [mobile recovery](evidence/a6-f1-mobile-recovery-trace.zip) with `npx.cmd playwright show-trace <path>`. These demonstrate the actual shared creation/edit/save/open interface, not an in-memory serializer alone. Visual review corrected inherited low-contrast spherical chrome text and moved failure messages away from the floating tools. Mobile evidence is Chromium touch/CPU emulation on this Windows host; physical-device and owner acceptance remain separate.

## Performance and preservation

No brush, texture, raster, scheduling or memory budget was raised. Startup now allocates no terrain until creation/Open. A sphere no longer retains a hidden 1 MiB planar elevation buffer, planar history or planar display cache. Temporary candidate preparation still retains the current document until replacement succeeds; peak memory is not claimed to equal steady-state typed payloads. Typed payload accounting excludes JS, browser, canvas and GC overhead and is not process RSS.

The persistence timing workload now runs three complete real encode/write/read/validate/restore/cache cycles, retaining every cycle's measurements and exactness checks. Fast native N=128 work can finish within a single vsync; the sustained workload meaningfully observes multiple callbacks without idle sleeps or counted idle frames. Existing heartbeat and numerical assertions remain. Top-level stage timings are the first cycle; `cycles` preserves all three. Mobile persistence uses 4× CPU throttling. Isolated D2 editing performance is rerun unchanged and retained under F1 regression receipts; variability does not establish an optimization or solve weaker-device N=256 editing.

| Profile | N | Encode | Validate/write | Read | Validate/restore | Actual host cache preparation | Max host cache task |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Desktop | 128 | 4.2 | 7.3 | 1.3 | 9.9 | 52.2 | 8.3 |
| Desktop | 256 | 6.6 | 15.9 | 3.6 | 19.2 | 204.6 | 13.1 |
| Mobile emulation 4× CPU | 128 | 14.9 | 22.3 | 3.7 | 25.5 | 191.3 | 9.3 |
| Mobile emulation 4× CPU | 256 | 25.6 | 35.1 | 6.4 | 63.7 | 911.8 | 19.1 |

All times are milliseconds from this host. They are measurements, not frame-rate guarantees. N=128 authority/cache payloads remain 393,224/1,984,560 bytes; N=256 remains 1,572,872/7,901,232 bytes. Three-cycle callback counts and maximum observed gaps are retained in each complete receipt.

Production JavaScript grows by 1,907 raw bytes (131 gzip bytes using the same zlib settings); CSS grows by 1,254 raw bytes (246 gzip bytes). Both builds process 72 modules. The bundle comparison does not imply runtime speed.

The observed 4×-CPU N=256 host cache preparation is about 912 ms, so loading remains noticeable on weaker-device emulation. This sustained three-cycle workload differs from E's single-cycle measurements and is not a controlled latency comparison. The preparation/render/brush implementations and budgets are verified unchanged; these measurements do not claim a speed improvement or completion of N=256 mobile hardening.

[Production bundles](evidence/a6-f1-production-bundles.json) compare exact approved source and F1 with the same Node/dependencies. [Verification](evidence/a6-f1-verification.json) lists every protected numerical/interaction/persistence/fixture/config source hash and byte-identical historical report/evidence hash. Historical rerun artifacts are restored to their approved bytes; current measurements and screenshots use new F1 paths. The receipt lists the exact implementation files and hashes, excluding its own self-referential hash; delivery metadata is a later publication record.

## Remaining boundaries

**A6-D2-R automatic globe rotation/recentering during a held limb stroke remains outstanding.** Lift to rotate/recenter. N=256 mobile editing hardening also remains outstanding. No new geometries, general conversion, generation, illustrated rendering, 3D extrusion, historical simulation, Worlds/auth/backend integration, shared database writes or deployment are included. Legacy untyped catalog entries remain honestly labeled Planar (legacy) without payload migration; validated Open determines their geometry.

The master roadmap preserves the complete geometry, illustrated cartography across every supported shape/valid map scale, terrain measurement/Issue #1, linked maps, 3D, histories and Worlds requirements. Step 9 combines Atlas with separately rebuilt Worlds and develops their shared functionality; Step 10 integrates the completed combined system into Serrian Tide; Step 11 builds the final reusable historical/modern Earth setting. The live Serrian Tide application remains untouched. **Stop after A6-F1 for review. No subsequent pass has begun.**
