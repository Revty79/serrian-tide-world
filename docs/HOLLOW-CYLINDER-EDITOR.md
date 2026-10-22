# Capped hollow-cylinder editor

The capped hollow cylinder is now available in normal New World / Map. It reuses
the accepted cylindrical brush, worker preparation, history, display cache and
viewport. One parent retains two independent terrain sessions and their own
physical dimensions. The numerical foundation is recorded separately in
[HOLLOW-CYLINDER-FOUNDATION.md](HOLLOW-CYLINDER-FOUNDATION.md).

## Hands-on review

Open http://127.0.0.1:5260/, choose **Capped hollow cylinder world**, and use outer
radius 1,000,000 m, outer length 2,000,000 m, inner radius 800,000 m and inner length
1,600,000 m. Start at detail 128. Atlas tools contain **Paint Outside** and
**Paint Inside**. Sculpt different areas of each bank, try all four tools, cross
the periodic wall seam and side/cap rim, then Undo/Redo.

Paint Inside defaults to the fitted physical editing projection: the inner
geography is presented on the outside for access. **View from inside** explicitly
enters the real inner cavity, pauses painting and permits look/zoom. **Physical
view** returns to the saved editing pose. **Surface map** is the accepted editable
wall-and-disks representation; its marked cuts are view cuts, not world edges.
All views use the same selected bank. Shared brush choices survive side changes,
subject to the existing physical radius limits. Each side retains its camera.

Name, Save, reload, Browse saved maps and Open Map. Both exact banks return, and
painting can continue. Saves remain browser/profile/origin/device local. There
is no server synchronization or owner acceptance implied by automated tests.

## Persistence and safety

Version 11 explicitly stores the immutable capped configuration, centered frame,
inward U reflection, accepted shared detail and two independent little-endian
Float32 banks. Header validation, bounds, identities, lengths and checksum reject
corrupt candidates before replacing the active document. Encoding captures private
metadata and buffers before yielding. Existing versions 1 through 10 keep their
original meaning and are exercised through the mixed library.

Role changes drain accepted input before releasing the old viewport; release
terminates unused worker/preview resources while retaining its authority, cache
and history. Reopening starts new terrain history as with existing cylinders.
Inspection disables painting, previews, cursor outlines and Undo/Redo; Fit/Home
retain its physical cavity eye. Repeated inspection selection preserves the
original editing pose. The new hollow-only region menu closes after selection,
so it does not cover the inspection controls on mobile.

## Verification and limits

The compact [receipt](evidence/hollow-cylinder-editor.json) records 1,257 numerical
tests, typecheck/build, 18 editor/input/configuration browser cases, eight held
painting cases, four strong view/pixel/fallback checks, 14 legacy cylinder/setup
checks and 12 existing sphere v8/v9/v10 cases. Groups overlap. Desktop and Pixel 7
Chromium emulation cover both normal WebGL2 and forced Canvas; this is not physical
device or owner acceptance.

Each held run injected 900 moves over 15 seconds. Chromium dispatched 893 to 900
native moves; changing terrain pixels were observed 53 to 69 times while held.
First observed changes were 313 to 423.9 ms at 100 ms sampling cadence. Release to
coherent display was 34.5 to 49.8 ms. These are separate observations, not a
per-input latency guarantee. Exact full-bank Undo/Redo and the unchanged opposing
bank passed in every run. N256 auto Inside Save/Open measured 80.4/197.2 ms.
Two authority banks plus two palette caches occupy 260,128 bytes at detail 128 and
1,044,512 at 256; histories, workers, GPU and transient/process memory are excluded.

This base checkpoint has no cylinder cuts or map links yet. Their basic physical
implementation is the next authorized checkpoint, before the safe Open Cylinder
assessment. Terrain remains reference-surface relief/color presentation; full
displaced terrain, terrain-aware excavation and free flight remain deferred.
