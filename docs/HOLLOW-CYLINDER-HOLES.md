# Capped hollow-cylinder reference-shell holes

Direct holes now work through the curved wall and either closed end cap. Each is
an independent ThroughHole with two independent mouth identities; it is not a
physical tunnel network or a map link. The normal Atlas host, accepted cylindrical
terrain sessions, four tools, shared history controls and browser-local library
remain in use. Networks and links are the next authorized checkpoint.

## Hands-on review

Create a capped hollow cylinder at http://127.0.0.1:5260/ with outer radius
1,000,000 m, outer length 1,600,000 m, inner radius 800,000 m, inner length
1,200,000 m and detail 128. Keep the target ground at 0 m. In Atlas tools choose
**Cut Hole**, then select a wall point or cap point. Surface map gives access to
all three regions. Adjust Opening width before selecting. The on-map ring follows
the actual cylindrical normal aperture. Review the proposed mouths and confirm
**Create Hole**, or cancel without publication.

Select the hole to resize, move, inspect or remove it. Smaller/Larger controls
also change its independent width. Move keeps its object and both mouth IDs.
Choose **Holes and connections** in Undo scope to replay these transactions; choose
the active terrain bank for brush history. Save, reload, Browse saved maps and
Open Map to restore the exact terrain words, hole and connection journal.

**Paint Inside** remains fitted editing. Inside editing and editable **Surface
map** show mouth markers. **Outside Physical view** and read-only **View from
inside** show the actual subtracted material, rock walls, opposite bank or open
space. Hole sizing controls hide during read-only cavity inspection, as on the
hollow sphere. The opposite bank can be seen through a hole but requires selecting
that bank before painting. Return with Physical view or Surface map. No mode claims a
visible cut volume where it only shows reference markers.

## Actual geometry and safeguards

Wall mouths share their physical angle and centered axial coordinate; the two
banks have different chart v because their lengths differ. Cap mouths share real
XY and their corresponding start/end cap. Each straight normal capsule extends
beyond both reference boundaries, and subtracts from the finite outer cylinder
minus its finite inner cavity. Rays intersect the radial cylinder and axial slab;
cube-face or spherical containment is not used. CPU and GPU use shared generic
capsule intervals and geometry-specific finite-cylinder intervals and normals.
Both selected and opposing display fields use their own radius, length and caps.

The existing GPU renderer adds a full-viewport cut path for the supported physical
views; its ordinary physical/map paths remain. Canvas uses the accepted coherent
cylinder raster with an analytic cut adapter. These read geography; neither owns
terrain. Cut pixels showing rock, void or the other bank are excluded from painting.

At this initial precision, minimum hole radius is
`max(outer radius, outer length) * 1e-5`; maximum is
`min(inner radius * 0.1, minimum material thickness * 0.25)`.
Radial and each end thickness must be at least
`max(outer radius, outer length) * 1e-4`. Wall apertures must clear both cavity rims; cap apertures must fit inside
the inner disk with rim clearance. Unsupported thin or small-cavity cases reject
without changing geometry. Independent cutter bounds cannot overlap. The parent
has at most 48 cutter primitives and a 256 KiB connection representation.

Cuts require exactly 0 m on both banks over conservative interpolation/gradient
support. A derived mask protects this ground through direct, cooperative, worker
and history writes. Entire numerical patches validate before any write. Connection
preview, publication and replay revalidate geometry and support before publishing
words, masks or history. Failed placement, resizing and replay retain prior state.
A worker failure arriving between input events now keeps its real reason when
navigation cancels the failed input, instead of replacing it with Input interruption.

## Persistence and evidence

Version 12 adds validated holes and the exact connection journal. Version 11 stays
strictly featureless, including unknown-field rejection. Same-World upgrades to 12
require identical immutable configuration, resolution and identities. Deleting a
hole retains version 12 and its history; there is no silent downgrade. Versions
1 through 10 retain their established meanings. Checksums cover metadata, objects,
journal and both private little-endian terrain payloads before candidate promotion.

See the compact [verification receipt](evidence/hollow-cylinder-holes.json) for
numerical, browser, native input, real terrain pixel, context-loss, sustained
painting and compatibility results. Pixel 7 evidence uses Chromium emulation,
not a physical device. Technical verification does not imply owner acceptance.
Advanced displaced terrain, excavation through mountains/seabeds, free flight and
the full 3D architecture remain deferred. Natural open ends will not be modeled as
authored holes; their topology is assessed after the capped cylinder's basic
networks and links.

Verification completed with 1,262 numerical tests, typecheck/build, eight hole
workflow cases, eight strong pixel/native cases, four GPU rechecks after the
program split, four final read-only checks, eight sustained painting cases and
four GPU sustained rechecks, 18 legacy compatibility cases, 22 prior cylinder
editor/view cases and 12 sphere cases. Groups overlap. All reported final gates
passed; the receipt preserves the corrected development failures separately.

Current held results combine the four unchanged Canvas cases and the four GPU
rechecks: 891 to 900 native moves from 900 injected over 15 seconds, 53 to 69
changing terrain observations, first observed changes at 313.3 to 505.2 ms
(100 ms observer cadence), and release to coherent display at 34.3 to 325.7 ms.
N256 auto Inside Save/Open measured 348.9/516.3 ms with both exact banks and a real
cap hole. Scripted startup includes navigation, form automation and graphics
preparation; the first post-split case measured 6,000.7 ms. First-use program
preparation still varies by driver. No per-input latency or physical-device
acceptance is inferred. GPU texture accounting retains opposing allocations
when switching back to a reference view; bank/cache byte figures exclude GPU,
histories, workers, transients and process memory.
