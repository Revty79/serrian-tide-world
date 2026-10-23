# Operational Solid Pyramid checkpoint

The normal Atlas New World / Map selector now creates a physical square-based
pyramid, with configurable base width, height and N128/N256 numerical detail.
It uses the existing Atlas host and connected workspace, input controller,
cooperative brush executor, worker proposal/ACK transport, numerical history,
local catalog and atomic persistence transaction. Five real face charts adapt
those mechanisms; they do not represent a cube or disconnected paintings.

## Presentation and interaction

The accepted cube's numerical field, palette, oriented physical-slope relief,
four-ray WebGL presentation and sharp 2N+1 Canvas face atlas are the reference
mechanisms. The common CPU color function was extracted without changing cube
arithmetic. Pyramid adapters supply actual triangle coordinates, physical
tangent frames, five-plane intersection and the unfolded cross-shaped map.
Square cells retain bilinear reconstruction. A triangular boundary cell uses
its three actual vertices, rather than sampling a nonexistent fourth vertex.

Canvas camera frames transform the existing sharp face atlases. Terrain commits
update only affected atlas regions, including their gradient/filter support.
There is no low-resolution interaction raster, full-image synchronous readback,
blur pass or alteration of numerical geography. Shared device-pixel-ratio and
finite backing policy apply. WebGL resource/context failure retains the Canvas
presentation interface; all graphics resources are released on disposal.

Physical picking and painting respect actual face visibility. A canonical edge
or vertex word is eligible when an incident face is visible. The brush never
extends into the interior of a hidden face. All four triangular joins and all
four base joins support continuous held strokes. Leaving the projected surface
ends the gesture safely. Detached triangle edges in the unfolded map are real
projection cuts; attached base edges remain continuous.

## Corrections established during owner testing

The first working editor was responsive on individual faces but expensive at
folds. Prepared fixed-source unfoldings now reuse certified affine coefficients
and portal predicates. Strict feasible crossings retain a global lower/upper
distance certificate; ambiguous grazing cases use the original interval solver.
Same-face chords are used only when the segment lies on an actual convex face.
Conservative candidate discovery excludes provably unreachable planes and uses
the projected ball's correct radius. Bulk private worker initialization validates
and clones the same Float32 source epoch through the accepted authority.

Forty N128/N256 dabs covering all four tools on a side, base, fold, apex and base
corner produce bit-identical Float32 words against the exhaustive original
distance implementation. Additional tests check conservative candidate coverage,
aspect extremes, alias visibility, source isolation and finite clearance.

The owner's screenshot then identified exhaustion of a lifetime distance-query
budget during an otherwise normal held gesture. Pyramid sessions now opt into
bounded rolling work epochs in the existing connected executor. Each complete
dab still obeys its hard budget; queued input, history union and route work remain
bounded. Epoch changes preserve stroke spacing, pending input and one exact
whole-gesture history operation. Lifetime diagnostic counters remain monotonic.
Other shape callers retain their existing default policy. A deliberately
impossible single dab still fails before publication.

An owner-reported recurrence of lag coincided with the full parallel unit suite.
Stopping that run restored responsiveness in the same view. Verification was
restarted with one test process at lower priority. This is development-machine
resource contention evidence, not a reason to weaken the editor's quality or
painting thresholds.

## Persistence

Strict format 15 stores genuine provider/geometry/ownership metadata and canonical
little-endian Float32 words. Header, identity, dimensions, count, clearance,
encoding, checksum and unknown fields are checked before adopting a candidate.
Saving checks its source revision. Reopening constructs a private terrain and
prepares its display before Atlas replaces the active document. Existing formats
1 through 14 retain their interpretations and replacement guards. Signed zero,
corruption, stale/canceled work and foreign/legacy relabeling have explicit tests.

## Evidence and limits

[The receipt and unedited captures](evidence/pyramid-solid-editor/receipt.json)
record N128/N256 workflows in installed desktop Chrome, actual AMD Radeon RX 6600
ANGLE/Direct3D11 WebGL2 and deliberately forced Canvas fallback. Input, canonical
commit and actual changed output pixels are measured separately. Every measured
frame retains at least 1.3 million backing pixels. Ordinary-stroke p95 total
response ranged from 47 to 84 ms in these runs.

Two separate 20-second N256 held Surface-map gestures committed 449/450 dabs and
439,251/440,231 certified distance queries across two work epochs, without release
or interruption. Each remained one exact Undo/Redo operation. Their p95
input-to-visible times were 29.9/28.9 ms. These are measured cases, not a promise
for unlimited brush size, arbitrary hardware or background test saturation.

The output-pixel gate uses identical numerical words, camera, zoom, viewport and
appearance for GPU/Canvas. Stable terrain differs by at most one channel value;
the gate permits at most three. Discontinuous coastal contributions are bounded
by the accepted color atlas's two-texel reconstruction support and actual ray
footprint. No fully covered output escapes the physical silhouette. Viewing
leaves the complete terrain hash unchanged. Raw comparison images remain in
the evidence directory.

The browser input is real Playwright mouse input in headless installed Chrome.
This is not a claim of physical-phone testing or direct control of the owner's
Chrome/extension session. The owner independently reported beautiful rendering,
responsive brushing and the corrected held-stroke behavior. Full family
acceptance remains separate from technical verification.

This is the required usable Solid Pyramid checkpoint before the full Hollow
Pyramid implementation. Hollow material geometry, two independent banks and
read-only cavity inspection remain the next authorized checkpoints. No other
shape or host-site work is included.

Final checkpoint validation: 1,398/1,398 units, TypeScript/production build,
six operational pyramid cases, two actual GPU/Canvas pixel cases and seven
existing-family browser cases pass with no failures or cancellations.

This receipt preserves the standalone Solid Pyramid delivery. The subsequently
completed Hollow Pyramid and final regression checkpoint are documented in the
[family review](PYRAMID-FINAL-REVIEW.md) and its separate source-fingerprinted
receipt; the historical evidence above remains unchanged.
