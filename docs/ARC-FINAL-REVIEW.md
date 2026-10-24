# Arc Worlds final technical review

## Published checkpoints

- A: `9a57fb9de0f3f91f8bdefbd24177ca06f9e3518b` — physical construction,
  canonical ownership and focused foundation verification.
- B: `0fa721be31d5443416a1f364cd7ad9591fb79144` — operational Atlas editor, rendering, connected brushes,
  exact history, format 38 and default N128/N256 browser qualification.
- C: the commit containing this review and `docs/evidence/arc-complete/receipt.json`
  — creator variation, near-closed isolation, upper/lower joins, recovery,
  emulated input and relevant prior-family regressions. The final delivery
  response records its exact SHA without a self-referential source hash.

Each checkpoint freezes executed source and raw evidence separately. Independent
Git-blob verification checks those recorded hashes at their own committed trees,
including earlier Crescent/Horseshoe receipts. The excavation recovery branch
remains `35f7f5d34edf861c33c5eb4decad92d41664c749` locally and remotely.

## Physical model, configuration and topology

**Arc World** is a bounded annular-sector extrusion, generation 1 of
`physical-prismatic-arc`. Center radius is `Scale/(2*Curvature)`; independent
span, body width and thickness define the real reference solid. Its constant
generating radial width gives genuine inner/outer boundaries, upper/underside geography and
two positive-width closed terminal walls. Explicit beveled ends narrow only
their terminal collars to 75% width. There are no straight arms, tapered belly,
hidden ring sector or periodic end aliases.

Supported creation: Scale 100,000–1,000,000,000 m; Curvature 0.8–1.6; Span
30–358 degrees; Width 8–25% of Scale; Thickness 20–60% of Width; flat or beveled
ends; N128/N256 equivalent numerical detail. Dimensions are fixed after creation.
Scale is a physical unit rather than a maximum bounding-box promise. Default:
2,000,000 m, Curvature 1, Span 220 degrees, Width 20%, Thickness 10%, flat ends.
Six normal UI/backend cases cover minimum thin short beveled, long narrow and
maximum-scale broad near-closed profiles; invalid creation retains the World.

The actual reference is faceted: 30 longitudinal intervals, 124 vertices,
122 physical polygons, 244 numerical triangles and 366 numerical edges; Euler 2.
All numerical edges have two opposite incidences. True cap/strip/wall seams share
canonical words, while distinct ends and separated upper/lower locations do not.
Area is `2*footprintArea + perimeter*Thickness`; volume is
`footprintArea*Thickness`. The generating circle has length `r*angle`; actual
equal-angle facet lengths are `2*r*sin(deltaAngle/2)`. Implemented metrics use
the real vertices and affine chart frames, preserving distinct inner/outer travel.
Width is the generating-radius/vertex separation. Actual perpendicular facet
width is `Width*cos(deltaAngle/2)`; straight inner facets need not have the same
minimum radius as their generating vertices. No ideal-circle metric substitutes
for the actual physical reference.

## Connected distance, input and reuse

The accepted shared prism router combines exact-sign footprint visibility,
interval Dijkstra cap paths, actual wall arclength and certified unfolded
hinge/cone/saddle routes. Ambient distance only supplies lower bounds. Remote
wall requests outside its certified domain fail explicitly; ordinary native
input subdivides within the established brush/thickness bounds. This retains
the existing exact failed-prefix history behavior without inventing shortcuts.

A cap edge now honors its real incident-wall alias for an exact planar-wall
route. Arc's optional outward-interval cut bound uses the real material crossing
at z=0, x>=the central inner vertex. Any path between separated end neighborhoods
must make the corresponding total x variation. It prevents false end-gap
shortcuts and overconservative local escape rejection. Other prism families
retain their prior bounds; physical construction and saved interpretation stay
intact. The proof and initial diagnostic failures are in [Arc Worlds](ARC-WORLDS.md).

The engine remains the accepted triangular authority, field/physical gradients,
sharp polygon atlas, palette/relief, four-quarter-pixel GPU shader, ordered Canvas
walls and cap silhouette, dirty journals, four connected tools, worker protocol,
host-authorized commits, scheduling, previews, ConnectedWorkspace and Atlas
lifecycle. Arc provides narrow geometry, binding and persistence adapters.
No alternate paint field, hidden render material or global resource increase.

The broad short profile exposed one faint Canvas antialias pixel outside a
thin/sheared atlas clip. The shared presenter now reuses its existing exact
physical union path as a final destination-in mask. It bounds real material
coverage without another buffer, expanded geometry or altered terrain. All 44
pixel views use that final source, and both complete Canvas workflows were
repeated. Hardware workflow code and geometry remained unchanged.

Focused numerical checks: **78/78**, including 51 current Horseshoe/Crescent
regressions. A separate 70-digit Decimal reference encloses all **376** cone/apex
certificates, including large near-closed endpoint neighborhoods. Optimized
visibility agrees with original full-triangle rays in **48,800** comparisons.
Native browser gesture fixtures round-trip all requested physical points.

## Resolution, limits and measured pixels

