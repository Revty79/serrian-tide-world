# Hollow-world development: authorized sequence and reuse inventory

Owner authorization, 2026-10-21: Hollow Sphere → capped Hollow Cylinder → Open
Cylinder. Cube-I is technically stable at `6d4b129`; owner acceptance remains
pending. Each verified milestone is committed and pushed to standalone `main`.
No website, database, Docker, Production, pyramids, free-roaming collision or full
displaced-terrain implementation belongs to this assignment.

**Latest scope update (owner/Ember, 2026-10-21):** the earlier deferral of basic
reference-shell holes, tunnels and map links is superseded. Revised sequence:
finish the sphere editor and v8 checkpoint; sphere radial holes; sphere physical
tunnel graphs and reciprocal map links; capped hollow cylinder geometry/editor;
its basic connections; then open-cylinder topology and applicable features.
Each item requires its own tested stable checkpoint. New round-world connections
are still pending at the sphere-editor checkpoint; existing cube features work.
Displaced mountain/seabed excavation and a future full 3D engine remain deferred.

## Pass 1: architecture inspected before implementation

| Existing system | Reuse | Geometry-specific addition |
| --- | --- | --- |
| `surfaces/cube-sphere.ts`, `terrain/spherical.ts` | Equiangular spherical directions, true great-circle metric, canonical face/edge/corner ownership, poles, neighbor connectivity | Two radii and identities under one parent; inward orientation and safe radial height envelope |
| `spherical-brush.ts`, `SphericalSession`, `SphericalHistory`, spherical workers | Four tools, geodesic spacing, complete gesture history, cooperative/worker preparation, source leases, display epochs | Optional prepublication height validator; no new brush arithmetic or worker manager |
| `SphericalViewport`, spherical view/field/WebGL/Canvas | Navigation, Net joins, direct input, palette and elevation interpolation, graphics recovery | Perspective inspection from the cavity center, inward relief, shared brush choices and role selection |
| `surfaces/cylinder.ts`, cylinder distance/path/brush/session | Periodic wall, polar caps, rim aliases, global routes, exact history and worker lifecycle | Nested closed cylinders; inner normal/orientation and dimensions. Open rims need a separate topology assessment |
| `HollowCubeEditor` and parent document | One parent identity, two independent authorities/sessions, side switch after draining, one Atlas chrome | A spherical/cylindrical parent adapter; cube CSG and cube numerical brushes are not reused for round worlds |
| `App`, `NewWorldDialog`, `LocalMapStore` | One workspace, atomic candidate replacement, guarded Save/Open, unchanged browser-local catalog | New shape choices and strictly versioned parent records, preserving v1–v7 |

The accepted sphere display is reference-surface rendering with elevation colors
and gradient relief. Cavity inspection must have its own physical projection;
reversing a texture is insufficient. Full displaced topography remains deferred.
The existing cylinder representation is a closed surface with two disk caps;
removing cap pixels cannot implement open annular ends. Assess that topology only
after the preceding capped hollow editor is stable.

## Delivery progress

- Pass 1 inventory complete.
- Pass 2 hollow-sphere numerical foundation verified: two independent accepted
  canonical spherical banks, opposite physical normals, inward chart adapter,
  radius-specific geodesics and conservative radial elevation bounds.
- Pass 3 hollow-sphere editor/views/v8 is technically verified: 1,226 numerical,
  typecheck/build, 14 full workflow/inspection browser cases, eight final targeted
  inspection checks, eight sustained-painting cases, 62 cube preservation cases,
  and two corrected setup compatibility checks. The earlier 42 passing legacy
  cases cover solid sphere/cylinder/cube and flat/wrapped editing/Save/Open.
  Sphere connections are next; cylinders have not yet been implemented.
  [Compact receipt](evidence/hollow-sphere-editor.json).

Foundation validation: **1,219 numerical tests**, typecheck/build and **28 existing
sphere browser cases** (24 initial passes plus four matching fresh-server passes).
The four initial failures reproduced only on the long-running HMR server: its
fixture HTML referenced a timestamped entry while tests dynamically imported the
same fixture without a timestamp, recreating its World. The unchanged Cube-I
baseline and fresh current server both passed all four cases. No assertions or
editor behavior were weakened to address this environment issue. Future browser
milestones use a fresh owned server. Historical evidence remains untouched.

The small shared numerical extension accepts an optional host elevation policy.
Both cooperative and worker paths validate the entire prepared dab against that
policy before the first authoritative write. Ordinary sphere metadata, samples,
brush mathematics, worker ownership and saved interpretations are unchanged.
Supported new shell dimensions: 1 m ≤ inner radius < outer radius ≤ 10¹² m;
thickness ≥ max(0.001 m, outer radius × 10⁻⁹). Lowering is limited to one quarter
of shell thickness per side, inner positive heights to half the inner radius and
outer positive heights to the outer radius. These are reserved radial envelopes,
not full displaced collision or excavation certificates. Banks begin at 0 m.

No owner acceptance is inferred. Final hands-on instructions and exact validation
receipts will be added at verified milestones. Stop expanding if an architectural
blocker cannot be handled by small compatible adapters.

## Hollow Sphere: supported experience

