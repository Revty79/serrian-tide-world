# Floating Island Worlds

This pass follows the shapes-first scope. Excavation, tunnels, links, arbitrary
displaced terrain and generalized Fragmented Worlds remain separate work.
Technical verification and owner acceptance are separate.

## Physical foundation

`physical-floating-island`, version 1, is a deterministic bounded landmass:
one broad irregular pentagonal plateau, five connected cliff trapezoids and
five tapered underside facets. It is a closed convex material body, with
11 vertices, 20 physical edges and 11 physical faces. The numerical fan has
18 affine triangles and 27 edges; its internal diagonals own shared words.
There are six supported outlines (three rational outlines and their mirrors),
selected deterministically by the persisted integer seed. Width/length are
reference scales for that outline, not an assertion that every variant fills
the complete reference rectangle. Setup and the selected-island panel show
the actual local body bounds in meters. This clarification does not rescale
existing maps or change provider version 1.

Reference width is 10,000 through 1,000,000,000 m, length 0.75–1.5 times width, and
thickness 0.25–0.65 times width. The cliff band occupies 40% of the thickness; the remaining 60% tapers to the tip.
The top, rim and tip are actual physical
surfaces with outward normals. These bounds retain convexity, positive
thickness and a complete connected unfolding without overlapping interiors.
Unit checks cover all outline and aspect-bound combinations. No sphere,
cube, suspended picture or zero-thickness plane is substituted.

## Editing and presentation

Each island uses the accepted indexed Float32 authority, canonical vertex/
edge/interior ownership, certified convex surface routes, connected brushes,
worker scheduling, preview, bounded whole-gesture history and workspace.
Raise and Lower use outward and inward elevation semantics throughout the
closed boundary. Elevations use the existing reference-surface presentation;
this pass does not introduce displaced mesh shaping.

N128 owns 147,458 words and N256 owns 589,826 words per island. A narrowly
qualified display profile admits this topology without increasing unknown
geometry, work, history, display-backing or prepared-patch limits.

The shared polyhedron display cache and presenter supply the accepted cube
palette, interpolated physical gradients, relief, coast coverage, polygon
atlases, incremental epochs, hardware WebGL2 and sharp Canvas fallback.
The initial island starts at 200 m land. Existing maps and older formats keep
their interpretations.

The connected Surface map opens the five lateral joins. Each cliff and its
underside remains attached to the actual plateau edge; all other physical
joins remain available in fitted Physical view. The same intrinsic metric
governs both views. Numerical diagonals never create geographical boundaries.

## Verification and checkpoints

Checkpoint A validates convex closed geometry, winding, physical intervals,
determinism, canonical ownership, certified routes, connected unfolding and
all four tools with exact history. Checkpoint B adds the operational
single-island editor and strict format 31. Checkpoint C covers the independent
component arrangement and is recorded separately when verified.

Heavy browser checks run serially at low priority in installed Chrome.
Targeted numerical checks precede browser pixel, ordinary-input, held-stroke,
worker-fault, graphics-recovery and Save/Open checks. The previous-shape smoke
matrix is run at publication, rather than after every local edit.

Raw evidence, final timings, resource measurements and publication receipts
are added at the verified checkpoints. No physical mobile-device acceptance
is claimed by desktop Chrome or browser emulation.

## Verified single-island checkpoint (A/B)

- 9 numerical/format tests; 40 browser cases: 23 island workflow/pixel/
  performance/recovery, 2 fitted navigation, 2 touch/pen emulation,
  12 previous-family smoke cases and 1 thin/asymmetric island profile.
- TypeScript and production build pass. Existing Vite chunk-size notices remain.
- Hardware: installed Chrome using AMD Radeon RX 6600 ANGLE/D3D11,
  not software WebGL. Forced Canvas is tested separately.
- Standard 1,000 km width/length, 400 km thickness: default radius 25 km,
  200 m strength. Ordinary upper/cliff/underside input-to-visible-pixel p95
  stays below 62 ms across both details/backends in the final matrix.
  The thin asymmetric N256 Canvas profile stays below 72 ms.
- Twenty-second held N256 gestures: GPU p95 29.1 ms, Canvas 31.7 ms;
  both cross two work epochs, report no dropped positions or failures,
  and replay as one exact whole-gesture operation.
- Fitted rotation reaches actual sharp pixels at p95 12.5 ms GPU / 4.7 ms
  Canvas. Canonical words remain unchanged. Touch/pen results are emulated.
