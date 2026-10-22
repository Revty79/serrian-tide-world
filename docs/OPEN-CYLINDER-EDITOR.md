# Open Cylinder: operational Atlas editor and basic connections

This completes the operational Open Cylinder follow-up to the owner-approved
[hollow coastline correction](HOLLOW-WORLD-VISUAL-POLISH.md) and the published
[connected numerical foundation](OPEN-CYLINDER-NUMERICAL-FOUNDATION.md). Technical
verification and owner acceptance are separate. Stop here for Ember's review
and the owner's hands-on approval; pyramids are not part of this delivery.

## Create and edit

In the normal Atlas editor, choose **New World / Map → Open cylinder world**.
The supported configuration has **both ends open**, with explicit outer radius,
inner radius and one common axial length. The default example is Ro=1,000,000 m,
Ri=800,000 m and L=1,600,000 m. Detail profiles are N64/N128/N256.

New Worlds default to **Blank ocean (-100 m)**, like the accepted solid/hollow
families. **Reference shell (0 m)** is the explicit start for basic excavation.
Ocean initialization requires at least 400 m of radial and axial clearance;
unsupported inputs reject rather than changing their values. Existing geography
and v1-v13 save interpretations are unchanged.

**Paint Outside** and **Paint Inside** select editing scope and retain separate
cameras and shared brush settings. Walls have independent numerical geography;
the joining annuli and physical creases are genuinely shared. Raise, Lower,
Smooth and Flatten use the accepted kernels, physical spacing, transaction,
history and input processing. Mouse/pen/one-finger drawing, two-contact navigation,
rotation, pan, zoom, fitting, selection and region centering use the common
workspace. Occluded or unselected physical samples reject atomically; the full
connected Surface map can edit the whole boundary.

The three views are:

| View | Behavior |
| --- | --- |
| Physical view | Fitted, rotatable and paintable. Inside uses the approved fitted presentation of interior geography. |
| View from inside | Separate actual free-volume camera. Looking/zooming remain available; painting and toolbar/keyboard Undo/Redo pause. Returning restores the editing pose and brush choices. |
| Surface map | One editable strip around the actual cyclic meridian: outer wall, end annulus, inner wall and start annulus. Internal joins are real physical creases; dashed periodic cuts require lifting and restarting. |

There are no filled disk caps or collapsed annular centers. Natural open ends
are empty reference material, not authored hole objects. The fitted Inside view
is an editing projection; immersive inspection and physical cuts use the actual
annular volume.

## Shared implementation, geometry adapters

This extends the accepted cylinder presentation and editor rather than adding
a separate editor engine. Closed cylinder public wrappers, worker source
metadata and capacities remain in place.

| Accepted mechanism now reused | Shared implementation | Geometry adapter |
| --- | --- | --- |
| Shape-preserving elevation reconstruction, palette and relief | `terrain-hermite.ts`, accepted cylindrical field/color GLSL and elevation palette | Open wall row orientation and annular radial span |
| Coherent Canvas field, coverage and progressive output | `coherent-terrain-raster.ts`, common backing/refinement policy | True four-patch intersections and physical rock hits |
| GPU resources, Float32 textures, field/color/coast pass and cut intervals | `surface-webgl.ts`, `cylindrical-terrain-glsl.ts`, excavation interval GLSL and accepted cut builder | Actual annular boundary mesh, field addresses, fitted inversion and CSG hit mapping |
| Cache, ordered work, commit observer, preview, history and draining | `IndexedDisplayCache`, `ConnectedPreviewSession`, existing connected numerical/history cores | Open candidates, certified metrics, paths and visibility |
| Pointer/touch/pen arbitration, camera commands, frame budgets and editor chrome | `ConnectedWorkspace`, existing surface input adapter | Projection, hit testing, annular map joins, physical eye validation |
| Placement/review/confirmation, hole/tunnel/link controls and bounded graph travel | `PhysicalHoleTools`, `PhysicalTunnelTools`, `PhysicalLinkTools`, `PhysicalPassageGuide` | Annular material containment, normal stubs and connection coordinate conversion |
| Save lifecycle and local transactions | Existing Atlas host, LocalMapStore, checksum/cooperative work and connection journal | New strict v14 representation |

The accepted closed-cylinder shader is byte-identical after extraction. Five
closed-cylinder Canvas scenes are byte-identical against the published baseline.
Closed wrapper browser regressions exercise the actual shared implementation.
The Open field is compared numerically with accepted solid-cylinder wall fields;
actual Open CPU/GPU pixels are compared at equivalent backing density.

