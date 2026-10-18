# A6-E — Persistent spherical heightmaps: Save, Open and recovery

October 17, 2026. Repository `Revty79/serrian-tide-world`, branch `main`. Approved baseline **`a9a6d64690427cfef04300da1fc87b576adf16c0`**. The owner supplied Ember's D2 source/visual/numerical/browser approval and authorized E directly on main. E independent review and owner hands-on acceptance remain pending. The exact delivery commit SHA is supplied in the delivery message/repository log; this report is part of that commit.

## Delivered result

A creator can create a blank sphere, sculpt it, name it, **Save Sphere**, reload Atlas, open it from the mixed local library, and continue editing the exact same numerical world. Globe/net/readouts/all four tools share one restored canonical authority. Reopening starts fresh Undo/Redo and camera state, as explained in the UI. Subsequent edits get exact normal history. The existing planar/wrapped document remains preserved behind the sphere; sphere Save uses its own terrain ID.

[SPHERICAL-PERSISTENCE.md](SPHERICAL-PERSISTENCE.md) is the complete format/validation/memory/transaction specification. V3 stores one little-endian canonical Float32 payload with exactly `6N²+2` samples, stable terrain/World/surface IDs, explicit sphere radius, sea level/units and the exact representation/face/ownership contract. Signed zero, subnormals and all valid negative elevations remain exact. SHA-256 covers normalized complete metadata plus payload. Unknown fields, future versions, other shapes/representations, malformed IDs/dimensions/counts, invalid values, corruption and resource-limit violations fail closed before replacing active work. V3 supports N=2…256; the development UI remains N=128/256.

The **same IndexedDB database remains version 1** with its two original generic stores. No schema upgrade, second storage application, legacy rewrite or deletion is necessary. New catalog rows identify physical type; old rows remain untouched and explicitly display Planar (legacy). The adapter retains planar-only `open`/codecs and adds explicit `openAny`; all v1/v2 readers still work. Transactions atomically replace both heightmap and catalog. Cross-format replacement is refused, and v3 metadata/identity/radius/resolution changes cannot overwrite another sphere under the same key.

Save releases pointer capture without dropping accepted queued input, drains/commits that operation, locks mutations/history, then encodes and writes a consistent snapshot. It marks the saved checkpoint only after transaction completion. Status distinguishes new/modified/saving/saved/failed work; name changes and Undo/Redo track the saved state. Failed writes retain live edits and the prior committed record for retry. Open validates/restores/prepares a candidate before replacing the current sphere; failed/canceled opens preserve the old authority/history. Standard discard/reload warnings remain where supported.

## Architecture and validation

- `spherical-format.ts` owns strict v3 metadata/byte validation, private snapshot capture, checksum and cooperative canonical restoration. v1/v2 codec files are unchanged.
- `LocalMapStore` extends the existing adapter, catalog and atomic overwrite guards. Async validation/hashing finishes before the readwrite transaction begins.
- `SphericalEditor` is the replaceable persistent host. `SphericalStorageControls` supplies naming/local selection; `SphericalViewport` receives an optional persistence interface. Panel focus happens during commit so fast renaming cannot redirect typing into brush radius. Saved status and unlocked editing appear together. The read-only demonstration/test host remain separate.
- `SphericalSession` adds saved name/history checkpoints, operation locking and queued-input drain. `spherical-editing.ts` distinguishes normal pointer release from explicit cancellation, so Save focus/shortcuts cannot truncate a released queue.
- `prepare-spherical-session.ts` cooperatively builds candidate textures using the existing renderer's exact expressions and canonical indices. It avoids six elevation fields. Geometry, brush algorithms, projection math and editing budgets are unchanged.
- **178 numerical tests pass**, including all 169 baseline tests. Nine new cases cover blank/sculpted N128/N256 exact bits/metadata, all face boundaries/corners, signed zero/subnormals, finite/byte/resource/format checks, checksum coverage, snapshot mutation races, cooperative texture equality, saved checkpoints and exact queued-input drain.
- **Browser result:** **193 passed, one existing intentional desktop touch skip, 194 total, zero retries**. Six new cases per profile prove actual IndexedDB writes/reload/reopen, all four tools/history after restore, held-stroke Ctrl-S, mixed legacy/v3 library, unchanged old records/catalog, overwrite protection, quota/denial/transaction abort, invalid opens, discard/reload cancellation, and real N128/N256 performance. Only one old D2 assertion changes: its obsolete session-only discard wording becomes the persistent unsaved-work wording. The mechanical/numerical assertions remain.
- `npm.cmd run build` passes, including TypeScript; Vite builds 72 modules. No dependencies, schema, service, authentication or original-site files change. Full regressions retain A0–A6-D2 brushes, navigation, wrapping, edge assistance, projections, previews, history and v1/v2 storage. [Verification](evidence/a6-e-verification.json) contains exact files/hashes, historical preservation and performance summaries; [browser JSON](evidence/a6-e-browser-results.json) records every final case.