New World / Map → Hollow sphere world. Use outer radius 1,000,000 m and inner
radius 800,000 m for a first trial. N128 and N256 each give two independent
`6N²+2` canonical Float32 banks. Both start at 0 m. Paint Outside / Paint Inside
are in the ordinary Atlas tools; chosen tool, physical radius, strength, intensity
and target are shared. If a requested radius falls outside the selected side's
existing 0.005–0.2 reference-radius range, drawing remains disabled with a clear
settings message until adjusted. Heights are never inverted or silently clamped.

Outside retains the accepted Globe. Paint Inside defaults to a fitted, rotatable
editing overview of its independent spherical bank. This is a presentation
adapter: picking resolves actual inner geography; normals, identities and height
signs remain physical. Globe and Six-face net are editable.

View from inside explicitly selects a perspective camera at the cavity center.
It is read-only: drag to look and zoom to narrow the field of view. Choose Globe
or Six-face net to resume editing with the same brush settings and geography.
The immersive view covers the viewport because the creator is inside the cavity;
it never activates automatically on Paint Inside. No free flight or collision
is implied. The center projection has numerical round-trip and Canvas-ray tests.

The existing hollow cube keeps its accepted far-wall editing view and unfolded
map. Its separate cavity inspection reuses the existing physical passage renderer,
including holes and tunnel cuts, at a fixed center position. Return to editing
restores the prior camera. No cube brush, topology or save interpretation changes.

Four spherical brushes, physical geodesic spacing, worker preparation, exact
whole-gesture session history, display epochs, WebGL2/Canvas and navigation reuse
the accepted spherical implementation. Only the selected viewport owns input/GPU
resources; both prepared sessions and their fields remain available for switching.
Positive inside heights rise toward the cavity; positive outside heights rise
away from the World. The declared radial envelope reserves shell clearance.

Version **8** saves one parent identity, complete immutable spherical geometry,
two distinct surface/terrain identities, both exact little-endian canonical banks,
selected role and checksum. Strict fields, sizes, supported resolutions, dates,
finite heights, per-side bounds and checksum all pass before a candidate is
prepared and atomically promoted through the existing App/store workflow. No
historical save is silently converted. v1–v7 retain their meanings. Terrain
histories remain session-only, as in the existing spherical editor; after reopen
new gestures have fresh exact Undo/Redo.

Hands-on: draw different mountains on both sides, rotate and zoom, draw across a
Net join, Undo/Redo each side separately, Save, reload, Browse saved maps and Open.
Both geographies and the selected side must return exactly; continue all four
tools. Test Canvas fallback if desired. Unsupported dimensions/height proposals
fail clearly while retaining the current World. Automated browser coverage uses
desktop and Pixel 7 emulation, not a physical phone.

## Permanent connection requirements

Ember's 2026-10-21 clarification establishes this three-view design contract for
all compatible hollow shapes: fitted inside editing by default, separate read-only
cavity inspection, and a geometry-specific editable unfolded map. All views use
the same authoritative banks. Future hollow shapes must follow it.

Holes are direct physical breaches between corresponding surfaces. Tunnels are
independently designed physical passages with branches/chambers and separate
entrances/exits. Reciprocal map links connect distinct locations/maps/Worlds
without inherently excavating material. These remain distinct permanent contracts.
The cube's accepted v6/v7 identities, history and functionality are preserved.

Sphere follow-up needs radial mouth correspondence, spherical chart adapters,
physical shell intersection/clearance, opening-aware picking/rendering and guarded
parent connection records. Cylinder follow-up additionally needs wall/cap/rim
correspondence and axial versus radial shell thickness. Open annular rims must not
be confused with excavated holes. Map links need role-aware canonical anchors,
reciprocal identity validation and unresolved-destination behavior on each shape.
The revised assignment now requires basic physical reference-shell openings,
passages and links. Round shapes must supply their own radial/axial containment,
portal and shell-ray mathematics while sharing capsule cuts, passage graphs,
transactional history and authoring patterns. Unsupported configurations reject
without terrain/history mutation. Fake openings and teleport tunnels remain
unacceptable. Full displaced-material excavation remains a separate future phase.

## Sphere-editor checkpoint validation and performance

The eight sustained tests each deliver 900 native input moves over 15 seconds,
N128/N256, both sides, WebGL2 and Canvas. Terrain pixels changed while held;
each whole gesture Undo/Redo restored exact words and left the other bank intact.
Observed first changed pixels: 72.4-137.4 ms (100 ms observer cadence).
Release to coherent display: 26.3-247.5 ms. Native delivered events: 885-900,
with Chromium coalescing explicitly distinguished from the 900 injected moves.
These are ordinary painting checks, not the extreme synthetic stress gate.

Observed two-bank startup: N128 1.26-1.87 s; N256 3.44-3.68 s. N256 WebGL2
inside Save took 100.2 ms and reopen 3.06 s, with exact hashes on both sides.
Retained authorities plus two prepared display caches: N128 16,652,912 bytes;
N256 66,335,344 bytes. These figures exclude history, active GPU/canvas resources,
transient snapshots, workers and process/driver overhead. No total-process or
per-input-first-pixel latency claim is made. The compact receipt records every
case and the bounds of the timing evidence. Screenshots show the fitted editor
on desktop, Canvas and mobile emulation.
