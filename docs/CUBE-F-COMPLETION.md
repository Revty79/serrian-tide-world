# Cube-F — saved solid cube Worlds

2026-10-21. Follows Cube-E `7e50b5282222d8b961ec262379bdb6b467d623c9`.
Technical delivery under the owner's Cube-E/F and supplemental authorization;
owner hands-on acceptance of E/F is still pending. Stop here for solid-cube review.

## Open and test

The running local preview is **http://127.0.0.1:5260/**. A fresh
`npm.cmd run dev` uses **http://127.0.0.1:5173/**. Use the same origin/browser
profile for subsequent Open operations; different ports have separate local saves.

1. Choose **Solid cube world** in New World / Map, name it, enter an edge length
   in meters and select N128 or N256. N128 is the faster starting point.
2. Drag with Raise across physical joins in the 3D cube. Lower carves valleys;
   Smooth and Flatten offer intensity. Open tools exposes radius and strength.
   Navigate or Space + drag rotates / pans; wheel and pinch zoom.
3. Use the unfolded map to work on the same geography. The five displayed joins
   are continuous; cut edges/blank space end a stroke. Undo/Redo is per held gesture.
4. **Save**. Wait for **Saved on this device**, then close the tab completely.
5. Reopen Atlas at the same address. Choose **Browse saved maps**, select the
   entry labelled **Solid cube**, and **Open Map**. Continue drawing and Save again.

This is the normal creator-owned local World workflow, with preserved World,
surface and terrain identities. It is not the seeded D1 demonstration. Saves are
explicit, browser-local IndexedDB records; there is no autosave, external file
export, cloud sync or website/database integration in this pass. The separate
`/dev/cube-editor.html` remains a disposable Cube-E session for diagnostics.

## Persistence contract

`serrian-tide-heightmap` **v5** stores a strict versioned header plus one canonical
Float32 little-endian payload. No duplicated face rasters, caches, camera state,
history or temporary worker state is saved. Header and payload are SHA-256 covered.
Validation rejects unknown fields/providers/versions/ownership/face order, mismatched
identities, dimensions, count, lengths, dates, units, checksums and nonfinite words
before constructing a replacement authority. N128/N256 and 1–1,000,000,000 m edges
are explicit bounds; maximum elevation payload is **1,572,872 bytes**.

Canonical words, including signed zero and subnormals, round-trip exactly. Geometry,
configuration, edge length, canonical ownership and face order survive. Open creates
a fresh revision lease, exact baseline and empty history; it does not reuse stale
sessions or derive saved geography from a rendered texture. Numeric revision counts
are reinitialized during restoration; they are runtime epochs, not persistent IDs.

Save ends input, drains accepted work, locks editing, snapshots and encodes exact
words, checks that the source revision stayed fixed, validates, then commits payload
and catalog in one transaction. Only transaction success advances the editor's
saved baseline. A rejected/aborted write retains unsaved work, history and the last
committed save. Overwrite rejects another format, geometry, resolution or identity.
Open validates/prepares a disposable candidate and resolves unsaved changes before
replacing the active document. Corrupt/future data, cancellation or preparation
failure retain the existing document. Old cube workers are disposed on replacement.

Existing v1 bounded, v2 wrapped, v3 sphere and v4 cylinder formats remain unchanged;
the mixed library and planar-only API remain compatible/fail-closed as appropriate.
The database schema/version remains 1. No automatic record migrations occur.

## Verification

- **6 v5 tests** cover N128/N256 exact words/signed zero, geometry, aliases,
  corruption, bounds, all header integrity, rehashed nonfinite words, cancellation,
  mutation during encode and fresh editor identities.
- **28 focused numerical tests passed**, including all existing persistence tests
  and Cube-E scheduling/history/derived-field tests.
- **8 Cube-F browser cases passed** on desktop and Pixel7 Chromium emulation:
  N128/N256 Create → Paint → Cross edges → Undo → Redo → Save → full tab Close →
  Open → Paint again → exact Undo/Redo → Save; plus quota/abort, corrupt Open,
  cancelled replacement, geometry/identity/cross-format overwrite protection and
  mixed v1–v5 catalog presence. Two further cases open valid extreme finite words,
  report the renderer's relief-range failure visibly and verify geography remains
  exact and New World remains usable. No physical-phone proof is claimed.
- Final layout refinement reran both N128 full workflows, with updated screenshots.
- Targeted existing browser regressions exercise actual v1/v2/v3 editing/history/
  Save/Open, v4 editing/rims/Save/Open, cancellation/failure, startup and D1 lifetime.
  **12/12 passed.** Their evidence writers ran in an isolated directory to preserve
  accepted receipts. Combined with the eight cube cases, this is 20 unique browser
  cases for F; layout reruns are not counted as additional unique cases.
- Build/typecheck passed. Source inventory and concise receipts accompany delivery.

`docs/evidence/cube-f-*-workflow.json` contains browser Save/Open timings and exact
payload hashes, geometry and identities before/after full closure. Actual painted
screenshots show the saved and reopened/continued worlds. Save/Open timing includes
UI completion; Open also includes preparation of visible full-resolution terrain.
Observed Save was approximately 0.1 s; Open through visible terrain 0.6–1.7 s on
this machine. Timings are measurements, not performance guarantees for other devices.

## Remaining limits and review

Cube-E's documented bounds remain: 256 accepted points, 4,096 dabs and aggregate
work/queue/history budgets. Wide/complex N256 strokes can drain for seconds. The
footer reports progress and warns approaching the point limit. An interrupted or
failed stroke requires Undo or explicit Keep partial result before Save/drawing.
No failed prefix becomes a successful stroke. The old 65,536 gesture-word ceiling
is removed for the editor: the tested four-face operation contains 135,933 changes.

Owner review should cover comfortable drawing pace, physical corners, preferred
devices, navigation and Save/Open. There is no claim of owner acceptance from
automated evidence. Original website, shared databases, hosting, Docker and
Production remain untouched. Future hollow worlds retain both linked entrances
and genuine physical caves/tunnels through shells; custom irregular geometry and
the approved roadmap/order remain future work. No next shape is started.
