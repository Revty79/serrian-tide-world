# Spherical persistence — A6-E / format v3

Current hosting (A6-P1 on F1/D2-R): one shared Atlas document/workspace with contextual controls and exact local v1/v2/v3 preservation. P1 optimizes display rendering only; numerical tools, D2-R visibility/spacing/history and persistence contracts remain unchanged. Historical launch/Return-to-map statements below describe earlier checkpoints and retained fixtures. See [P1 evidence](A6-P1-COMPLETION.md), [unified workspace](UNIFIED-WORKSPACE.md) and the revised [eleven-phase roadmap](PHASE-1-HEIGHTMAP-ROADMAP.md). Stop after P1 for independent review; integration targets existing Worlds in isolated development after interconnected maps work.


The approved input is `a9a6d64690427cfef04300da1fc87b576adf16c0` (A6-D2). This adds explicit browser-local Save/Open to its editable spherical workspace. The read-only synthetic demonstration remains separate. There is no server storage, authentication, original-site integration, autosave, external interchange or timeline storage.

## Record specification

The record is a structured-clone object in the existing IndexedDB `heightmaps` store. There is exactly one elevation payload, in **canonical vertex order**, never six independent face arrays.

| Field | Contract |
| --- | --- |
| `format` / `formatVersion` | `serrian-tide-heightmap` / `3`; distinct from bounded v1 and periodic v2 |
| `id`, `name`, `savedAt` | Terrain ID (1–128 characters), nonblank name (≤120), canonical UTC ISO timestamp. Root ID equals metadata terrain ID |
| `metadata.terrainId` | Stable terrain identity |
| `metadata.identity` | Stable `worldId`, `surfaceId`, each 1–128 nonblank characters |
| `metadata.geometry` | `{kind:'sphere', radiusMeters}`; positive explicit radius, finite πR. No Earth default or conversion |
| `metadata.representation` | `{provider:'equiangular-cube-sphere-vertices', version:1, cellsPerEdge:N, ownership:'interiors-edges-corners', faces:['px','nx','py','ny','pz','nz']}` |
| `metadata.elevationUnits`, `seaLevel` | `meters`, `0`; current spherical provider's fixed datum. Other conventions require future design; unsupported values are rejected |
| `sampleCount` | Exactly `6N²+2` |
| `elevationEncoding` | `float32-le-canonical` |
| `elevations` | One ArrayBuffer, exactly `4(6N²+2)` bytes. Every little-endian Float32 must be finite; all finite bit patterns, including signed zero/subnormals, are preserved |
| `checksum` | Lowercase 64-digit SHA-256 of UTF-8 `JSON.stringify(canonicalHeader)` concatenated with the complete elevation bytes |

The canonical header contains fields in this order: format, formatVersion, id, name, savedAt, metadata, sampleCount, elevationEncoding. Metadata is reconstructed in provider order: terrainId, identity (worldId/surfaceId), geometry (kind/radiusMeters), representation (provider/version/cellsPerEdge/ownership/faces), elevationUnits, seaLevel. Unknown fields at root or metadata/identity/geometry/representation levels are rejected. Faces must contain all six exact IDs in exact order, without sparse entries or extra properties. Object property order supplied by a caller is not significant; every accepted meaningful value is included in the normalized checksum header. The checksum detects corruption, not malicious authorship or authorization.

Representation v1 fixes the geographic axes, face bases and canonical index layout documented in [the spherical foundation](SPHERICAL-HEIGHTMAP-FOUNDATION.md). Interiors occupy six `(N−1)²` blocks in face order, followed by twelve `(N−1)` edge blocks in the provider's axis-pair/sign order and eight corner sign combinations. These are charts of a **round sphere**, not a physical cube. Saving does not change the geographic frame, reproject samples or persist the camera.