Optional Open GPU compilation uses the shared asynchronous preparation helper
and the [Khronos parallel-compilation contract](https://registry.khronos.org/webgl/extensions/KHR_parallel_shader_compile/).
Canvas remains editable while compilation is pending. Missing extension, failed
linking, context loss and disposal have explicit Canvas/lifetime paths. This does
not replace the accepted solid renderer's compiler or require a device extension
for editing.

Canvas keeps immediate coherent input display and cancels expendable refinement
during drawing/draining. Settled detail is bounded at 1.5 million pixels on
desktop or 650,000 for coarse-pointer input. Numerical resolution and backing
resolution remain separate. No canonical words are changed by viewing.

## Physical and conceptual connections

Use **Connection tools** in the normal Atlas panel. The accepted preview and
confirmation workflow is shared with the capped cylinder.

* Direct curved-wall holes align opposite mouths along the actual material
  normal. Width, movement, removal, object/mouth identity and exact connection
  Undo/Redo are retained. A natural end is never converted to an artificial hole.
* Physical networks use independently selected wall or annular-rim entrances,
  normal stubs and complete contained balls/capsules. Branches, chambers, junction
  coordinates, additional/relocated openings and removal are supported within
  the bounded basic feature set. Graph sections are continuous physical volume.
* Guided inspection follows real connected centerlines, stops at junctions,
  supports connected branches, reversal and emergence, and restores editing.
  It does not provide free flight.
* Reciprocal map links retain independent anchor identities. Local follow and
  relocation work; external destination identifiers persist for the eventual
  host. Links neither remove material nor shorten physical routes.

The numerical annular prototype supplies material mathematics through transient
oriented charts. Those chart labels are never terrain identities, extra banks,
saved surfaces or closed-cylinder worker providers. The operational World has
one actual connected surface and one parent elevation authority. Passage node
coordinates use centered Z; terrain positions use the explicit intrinsic
oriented-meridian charts with physical Z from 0 to L. v14 declares both frames.

Reference-shell excavation requires support at **exactly 0 m**, including the
interpolation/gradient neighborhood. One derived parent mask protects this ground.
Validation and revision checks complete before any geometry/history publication;
nonlevel ground, overlap, containment, precision and primitive-limit failures
retain the prior World. The existing 48-cutter and bounded journal policies remain.
Complete displaced-terrain excavation and the full Tunnel Network Designer remain
deferred.

## Save/Open and safety

**Format v14** stores the full connected parent Float32 words in canonical
little-endian order, actual identities/dimensions/detail/ownership, selected
scope, physical/conceptual connections and their complete bounded word journal.
Its strict header declares the annular representation, intrinsic terrain frame
and centered passage frame. Checksum coverage includes metadata and payload.

Unsupported versions, extra fields, foreign identity, fake caps, wrong ownership
or frames, invalid dimensions/counts/values, forged journals and corrupt checksums
reject before replacing the active document. Local geometry identity cannot be
silently overwritten. Heightmap/catalog writes remain one atomic local transaction.
Failed Save retains the editor; failed Open retains the current World.

Terrain gesture history remains runtime-only, as in the accepted cylindrical
editor. Reopened terrain has exact saved words and starts a fresh gesture history;
new strokes replay exactly. Connection Undo/Redo is persisted and restored.

Small-dimension cases were hardened before the first v14 publication:
brush controls keep a usable proven radius interval on thin reference shells;
negative height clearance respects both radial thickness and axial separation
of the two rims (`-min(T,L)/4`). Transient material chart selection uses actual
radius at midpoint roundoff, while canonical terrain ownership remains unchanged.
Tests cover 400 annular midpoint cases over broad radius ratios and repeatable
canonical connection words.

Component arrays are bounded before chart conversion, and converted validated
objects retain the accepted deep immutability contract. Malformed lists cannot
trigger oversized conversion work, and published objects cannot drift from their
cached cut volume or connection journal through in-place mutation.

## Verification receipt

The [machine-readable receipt](evidence/open-cylinder-editor.json) records the
source fingerprint, exact suite counts, raw pixel/timing observations and selected
actual captures. Reproduce with the committed Playwright configurations and
normal numerical/build scripts. The standalone renderer fixtures do not substitute
for normal editor workflows.

| Verification | Result |
| --- | --- |
| Full numerical/unit suite and production build | 1,334 passed; build passed |
| Normal Open editor, including failure/recovery and v14 workflows | 24 desktop/mobile cases passed |
| Additional substantial painted-coastline presentations | 8 passed |
| Final connection validation/immutability and persistence confirmation | 3 normal-browser cases passed; full unit suite revalidated |
| Existing sphere/cube/cylinder solid and hollow editors | All 68 distinct cases covered, including corrected guide rechecks below |
| Capped hole/network/link controls after extraction | 12 desktop/mobile cases passed |
| Matched solid/hollow output pixels | 12 cases, 24 geography proofs at -100 m and 0 m |
| Actual Open CPU versus hardware GPU pixels | 12 N128/N256 scenes, including natural axial void and physical cut |
| Ordinary sustained drawing, run in isolation | 8 Open and 8 capped cases passed original thresholds |

The first legacy run had 67 passes and one test-control race: a short passage
leg finished while the mobile tools panel scrolled, changing Pause into disabled
Travel before Playwright clicked. The helper now conditionally operates the
persistent control atomically. All 12 affected cylinder/sphere guide variants
passed rechecks with their camera, containment, return-pose and exact-word
assertions unchanged. The receipt retains the original failed report and the
separate recovery evidence; this was a test-only correction.

Open sustained cases delivered 894-900 of 900 injected moves, with 70-77 actual
changing-pixel captures during each 15-second hold. First observed changes were
295-363 ms; coherent release took 46-141 ms. Every case retained one exact
gesture and left the opposing wall untouched. These observations are distinct
from per-input GPU completion or photon latency.

Desktop Chromium and Pixel 7 emulation qualify browser behavior; neither is
physical-device evidence or owner acceptance.

The bounded certified path set remains explicit. Ordinary brush radii are strictly
below `min(0.24*min(T,L), 0.2*Ri)`. Unsupported far transitions, precision or work
limits reject with an exact undoable committed prefix. Arbitrary far paths,
additional end configurations, high-resolution tiled worlds, site integration,
hosting/Production and subsequent geometries are not claimed.