Standard reproduction: `npm.cmd test`, `npm.cmd run test:browser`, `npm.cmd run build`. D2/E browser-only reproduction: `npm.cmd run test:browser -- tests/spherical-editing.spec.ts tests/spherical-persistence.spec.ts`. Final local evidence uses a fresh non-reused loopback server at port 5178, two standard Chromium projects/two workers, zero retries, list + JSON reporters and frozen source. The focus/name/checkpoint workflow also passed three consecutive runs per profile before the final full suite.

## Actual browser evidence

The screenshots below show the actual application creating a blank sphere, saving sculpted geography, reloading/reopening that same record in the net, and editing it again on the globe:

| State | Desktop | Mobile |
| --- | --- | --- |
| Untouched blank sphere saved | [Blank](evidence/a6-e-desktop-blank-saved.png) | [Blank](evidence/a6-e-mobile-blank-saved.png) |
| Sculpted continent saved | [Saved continent](evidence/a6-e-desktop-continent-saved.png) | [Saved continent](evidence/a6-e-mobile-continent-saved.png) |
| Same saved sphere after reload/open, net view | [Reopened](evidence/a6-e-desktop-reopened-net.png) | [Reopened](evidence/a6-e-mobile-reopened-net.png) |
| Continued editing and resaving | [Continued](evidence/a6-e-desktop-continued-editing.png) | [Continued](evidence/a6-e-mobile-continued-editing.png) |

Self-contained Playwright traces include actual native browser actions, snapshots, screenshots, sources and network evidence:

- [Desktop create/sculpt/save/reload/reopen/edit](evidence/a6-e-desktop-save-open-trace.zip).
- [Mobile create/sculpt/save/reload/reopen/edit](evidence/a6-e-mobile-save-open-trace.zip).
- [Desktop failed saves, atomic retention, retry and canceled/invalid opens](evidence/a6-e-desktop-recovery-trace.zip).
- [Mobile failed saves, atomic retention, retry and canceled/invalid opens](evidence/a6-e-mobile-recovery-trace.zip).

Open with `npx.cmd playwright show-trace docs/evidence/<filename>.zip`. Test-only inspection/fault injection is in `tests/fixtures/sphere-storage.ts`, never imported into the product bundle. Persistence is demonstrated through real IndexedDB and actual UI reload/open, not merely in-memory serialization.

## Performance and memory

Measurements use real v3 snapshots/checksums, database transactions, raw IDB reads, strict decode, derived textures and the actual App Open/Save. Desktop is 1440×900; Pixel 7 is 412×839 with **4× CPU throttling**, on this Windows host. This is emulation, not physical-device qualification. Times include cooperative yields; IDB writing includes validation of a private snapshot. An animation-frame heartbeat runs through the operations.

| Profile | N | Encode ms | Validate + write ms | Read ms | Validate + restore ms | Texture ms | Max texture task / heartbeat gap ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop | 128 | 3.9 | 6.8 | 1.0 | 8.8 | 55.8 | 8.1 / 7.7 |
| Desktop | 256 | 9.8 | 15.3 | 3.0 | 19.3 | 173.6 | 8.3 / 105.8 |
| Mobile, 4x CPU | 128 | 25.7 | 21.0 | 2.7 | 31.0 | 209.4 | 10.7 / 107.4 |
| Mobile, 4x CPU | 256 | 25.6 | 33.8 | 6.0 | 55.4 | 612.3 | 9.9 / 107.7 |

Raw receipts: [desktop N128](evidence/a6-e-desktop-n128-persistence.json), [desktop N256](evidence/a6-e-desktop-n256-persistence.json), [mobile N128](evidence/a6-e-mobile-n128-persistence.json), [mobile N256](evidence/a6-e-mobile-n256-persistence.json). They also record actual App texture preparation, task/heartbeat intervals, exact payload/metadata matches and database version 1. First globe presentation/CPU refinement can still cause longer frames; nominal work budgets are not a universal frame-time guarantee.