This browser format accepts integer N=2…256, with the development UI offering N=128/256. The explicit resource ceiling is **393,218 unique samples / 1,572,872 payload bytes**. The numerical provider's higher N=512 capability is not a promise that this browser persistence policy accepts it. Unsupported resolutions, counts, oversized/short/non-ArrayBuffer payloads, nonfinite values, invalid IDs/dates/radius, unknown versions, physical shapes, representation versions, ownership and units fail closed before construction. IndexedDB itself materializes a retrieved record before the codec can inspect it; these limits bound codec-owned allocations, not arbitrary direct database tampering or browser process RSS.

## Integrity, snapshots and restoration

`encodeSphericalHeightmap` validates metadata, captures one private canonical Float32 snapshot before its first await, then writes its Uint32 words explicitly little-endian in bounded blocks. It hashes the normalized header and payload. Mutation of the original provider during a codec yield cannot change that snapshot.

`validateSphericalHeightmap` validates structure and payload limits before making a private buffer copy, scans finite values cooperatively, then verifies SHA-256. It captures header values and bytes before awaiting; callers cannot race verification by mutating their original buffer/metadata. `decodeSphericalHeightmap` constructs a candidate authority only after all checks pass, then restores through validated canonical writes in bounded blocks. Signed zero is retained. The original live terrain is never used as a decode target.

Loading prepares derived display textures for the candidate before replacing the active sphere. Cooperative texture construction uses the exact existing synchronous interpolation/color expressions, yielding at index/row checkpoints with a nominal 8 ms task budget. All six views resolve the same restored authority and aliases. New session history starts empty, saved/clean, and camera state resets. Subsequent edits receive normal exact history. View changes never affect stored geography.

## Database strategy and atomicity

**IndexedDB stays version 1**, database `serrian-tide-atlas`, stores `heightmaps` and `catalog`, both keyPath `id`. Their existing generic object records already support v3; no schema migration, index, second database or bulk rewrite is needed. Browser tests create the old v1 database/records and prove version remains 1, legacy payload/checksum/catalog rows remain unchanged, v1/v2 still open, and v3 works alongside them. A fresh database still uses the existing upgrade callback only to create the two stores.

The existing `LocalMapStore` adapter handles all formats. Its original planar-only `open` and `encodeMap`/`decodeMap` APIs remain fail-closed for spheres. `openAny` explicitly dispatches version 3 to the spherical decoder and versions 1/2 to their unchanged readers; unknown/invalid records never fall back to planar terrain. The original v1/v2 codec files remain unchanged.

Successful new writes add an optional `kind` to their catalog summary: bounded, wrapped, sphere. Old summaries are neither rewritten nor guessed: they display **Planar (legacy)** because old catalog rows did not store topology. This distinguishes physical planar terrain from spheres without loading every full legacy payload into a listing. New planar writes show Bounded plane / Wrapped plane. Catalog type is a presentation hint; opening always validates the actual heightmap record. A sphere-only dropdown inside the editor and the main mixed library use this same adapter.

Spherical Save validates a private record snapshot **before** opening the readwrite transaction. Asynchronous hashing never runs inside a live IDB transaction. The heightmap and catalog are written in one transaction; completion is the success boundary. Denial, quota exceptions, synchronous put errors and abort/interruption reject Save. Tests abort after the heightmap put and prove both the prior payload/checksum and catalog row remain intact. Edited live terrain/history/name remain available for retry.

An existing key cannot be overwritten by a different format. v2 identity guards remain. For v3, the complete immutable metadata must match: World/surface/terrain identity, physical radius/shape, representation/resolution/faces/ownership and datum/units. Names/timestamps/elevations may change on an intentional save. A malformed previous v3 header aborts replacement. This prevents a selected library row or another shape from silently changing which authority Save updates. Compatible same-ID saves across tabs use the last committed write; cross-tab conflict merging is not implemented.

## UI, queued strokes and work protection

The replaceable `SphericalEditor` host owns the local persistence workflow; `SphericalViewport` receives an optional persistence interface. Numerical geometry/brushes are independent of the host/storage. Future Next.js integration can supply its own authorized World records and adapter without adopting this development shell.

