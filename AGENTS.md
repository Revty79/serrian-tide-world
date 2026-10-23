# Atlas implementation standard

Read [the permanent rendering and editor standard](docs/ATLAS-RENDERING-STANDARD.md)
when changing geometry, rendering or shared editing behavior.

**Use what works. Reinvent only when proven unworkable.** Preserve the accepted
solid sphere, cylinder and cube mechanisms. Hollow and future variants inherit
their terrain presentation, painting, navigation, input/scheduling, history,
Save/Open and Atlas workspace behavior wherever applicable. Keep projection,
intersection, normals, seams, cavities and excavation mathematics in geometry
adapters. Extract shared infrastructure incrementally; avoid a wholesale rewrite.

For rendering work, compare equivalent canonical heights, camera, zoom, detail
and backend. Different initial heights cannot establish visual parity. Require
actual pixel evidence and ordinary painting/navigation responsiveness, including
Canvas fallback and WebGL2. Idle refinement must yield to active editing.

New hollow Worlds default to the shared -100 m blank ocean. The explicit 0 m
reference-shell start remains available for supported holes/tunnels. Never alter
an existing map's geography or a saved format's interpretation to conceal a
display defect. Geometry correctness, visual quality and responsiveness must
all survive a new shape's acceptance review.

The 2026-10-23 course correction requires basic physical holes, physical tunnel
graphs and reciprocal map links for completed applicable 3D shapes. Prior basic
connection deferrals are superseded. Reuse actual material/CSG, connection tools,
history and versioned storage; do not fabricate cylindrical metadata or an
interior terrain bank for a solid. Keep reference-ground restrictions where
displaced excavation is unsupported. A blocked shape does not stop independent
authorized work. See docs/ATLAS-PHASE2-COURSE-CORRECTION.md for the current queue.

Read docs/ATLAS-UNIVERSAL-EXCAVATION.md when changing World/map architecture or
physical connections. All applicable solid, hollow, fragmented and future map
families must accommodate eventual real excavation and manual tunnel design.
This permanent requirement does not expand the current Pyramid checkpoint.
Record limited milestones honestly, retain the authorized geometry sequence,
and stop after Geometry Queue 3 for owner review.