- Derived owned cache buffers are approximately 14.3 MB at N128 / 54.9 MB
  at N256 after ordinary edits; GPU fields are 4,792,608 / 19,022,112 bytes.
  Authority is 589,832 / 2,359,304 bytes. Display backing remains bounded.
- Stable terrain GPU/Canvas channel differences are at most 3; checked
  coverage/silhouette violations are zero. Incremental presentations equal
  fresh full presentations at both details. Actual captures were inspected.
- Strict v31 preserves exact canonical words (including signed zero),
  identity, provider, seed, dimensions and detail. Corruption, invalid fields,
  unsupported dimensions, source changes and cancellation fail safely.

The default radius accounts for width, length and cliff depth, and retains
at least three maximum lattice spacings. Very broad user-selected brushes
still use the existing bounded-work failure/prefix-history behavior. No work
or history cap was raised. Formats 21–24 remain reserved.

The first narrow-cliff prototype exceeded the N256 Canvas latency gate.
Its physical proportions were revised before publication; historical diagnostic
logs are retained and are not passing evidence. The final receipt is
[evidence/floating-island-single/receipt.json](evidence/floating-island-single/receipt.json).
Multiple-component placement and World-level perspective are checkpoint C,
not capabilities claimed by this single-island checkpoint.

## Independent component arrangement (checkpoint C)

A parent Floating Islands World owns a stable World identity, selected island,
brush configuration and a list of independent components. Each component has
its own stable island/terrain/surface identities, deterministic geometry,
canonical authority and accepted editing session. Rigid placement is separate:
heading around Y, tilt around X and roll around Z, followed by translation in
meters. Moving or rotating never rewrites terrain. Fitted editing and the
connected map retain local geography; World view shows the actual placement.

Creators can add/name islands, select them by their physical body or component
button, move East/West, North/South and Up/Down with a chosen physical step,
apply orientation, focus/fit, sculpt independently and safely remove/restore
components. Dimensions, detail and outline are chosen when creating each
island. Changing an existing component's geometry/detail/terrain identity in
place is rejected by the store. Add a new component for a different body.

Supported bounds are deliberate:

- One through four live components, at most 1,179,652 canonical words total:
  two N256 islands, four N128 islands, or supported mixed arrangements.
- Widths within eight times one another and component centers within 64 times
  the smallest width. Finite global positions are bounded by 10^12 m per axis.
- Orientation angles from -180 through 180 degrees. All bodies remain closed
  and convex. A guarded separating-axis check uses actual transformed faces
  and edge cross-products, rejecting overlap, contact and uncertain separation.
- Six deterministic outline variants, with the supported dimension bounds
  described above. This is a bounded island provider, not a custom mesh editor.

No surface aliases, brush routes, canonical commits or terrain histories cross
between islands, even when projections overlap. Only the selected island
prepares painting work. Open prepares that island's display cache lazily;
World view prepares the additional caches it actually needs. Camera/placement
changes reuse unchanged terrain resources.

Arrangement Undo/Redo is separate from the selected island's terrain history.
It retains eight arrangement states subject to a 1,769,478-word component
retention bound. Creation, movement, orientation and removal restore stable
component objects and exact geography. Removed components are disposed only
when no live/history state retains them. Normal terrain history/work limits
are unchanged. Histories remain session-only, as in the accepted editors.

### World rendering and navigation

The actual shared polyhedron presenter is extended with an optional scene
pass. Existing fitted/net/cavity callers retain their ordinary paths. Islands
use their existing numerical field, palette, physical gradients and atlases;
only rigid camera transforms, exterior intersections and cross-component depth
are added. GPU uses the accepted four-ray field/color pass and depth testing.
Canvas extends the accepted inverse plane homographies with a shared depth
buffer and actual four-ray coverage along silhouettes/occlusion boundaries.
Prepared plane coefficients keep the coverage picker bounded and avoid
recomputing geometry for each subpixel. There is no alternate terrain engine.

World view supports rotation, pan, zoom, physical selection, Fit World and
Focus selected island through the accepted pointer/touch/pen navigation
controller. The orbit stays outside enclosing material bounds. Placement
translation follows the selected body; an unapplied camera or arrangement
cannot be used for picking against stale pixels. Viewing writes no geography.
Selection stays visible in the toolbar even with the tools panel closed.
Internal numerical diagonals are omitted from map guides.

The shared GPU backing cap remains 1.5x DPR / three million pixels. New island
Canvas presentations use the existing settled policy: at most 1.5 million
pixels on desktop and 650,000 for coarse pointers. Numerical detail remains
independent. World depth/color/owner/boundary buffers have a measured bounded
backing allocation; they are released when leaving the World viewport.

