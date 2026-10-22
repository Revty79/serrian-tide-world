# Capped hollow-cylinder physical networks and map links

The capped cylinder now adds physical tunnel graphs and reciprocal conceptual map
links to the same parent document, accepted cylindrical terrain sessions and Atlas
workspace. Direct wall/cap holes remain independent objects. This checkpoint adds
strict version 13 persistence; versions 11 and 12 retain their earlier meanings.

## Hands-on review

At http://127.0.0.1:5260/ create a capped hollow cylinder with outer radius
1,000,000 m, outer length 1,600,000 m, inner radius 800,000 m, inner length
1,200,000 m and detail 128. In Atlas tools select **Physical tunnels** under
Connection tools, and use a 20,000 m tunnel width.

Choose the entrance on the Outside wall near its middle. Switch to Paint Inside
and Surface map, then choose a separate exit on the end cap, clear of its rim.
Review the actual proposed centers and radii in XY, XZ and YZ projections; inspect
the coordinates and proposed openings. Cancel leaves published geometry unchanged.
**Confirm tunnel change** publishes the checked connected volume.

Select a material junction to preview a chamber, azimuthal/radial/axial branch or
an explicit XYZ position change. Z is a centered reference axis, not gravity or
geographic north. Every geometry change needs preview and confirmation. Additional
openings connect an independently chosen surface position to the selected junction.
Opening relocation preserves its portal, endpoint and first-segment identities;
existing material branches remain. Unsafe edits retain prior geometry/history.

**Inspect tunnel** pauses painting. Select an opening and start inspection. Travel
follows the actual connected centerline, including the normal approach, wall/cap
material junctions and emergence into the cavity or exterior. Each section stops
at its real junction. Select a connected branch, continue, reverse, or use the
distance control. Drag or use two fingers to look/zoom while moving. Home retains
the physical eye. Return to terrain restores the editing pose and brush choices.
There is no free-flight collision system or simulated teleport through rock.

Choose **Map links** for an independent conceptual connection. Pick two local
locations, relocate either anchor, or set explicit external World/map/location
identities. Anchors retain reciprocal target IDs. Follow focuses an available
local location; external destinations give explicit unavailable feedback in this
standalone host. Links remove no material and do not affect brush distances.
Use the Undo scope selector for terrain versus connections, and Save/reload/Open
to continue with the same exact banks and connection journal.

## Shape-specific geometry

The shared graph, sphere/capsule union, transactional history and inspection
workflow are reused. Their containment and routing are cylindrical. Nonportal
balls fit strictly inside the finite outer cylinder and wholly outside the finite
inner cavity. Capsules use whole-segment radial extrema and axial intervals, not
sampled containment or cube boxes. The initial certificate is conservative: some
valid corner diagonals reject rather than approximating an unsafe route.

Each portal is a leaf with an aperture clear of its own rim, centered on its own
reference surface. Its stub follows the actual wall or cap normal into material.
An outer cap entrance may lie beyond the projected inner disk; tunnel endpoints
are independent locations. Wall staging uses the middle material radius. Cap
staging first uses the middle cap thickness, then joins the middle-radius wall.
Vertical sections and bounded angular chords connect those witnesses. Every
proposed primitive passes the same whole-volume certificate before publication.

Tunnel radii respect the World precision floor. Surface apertures are bounded by
wall/end thickness and cavity radius. Branch and chamber dimensions must fit their
complete material volumes and incident segments. The parent supports at most 48
hole/node/segment cutting primitives, eight networks, 128 links and 256 KiB of
connection words. Independent cutting-object bounds cannot overlap; use branches
within one network for connected excavation. Long routes on thin shells reject
when their safely contained subdivision exceeds the budget.

Finite-cylinder reference-shell subtraction, real rock normals and each bank's
own radius/length/display field are shared with the direct-hole checkpoint.
Outside Physical view and read-only inspection show cut volumes. The fitted Inside
editor and Surface map retain editable reference geography with mouth/link markers.
All cuts require protected exactly-zero support on both terrain banks. Sculpted
mountain/seabed excavation and full displaced reconstruction remain deferred.

## Persistence and verification

Version 13 stores validated networks, links, holes and the exact parent connection
journal alongside both private canonical little-endian terrain banks. Version 12
remains holes-only in the current objects and every historical journal state.
Version 11 remains featureless. Removing advanced objects retains the required
format and history; upgrades require the same immutable World geometry, resolution
and identities. Candidate validation, checksum, support and journal checks finish
before active replacement. Failed previews, replay and restoration publish nothing.

The [compact receipt](evidence/hollow-cylinder-connections.json) records numerical,
actual browser/native-input, complete physical travel, real v11/v12 upgrades,
sustained painting and compatibility checks with their limitations. Pixel 7 uses
Chromium emulation. Automated technical gates do not claim owner acceptance,
physical-device acceptance, Production integration or deployment.


Verification completed with 1,268 numerical tests and typecheck/build; eight main
network workflows; 12 complete-guide/native/real-upgrade cases; four independent
native link/history cases; four XYZ preview cases; eight sustained painting cases
with a real nine-primitive wall/cap network; four final complete-guide captures;
and 54 compatibility cases across prior capped editors/holes, normal cylinders,
legacy libraries, spheres and cube physical passages. Groups overlap.

Each sustained run injected 900 moves over 15 seconds. Native dispatch delivered
893 to 900; changing terrain pixels were observed 49 to 64 times while held.
First observed changes were 281.1 to 618.9 ms at 100 ms sampling cadence. Release
to coherent display was 36.7 to 97.8 ms. Exact complete-bank Undo/Redo and the
unchanged opposing bank passed in every case. N256 auto Inside Save/Open measured
892.2/1,047.7 ms, preserving both banks and the actual network.

Counted authority banks, both palette caches, fixed connection words, one connection
journal and derived support masks total 558,692 bytes at detail 128 and 1,441,124
at 256 for this fixture. Terrain histories, GPU/programs, transients, workers,
JS objects and process memory are excluded; this is not total resident memory.
The receipt retains raw heap/display statistics and scripted startup/connection
preparation timings, including driver-dependent first-use graphics work.


## Reproduce from the published checkout

Run `npm.cmd test` and `npm.cmd run build`. The committed
`playwright.hollow-cylinder.config.mjs` discovers all 66 current capped-cylinder
browser cases using the same desktop/Pixel 7 setup. Run it with
`npx.cmd playwright test --config playwright.hollow-cylinder.config.mjs`.
The existing review server is on 5262; `ATLAS_PREVIEW_URL` can select a different
explicit test origin. Browser contexts keep their own local test saves.

Run sustained checks separately, without another browser/performance campaign:
set PowerShell `$env:CYLINDER_LONG_NETWORKS='1'`, then run
`npx.cmd playwright test --config playwright.hollow-cylinder-long.config.mjs`.
`CYLINDER_LONG_OUTPUT` and `HOLLOW_CYLINDER_LONG_REPORT` select explicit artifact
paths. The committed tests author their actual network through normal controls.
Historical legacy suites should run from an isolated working directory so their
old relative evidence paths cannot replace published historical artifacts.