Use **View controls → Spherical world name**, then floating **Save Sphere** or Ctrl/⌘ S. While Save runs, mutation/history commands are locked. The input controller releases capture without canceling accepted physical segments. The session drains those segments using existing complete-dab scheduling, commits once, then snapshots/encodes/writes the stable numerical state. A newly encountered drain error fails Save rather than silently saving an unintended partial tail. The ordinary focus change after pointer release no longer cancels its pending queue. Explicit painting cancellation still retains only the applied part as an operation, as before.

Status distinguishes not-yet-saved, modified, saving/progress, saved and failed operations. A saved checkpoint records history state and normalized name **only after transaction completion**. Undo/Redo away from/to that checkpoint updates dirty status correctly; renaming also marks dirty. Failed Save leaves the checkpoint and old record intact. Successful Save followed by a listing refresh failure remains saved and reports the listing error separately.

Use **Saved spherical worlds → Open Sphere**, or return to the main **Saved maps → Open Map** mixed library. Opening validates/restores/prepares a candidate first. It asks before abandoning modified spherical work; cancellation or any failure retains the existing authority/history. The main planar/wrapped document stays mounted behind the sphere, with its own identity, camera, edits and history; spherical Save always uses the sphere's terrain ID. There is no conversion or overwrite of that background map.

Return warns before discarding unsaved edits; closing/reloading uses the browser's supported beforeunload prompt, including while an operation is pending. Warnings may be suppressed or omitted on device/process termination. **No autosave, crash recovery, server backup, device-loss protection or storage-eviction guarantee is provided.** Recovery here means explicit reopen of the last committed local record and safe retry after failed operations. Reopened history/camera are fresh; saved geography is exact.

## Performance, memory and follow-ups

Both codecs work in 16,384-sample blocks and yield real tasks (Scheduler API where supported, timer fallback). Progress is visible during noticeable Save/Open/cache work. Preparation takes one temporary canonical snapshot and six index/RGBA caches, never six face elevation authorities. Raw N=128/256 desktop and 4× throttled Pixel 7 measurements are linked in [completion](A6-E-COMPLETION.md). They include real IndexedDB writes/reads, validation, texture restoration, animation-frame heartbeat and actual App reopening/resaving, not just serializer round-trips.

For elevation payload size A, encoding owns a private source snapshot A, output A and temporary checksum concatenation about A plus header bytes, in addition to existing authority A. Validation owns a private A and temporary hash concatenation A; restoration allocates the new authority A. Those allocations have phase-specific lifetimes; original live terrain/display cache and candidate cache coexist during a protected Open. Counted payloads exclude JS objects, garbage awaiting collection, native IDB copies, Canvas2D buffers and graphics/browser overhead. No process-RSS ceiling is claimed.

**A6-D2-R is now implemented for review**: safe automatic globe rotation/recentering during a held limb brush stroke; see [completion and evidence](A6-D2-R-COMPLETION.md). Working net-edge assistance is preserved. Automatic drawing navigation must eventually suit every supported geometry. N=256 editing performance on weaker devices still needs its separate hardening checkpoint. E's cooperative loading and all storage formats remain unchanged; D2-R does not increase editing budgets.

P1 changes only display rendering and updates the owner's [eleven-phase roadmap](PHASE-1-HEIGHTMAP-ROADMAP.md). Every v1/v2/v3 persistence contract remains unchanged. Functional interconnected maps precede Phase 7 isolated-development integration into existing Worlds; Phases 8–9 develop bidirectional records and existing living-history/alternate-timeline links; Phase 10 verifies acceptance, compatibility and permissions before separately authorized production rollout. The complete geometry/cartography/linked-scale/measurement/3D requirements and Issue #1 remain. **STOP after A6-P1 for independent review; do not begin the next phase automatically.**