### Complete Save/Open

Format 32 stores the parent, ordered component identities, metadata,
dimensions/seed/detail, placements, selection, supported brush configuration
and exact little-endian canonical Float32 words. One SHA-256 binds the entire
normalized header and payload. Complete validation, arrangement checks and
cooperative restoration precede active-document replacement. Source leases
reject changes during Save. Existing component metadata cannot silently be
replaced, nor may another component reuse an existing component's identities.

Format 31 remains readable with its original physical/numerical meaning.
Opening supplies a deterministic legacy component identity; explicit Save
upgrades that World to format 32. Other versions keep their original decoders,
and 21?24 remain reserved. No existing geography is resampled or clamped.

A fresh-library verification found a catalog enumeration omission in the
single-island checkpoint: its active-session Save/Open passed, but a later
catalog listing rejected the new kind. Checkpoint C fixes that omission and
the analogous existing hollow-decahedron entry through one typed catalog-kind
registry. Verification compares all New World choices with that registry and
opens a v31 island after a complete browser reload before testing the v32
upgrade. Corrupt Open and an attempted existing-component identity/geometry
replacement must retain the active/stored geography exactly. The A/B receipt
remains frozen as historical evidence; its active-session tests did not prove
fresh library discovery.

### Verification status

The final checkpoint receipt records source hashes, raw installed-Chrome
captures, actual output-pixel timings, persistence/recovery results and focused
shared-family regressions. Independent Moller-Trumbore rays through the real
transformed World triangles check the production picking, occlusion and
rendered pixels above, below and through overlapping projections. Stable
terrain differences retain the existing three-channel-level gate, with zero
checked full-coverage/silhouette or picking violations. Whole authority word
sequences are compared before/after viewing.

Technical verification is distinct from owner acceptance. Native touch/pen
input uses browser emulation; no physical mobile-device qualification is
claimed. Excavation, arbitrary mesh displacement/shaping, holes, tunnels,
links, generalized Fragmented Worlds, website integration and deployment are
outside this pass. Fragmented Worlds does not begin automatically.

### Recorded C results

- 26 numerical, format and shared homography/backing-policy tests pass.
- 16 new desktop browser cases pass, plus 2 touch/pen emulation cases,
  12 previous-family smoke cases, 2 legacy cavity pixel cases and 5
  single-island pixel/incremental/painted-graphics-recovery cases. A final
  Canvas UI workflow also passes after the dimension-label clarification.
- TypeScript and production build pass. The existing bundle-size notice
  remains; no full repository suite is claimed.
- Two resident islands: ordinary input-to-visible-pixel p95 at the default
  brush is at most 74.8 ms across upper/cliff/underside and both details/backends.
  Twenty-second N256 held gestures are 29.2 ms GPU / 31.7 ms Canvas p95,
  cross two work epochs and retain one exact whole-gesture history operation.
- Actual sharp World navigation is 29.8 ms GPU / 23.1 ms Canvas p95 from
  trusted pointer input to captured output pixels. Canvas presentation itself
  is 18.9 ms p95 in that run. Viewing preserves both complete word sequences.
- Independent World-triangle ray comparisons above/below/through occlusion
  pass at N128/N256: stable RGB differences stay within 3 levels; checked
  full-coverage, silhouette and picking violations are zero. The actual
  captures were visually inspected.
- Two prepared N256 component caches own 109,595,460 bytes after the workflow;
  the desktop World color/depth/owner/boundary buffers own 23,256,000 bytes.
  GPU numerical fields are 19,022,112 bytes per N256 island. Canonical
  authority is 2,359,304 bytes per N256 island. These are distinct allocations,
  not a claim that cache bytes alone represent total browser memory.
- Four N128 components recover through real WebGL context loss/restoration
  without changing any island's geography. Physical devices remain unqualified.
- A browser reload discovers v31 saves; explicit v32 upgrade preserves metadata
  and words. The store rejects existing-component metadata replacement and
  corrupt Open leaves the active World and its geography intact.

The source and raw-result inventory is frozen in
[evidence/floating-islands/receipt.json](evidence/floating-islands/receipt.json).
Checkpoint A/B is commit `0b59ad24c56ef7663f114bf73cbe63046aed3022`.
Checkpoint C's commit is identified by the delivery message and source hashes;
its receipt does not embed its own circular Git commit hash.
