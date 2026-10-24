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
selected deterministically by the persisted integer seed.

Width is 10,000 through 1,000,000,000 m, length 0.75–1.5 times width, and
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
