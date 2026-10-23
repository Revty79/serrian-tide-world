# Atlas implementation standard

Owner direction of 2026-10-23 now prioritizes finishing the queued shapes.
The active application was restored to the 07:30 checkpoint `0b3f038`.
Do not resume the paused new holes, tunnels or links work as part of shape
completion. Arbitrary-height/depth excavation is a later shared pass.
See [the restored baseline and current scope](docs/ATLAS-SHAPES-FIRST-2026-10-23.md).

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
