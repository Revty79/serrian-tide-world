# Universal excavation and tunnel design

Permanent owner requirement, 2026-10-23. This supplements the current
[course correction](ATLAS-PHASE2-COURSE-CORRECTION.md); it does not expand or
restart the Pyramid checkpoint or authorize the complete designer now.

Every applicable World and map architecture must allow eventual creator-designed
holes, tunnels, chambers and underground networks. Solid material is excavatable:
support must eventually include blind passages, wholly internal chambers and
networks, multiple entrances, branches, intersections and vertical levels.
Hollow worlds retain independently editable terrain banks. Fragment networks
cannot cross empty space without real connecting material or an explicit travel
link. Torus, ringworld, polyhedral and exotic adapters use their actual material
boundaries. Purely 2D maps can own surface entrances and underground map links;
physical subtraction requires a genuine volume or thickness model.

The later shared visual Tunnel Network Designer must support manual route
authoring, moving/resizing/removing openings, extending/reshaping/splitting/
connecting/deleting passages, junctions and dead ends, irregular chambers and
rooms, width/height/cross-section, elevation/slope/depth/direction, multiple
levels and entrances, 2D/sectional/3D editing, cross-map/floor/building links,
and continued editing after Save/Open. Automatic routing may assist manual
authoring; it cannot replace it.

Reuse `PhysicalPassage`, material/CSG infrastructure, `LinkedEntrance`, real
geometry providers and validators, shared tools, history and persistence. Keep
geometry mathematics in adapters rather than rebuilding a tunnel editor per
shape. Preserve exact history, atomic validation, terrain identity, compatibility
and existing functionality. Current portal-based graph restrictions are a
limited milestone, not a permanent restriction on future internal networks.

Physical holes, physical passage networks and reciprocal map links remain
distinct cooperating systems. Physical excavation genuinely removes material;
its openings, walls and interiors must be visible with correct camera, clipping,
occlusion, lighting and supported WebGL2/Canvas presentation. A graph or metadata
test alone does not prove usable physical passage rendering.

Finish and verify the already-started Pyramid work, respect the sequencing
correction, then execute Geometry Queues 1, 2 and 3 in their authorized order.
**Stop after Queue 3 for owner review.** The owner and Ember will then review the
inventory and plan coordinated cross-shape excavation. Do not delay these queues
for the full designer. Displaced-terrain excavation, volumetric deformation and
free collision-aware underground exploration remain later true-3D work.

Reference-shell restrictions may remain temporarily when documented. Track
missing capabilities honestly: an explicitly limited geometry milestone can be
accepted, but cannot be described as fully feature-complete while applicable
excavation and manual tunnel design remain missing. No new geometry or expanded
implementation is authorized solely by this permanent design requirement.

**Use what works. Reinvent only when proven unworkable.**