N128/N256 equivalent uses n32/n64 subdivisions per chart: `122*n*n+2` gives
124,930 / 499,714 canonical Float32 words, 499,720 / 1,998,856 authority bytes.
New Worlds start at -100 m; elevation clearance is +/-Thickness/8. Capacity is
qualified only for this exact provider/version/topology/detail. Existing history,
work, input and desktop/coarse display limits remain unchanged: Canvas 1.5M
desktop / 650k coarse pixels; GPU 3M pixels. Brush radius stays within the shared
physical bound, less than 24% of thickness.

Installed Chrome hardware is ANGLE / AMD Radeon RX 6600. Browser workloads run
serially with the existing BelowNormal runner, one worker and zero retries.
Actual changed-pixel capture, rather than scheduling or mouse timestamps alone,
measures ordinary four-second regions and 15-second held map strokes:

| Profile | Worst regional p95 ms | Held p95 ms | Worst first pixels ms |
| --- | ---: | ---: | ---: |
| n128-auto | 40.7 | 29.9 | 59.4 |
| n128-canvas | 46.3 | 40.5 | 80.7 |
| n256-auto | 39.7 | 43.2 | 74.3 |
| n256-canvas | 52.4 | 77.7 | 74.7 |

All remain below ordinary 125 ms, held 100 ms and first pixels 1,000 ms.
Eight upper/lower cap/wall joins per backend have worst p95 **64.9 ms**;
near-closed gap painting **42.8 ms**. Actual navigation p95 is
**7.1 ms WebGL2 / 31.4 ms Canvas**,
below 150 ms, while exact geography/history remain unchanged. Pan World,
overview, focus, map views, wheel zoom and Fit arc also pass.

**44 equivalent pixel views** cover N128/N256 default and short/near-closed
variants. Both backends use identical canonical words, camera, zoom, detail and
palette. Maximum stable GPU/Canvas channel difference is
**3**, maximum independent-field difference
**3** (limit 3). There are zero coverage,
outside-silhouette, numerical-diagonal or coplanar-strip-seam violations. Existing
two-texel coast support remains explicit. Initial wide/high-frequency fixture
coverage failures are preserved separately; final terrain bands and framing
meet every original coverage threshold. The application did not change for them.
Six-region dirty field, every polygon atlas and both backends equal a fresh
reconstruction exactly at both details. Graphics loss/restoration keeps the
current painted epoch and a usable Canvas fallback.

## History, persistence, recovery and regressions

Four detail/backend workflows exercise ten physical regions and all four tools:
160 gestures, exact whole-gesture Undo/Redo, no discarded accepted input and
continued editing after normal Save/Open. Additional joins cover upper and
underside walls, terminal transitions and the central void. A continuous 358-degree
cap gesture traverses all 30 intervals as one undoable operation. Nearby terminal
words remain independent even when they lie inside an ambient brush radius.

Fresh allocated format **38** checks exact schema keys, provider/generation,
dimensions and derived construction, three identities, topology, detail, finite
physical limits, editor state and SHA-256 header/payload. Encoding/reopening
preserves every Float32 word including -0; camera/tool/navigation also round-trip.
Cooperative Save notices authority changes. Corrupt Open and incompatible saved
replacement preserve the active World. Undo history starts fresh after Open, as
in the accepted family. Formats 21–24 remain reserved; old records retain their
original interpretation.

Worker protocol faults preserve exact undoable/redoable failed prefixes and a
fresh worker stroke recovers on both backends. Trusted CDP touch/pen and two-finger
navigation pass on both backends at desktop coarse and phone-emulated viewports.
These are emulated input proofs, not physical-device performance measurements.
The first phone fixture reused a fixed 25-pixel desktop pen offset and crossed
outside the real Arc; the existing cut guard correctly discarded pending input.
Its original fixture, report, screenshot and trace are retained. Final pen
endpoints project interior physical positions after recentering. Both desktop
and phone cases were repeated, and the fixture now explicitly checks that
two-finger navigation changes the view. No application change was needed.

The dedicated regression config runs **14 affected/representative cases**:
five Horseshoe, four Crescent, one Ringworld, two Torus and two Cylinder, including
real pixels, joins, reconstruction, input latency, history and Save/Open. Full
historical browser suites were not repeated. TypeScript and production build
pass; application/dependency source remains unchanged from verified B.

## Limits and remaining owner acceptance

This is the documented fixed faceted reference, with finite elevation clearance
and the stated certified local non-cap metric domain. Full material displacement,
hollow variants, arbitrary-height excavation, holes, tunnels, links, unrestricted
custom shaping and collision-aware free exploration remain deferred. Existing
bounded coast reconstruction and the large-main-chunk build advisory remain.
The inherited outside-map readout can still use generic cylinder wording;
that minor shared presentation cleanup is deferred.

Owner acceptance should inspect the Arc body, real terminal faces and span;
paint all major surfaces and joins; try short/long/near-closed dimensions; navigate
physical/maps; and Save/Open on the owner's actual target devices. Technical
qualification does not substitute for that review or physical-device latency.
This pass ends at Arc. No next shape, excavation, website integration, deployment,
hosting or database changes are included.
