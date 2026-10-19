# Physical cylinder persistence and unified workspace — A7-D

Cylinder is a normal document in the standalone Atlas application at `/`. Choose **New World / Map → Physical capped cylinder**, enter its radius and axial length in meters, choose detail, and create it. Save explicitly to the existing browser-local library; open that saved entry to resume. No account, synchronization, main-site integration or production deployment is introduced.

## Document and view ownership

`AtlasDocument` adds the `cylinder` variant. Its numerical authority is the existing `CylindricalTerrain`; its disposable editor is the accepted `CylinderPreviewSession`, extended with saved checkpoints and persistence locking. `prepareCylinderSession` cooperatively prepares the existing RGBA cache before replacement. The same `CylinderWorkspace` runs both the diagnostic development entry and the normal Atlas provider. No second cylinder renderer, brush engine, elevation field or history stack exists.

The host owns name, identity, mixed library, Save/Open, New, discard protection, shared shortcuts, history buttons, fullscreen and the slide-in Atlas tools. The cylinder provider contributes physical brush controls, its tool picker, navigation and the exact numerical stencil. The tools overlay the complete viewport. Both physical and connected-map views retain A7-C projections, cuts, correct cap orientation, intrinsic brush distances, visibility protection and exact B2B2 history. A newly opened document starts in the fitted physical view with empty session history; camera/view settings are not geographical save data.

The current host accepts angular/axial/radial detail **64/32/16**, **128/64/32** or **256/128/64**, with **4,034 / 16,258 / 65,282** canonical samples. Initial interactive dimensions are **1–1,000,000,000 m** for each radius/length, and **0.1 ≤ length/radius ≤ 20**. This explicit host envelope prevents unbounded reference-coordinate aspect ratios; it does not revise the numerical engine's broader physical contract. Higher detail and large intrinsic footprints retain A7-C safe work/precision limits. The creation dialog explains the envelope and mobile tradeoff.

## Version 4 record

`src/persistence/cylindrical-format.ts` implements the independent **v4** cylinder format. Existing v1/v2/v3 codecs and meanings are unchanged. The root has exactly these fields:

| Field | Required value or meaning |
| --- | --- |
| `format` | `serrian-tide-heightmap` |
| `formatVersion` | `4` |
| `id` | Terrain ID, exactly equal to `metadata.terrainId` |
| `name` | Nonblank, at most 120 characters; trimmed on encoding |
| `savedAt` | Real canonical UTC ISO timestamp with milliseconds |
| `metadata` | Complete validated cylinder metadata below |
| `sampleCount` | `angularSamples × (axialCells + 2 × radialCells − 1) + 2` |
| `elevationEncoding` | `float32-le-canonical` |
| `elevations` | Private, exact-length ArrayBuffer of little-endian canonical Float32 words |
| `checksum` | Lowercase SHA-256 of UTF-8 canonical header JSON followed by elevation bytes |

The metadata contains terrain ID; World/surface identity; geometry identity/provider/version/configuration/role/radius/length; representation provider/version/resolution/ownership; elevation units and sea level. Geometry must be `physical-closed-cylinder` v1, `solid-capped`, `exterior`. Its identity must exactly equal the metadata identity. Representation must be `cylinder-rings-shared-rims` v1 with `side-rims-cap-interiors-single-centers` ownership and one of the three supported detail triples. Units are meters, with positive-zero sea level 0. IDs are nonblank strings of at most 128 characters.

Header reconstruction rejects missing or extra fields, unsupported providers/versions/ownership, foreign identity, unsupported dimensions/detail, invalid names/dates/counts and incompatible units. Payload validation requires exactly four bytes per canonical sample, at most **261,128 bytes**, an ordinary ArrayBuffer, finite Float32 values and a valid checksum. The planar-only `decodeMap`/`LocalMapStore.open` APIs continue to reject non-planar records; `openAny` explicitly dispatches v4.

