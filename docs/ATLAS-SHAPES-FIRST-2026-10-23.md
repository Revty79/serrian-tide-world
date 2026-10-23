# Restored morning baseline and shapes-first scope

The owner selected `0b3f038` (2026-10-23 07:30 MDT), retaining the Octahedron
multi-face painting correction. Restoration commit `23d9a1c` has exactly that
Git tree. This subsequent documentation update changes no application code.

The owner reported that Pyramid hole/tunnel attempts failed and prevented a
return to painting. Later excavation work is withdrawn from the active editor;
the published technical checks did not establish owner acceptance.

Finish the already-queued shapes using the accepted painting, rendering,
navigation, history and persistence systems. Holes, tunnels and links are a
later shared pass, including operation at arbitrary terrain heights and depths.
This supersedes the earlier course-correction requirement to complete each
polyhedron's basic connections before progressing to the next shape. It does
not authorize new unqueued geometry or expansion of the full Tunnel Designer.

Later work remains on GitHub branch
`recovery/excavation-paused-2026-10-23`, commit `35f7f5d34edf861c33c5eb4decad92d41664c749`.
Its parent `e92de38` preserves published Pyramid work; the branch also preserves
unfinished Tetrahedron integration, tests and the pause note. It is an unfinished
recovery checkpoint, not a verified release or an owner-accepted implementation.
Published history was retained; main was restored with a new forward commit.

Restoration verification: exact tree comparison, TypeScript/build, and four
installed-Chrome N128 normal workflows: Solid/Hollow Pyramid on WebGL2 and
forced Canvas. They cover ordinary painting, four tools, eight joins, independent
hollow banks, inspection/return, exact Undo/Redo and legacy v15/v16 Save/Open.
No new full-suite run or acceptance of every shape is claimed.

No user map storage was modified by this source restoration. Saves written by
later excavation versions require the recovery code; the older baseline does
not gain support for those versions. The Git recovery branch preserves source,
tests and tracked evidence, not private IndexedDB map data.