At N128/N256, authority and serialized payload each occupy 393,224 / 1,572,872 bytes. Encoding additionally holds one source snapshot, output and temporary checksum concatenation (about 3A plus header for payload size A). Validation holds a private A and temporary hash input; decoding allocates a new authority after validation. Editable RGBA/index caches are 1,984,560 / 7,901,232 bytes. During protected Open, the current authority/cache coexist with the candidate and its preparation snapshot. Object/GC/native IDB/Canvas/graphics memory is additional; recorded typed payloads are not peak process RSS. No six unrelated face elevation arrays are allocated.

The unchanged D2 editing performance cases run again in the full suite. Their raw historical receipts are preserved; current-versus-baseline summaries are in verification. Numerical brush/geometry algorithms and the D2 6/16 ms editing budget are unchanged. **N256 editing on weaker devices remains a separate hardening requirement**, not an E performance-completion claim.

## Limits, review and stopping point

Local saves belong to the current browser/profile/origin/device. There is no autosave, server synchronization, cloud backup, external export or guarantee against crashes, device loss, denied/evicted storage. Browser unload warnings may be suppressed. Recovery means reopening the last committed local record and retaining/retrying edits after a failed operation; session history and camera preferences are not persisted. SHA-256 checks integrity, not ownership/authenticity.

V3's N256 resource ceiling is deliberate; N512 browser saves require a later policy/review. The current fixed sea-level datum remains 0 m. Other shapes/conversions/datums and actual 3D extrusion are unimplemented. **A6-D2-R** remains required for safe automatic globe rotation/recentering during held limb drawing. Existing net-edge assistance is retained, and automatic drawing navigation must eventually suit each supported geometry. No unrelated correction is implemented here.

The complete geometry, editable illustrated cartography across every shape/valid map scale, linked regions/cities/buildings/interiors/dungeons, elevation/measurement/3D consistency, historical geography, Issue #1 and Worlds requirements remain intact. Mandatory integration sequence remains **9: Atlas + separately rebuilt Worlds and shared functionality; 10: completed combined system into Serrian Tide; 11: final reusable historical/modern Earth foundation**. No integration or deployment occurs.

**STOP after A6-E for independent review. Do not begin the next pass without authorization.**

## Exact changed files

- `README.md`
- `docs/A6-E-COMPLETION.md`
- `docs/ARCHITECTURE.md`
- `docs/PHASE-1-HEIGHTMAP-ROADMAP.md`
- `docs/SPHERICAL-EDITING.md`
- `docs/SPHERICAL-PERSISTENCE.md`
- `docs/SPHERICAL-SCULPTING.md`
- `docs/SPHERICAL-VIEWS.md`
- `docs/WORLD-SURFACE-ARCHITECTURE.md`
- `docs/evidence/a6-e-browser-results.json`
- `docs/evidence/a6-e-desktop-blank-saved.png`
- `docs/evidence/a6-e-desktop-continent-saved.png`
- `docs/evidence/a6-e-desktop-continued-editing.png`
- `docs/evidence/a6-e-desktop-n128-persistence.json`
- `docs/evidence/a6-e-desktop-n256-persistence.json`
- `docs/evidence/a6-e-desktop-recovery-trace.zip`
- `docs/evidence/a6-e-desktop-reopened-net.png`
- `docs/evidence/a6-e-desktop-save-open-trace.zip`
- `docs/evidence/a6-e-mobile-blank-saved.png`
- `docs/evidence/a6-e-mobile-continent-saved.png`
- `docs/evidence/a6-e-mobile-continued-editing.png`
- `docs/evidence/a6-e-mobile-n128-persistence.json`
- `docs/evidence/a6-e-mobile-n256-persistence.json`
- `docs/evidence/a6-e-mobile-recovery-trace.zip`
- `docs/evidence/a6-e-mobile-reopened-net.png`
- `docs/evidence/a6-e-mobile-save-open-trace.zip`
- `docs/evidence/a6-e-verification.json`
- `src/App.tsx`
- `src/components/SphericalEditor.tsx`
- `src/components/SphericalPreview.module.css`
- `src/components/SphericalStorageControls.tsx`
- `src/components/SphericalViewport.tsx`
- `src/editor/prepare-spherical-session.ts`
- `src/editor/spherical-persistence.test.ts`
- `src/editor/spherical-session.ts`
- `src/interaction/spherical-editing.ts`
- `src/persistence/cooperative-work.ts`
- `src/persistence/local-map-store.ts`
- `src/persistence/map-format.ts`
- `src/persistence/spherical-format.test.ts`
- `src/persistence/spherical-format.ts`
- `src/rendering/spherical-raster.ts`
- `tests/fixtures/sphere-storage.ts`
- `tests/spherical-editing.spec.ts`
- `tests/spherical-persistence.spec.ts`