Encode snapshots the authority before its first yield, writes the exact Uint32 representations in little endian and preserves signed zero and finite subnormals. Validation snapshots payload and reconstructs detached canonical metadata before its first yield. Decoder constructs a candidate authority only after all metadata, finite samples and integrity pass; restoration and cache preparation yield cooperatively. Failed/cancelled candidates never replace the active document. Persistence snapshots are temporary validation/encoding data, not additional live authoritative terrain.

## Atomic local storage and replacement

The existing IndexedDB database remains `serrian-tide-atlas`, version 1, using `heightmaps` and `catalog`. Both record and catalog writes occur in **one readwrite transaction**, after asynchronous validation finishes. The mixed catalog labels v4 as Physical cylinder. Existing-format replacement checks remain; same-ID v4 updates additionally require identical complete canonical geometry, representation and identity. No automatic conversion or cross-shape overwrite is allowed.

The shared unload guard protects both changed content and an accepted cylinder stroke still awaiting its first numerical commit. Cancelling departure retains and drains accepted work. Save ends pointer ownership before focus changes, releases and drains every accepted numerical position, locks further interaction, then encodes and writes. A queued numerical failure prevents saving a falsely complete stroke. Only transaction completion marks the checkpoint saved. Quota denial, security denial, explicit abort or catalog-write failure leaves the previous record/catalog and current edited authority/checkpoint intact. Old v1 bounded, v2 wrapped and v3 sphere entries remain in the same library.

New/Open preserve the current authority while a candidate is validated/prepared. Discard confirmation is required for changed content. Rejection, invalid records, failed preparation and cancellation leave current geography, identity and history available. A successfully replaced cylinder is disposed: pending input/stencil/raster work and handlers are stopped, cache/history/checkpoint storage released. No old session can keep painting behind another map.

## Exact saved checkpoints

A nonzero numerical revision is never used as saved-state identity. The editor retains a **sparse map of exact baseline Float32 values for samples differing from the last successful save/open**. The accepted commit observer updates it using each real before/after pair. Undo/Redo updates it from the original history's exact words. `Object.is` distinguishes signed zero; finite Float32 equality is exact. Returning a sample to its checkpoint value removes its entry. Saving clears differences and records the saved name; opening initializes a clean checkpoint on the restored authority regardless of its numerical revision.

This is checkpoint bookkeeping, not another editable elevation field or history. It retains at most one baseline number per canonical sample (65,282 entries maximum), plus JS Map overhead. It does not depend on the bounded history cursor, entry indices, branch pruning or eviction. Name changes are tracked separately. A fresh blank cylinder reports Not saved yet; edited content reports Unsaved changes; completed Save/Open reports Saved on this device; Undo to saved content becomes clean again. Rename Undo remains native in text fields, as in the existing workspace.

The adapter is the sole numerical writer. A future worker/external writer must participate in commit/checkpoint and cache synchronization; bypassing the document adapter is not a supported editing path. Future Next.js authentication, permissions, database and World linkage stay host responsibilities in the eleven-phase roadmap's authorized order.

## Verification and remaining boundaries

Run `npm.cmd test`, `npm.cmd run test:browser` and `npm.cmd run build`. New numerical tests cover all three exact-word round trips, signed zero/subnormals/extremes, shared rims/centers, malformed and corrupt records, caller mutation around yields, checkpoint branching/eviction, accepted-input draining, preparation disposal and dimension-envelope projection round trips. Real `/` browser workflows exercise creation, both views/all tools/rims/caps, mixed-library Save/Open, every supported detail, native inputs, held-stroke Save, cancellation, failed writes, damaged records and replacement safety.

See the [completion report, fresh full-run result, screenshots, traces, measurements and file inventory](A7-D-COMPLETION.md). GPU-free browser rendering and all A7-C numerical work/visibility limits remain. Physical dabs reaching occluded changed samples still reject atomically; use Surface map, rotate or reduce radius. Cylinder automatic limb assistance, displaced terrain, general conversion, additional geometries, server persistence, autosave and Worlds/live-site integration remain outside this pass.

**Stop after A7-D for Ember's independent review and owner hands-on acceptance. No subsequent geometry phase is authorized.**
