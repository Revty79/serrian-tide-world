# Flat Disc Worlds

Flat Disc is an operational Atlas World with independent upper and lower
geography, a real circumferential sidewall, responsive ordinary sculpting and
strict lossless Save/Open. Engineering verification is complete; owner visual
and physical-device acceptance remain separate.

## Publication checkpoints

- A — physical/numerical foundation: `5d38de00dc6716ed590133d053a71dc1c6ebfaa2`.
- B — operational creator/editor and format 42: `65db8a7f5f4f5bef7905941cbb9b4a6d9e9b5463`.
- C — final configuration, rendering and responsiveness verification: this
  receipt/source commit, identified by SHA in the completion message.

The immutable [foundation](evidence/flat-disc-foundation/receipt.json),
[editor](evidence/flat-disc-editor/receipt.json) and
[final](evidence/flat-disc-final/receipt.json) receipts belong to their own
commits. Historical receipts are not regenerated for later source changes.

## Actual physical construction and inherited infrastructure

A disc specializes the accepted closed circular cylinder: radius R, material
thickness H, complete filled caps and a periodic outer wall. The body occupies
z=0..H; the camera centers it at H/2. Each cap has one center and independent
interior samples. The wall owns both shared canonical rim rings. There is one
connected exterior with three stable patch identities, no central hole, square
corners or zero-thickness sheet. Physical normals are radial on the wall and
opposite axial normals on the two caps.

The cylinder supplies actual intersection/picking, circular maps, normals,
continuous exterior distances, Float32 authority, Hermite height/gradient field,
shaders, coherent Canvas raster, worker protocol, four tools, input scheduling,
whole-gesture history and Atlas workspace. Flat Disc opts into the already
supported rolling-work stroke policy. No work, history, backing or memory cap
increases. The engine remains standalone from the main website and host records.

Same-cap distance is Cartesian planar distance; connected routes cross actual
rims and wall. Opposite surfaces cannot use a shortcut through material. A
conservative mandatory-rim lower bound avoids unnecessary distance queries,
without changing any influential distance or brush arithmetic. The foundation's
40-probe sweep changed from two query-limit failures to zero, with a maximum
18 ms Node preparation time; browser measurements remain the responsiveness gate.

## Creator configuration and numerical profiles

Choose **Flat Disc World**. Diameter is also World Size; changing it scales
thickness proportionately. Diameter is 100,000–1,000,000,000 m; thickness is
2.5–20% of diameter. Dimensions are fixed after creation. Defaults are
2,000,000 m diameter and 100,000 m thickness, blank ocean at -100 m.

| Profile | Thickness / diameter | Detail | Canonical samples |
| --- | --- | --- | --- |
| Thin | 2.5% | N256 required | 50,178 |
| Standard | 5% | N128 / N256 | 12,802 / 51,458 |
| Thick | 20% | N128 / N256 | 14,722 / 58,882 |
| Wide | doubles diameter, 2.5% thickness | N256 required | 50,178 |

N128/N256 allocate 128/256 angular samples, 48/96 radial cells per cap, and
proportionate axial cells on the wall. Every profile stays inside the existing
65,282-sample cylinder cap. The largest canonical payload is 235,528 bytes.
Brush radius is 0.5–12% of R; new Worlds default to the smaller of 4.9% of R
and 49% of H. Existing saved dimensions, terrain and brush settings are retained.

## Editing, navigation and persistence

Physical view provides orbit, Pan World, zoom, Fit, overview and ten region
focuses. Cap focuses use 1.5x and the sidewall 1.25x for useful surrounding
context and measured sharp Canvas responsiveness. Complete Upper/Lower circular
maps and the unwrapped Sidewall map edit the same geography. Complete boundary
map shows the entire exterior atlas. The circumference map has a working-meridian
cut: lift/restart there or recenter the meridian. Physical strokes cross both
real rims continuously.

The inherited visibility guard rejects hidden influential samples before a
pending physical dab applies. Rotate, reduce radius or use the connected maps
for a larger exterior footprint. Legitimate near-rim influence can reach the
opposite cap along the actual wall; opposite centers remain independent.

Raise, Lower, Smooth and Flatten preserve exact canonical whole-gesture Undo/Redo.
Save/Open preserves geography, dimensions, identities and camera/navigation/brush
state. History remains session-local. Format **42** was allocated after checking
published formats 1–20 and 25–41 and reserved 21–24; no Earth-Form or Filled-Torus
codec exists in this checkout. Existing formats keep their original meanings.

Strict headers cover construction/topology, three distinct World/surface/terrain
IDs, region mapping, exact sample profile, units/sea level and editing state.
Private little-endian Float32 words, including negative zero, have SHA-256
integrity. Unknown fields, nonfinite/corrupted data, invalid views and mismatched
profiles reject before document replacement. A saved ID cannot be overwritten
with different geometry or detail. Failed Open retains the active World.

## Rendering corrections and verification

Independent physical intervals exposed a one-pixel Canvas overfill at a cap
silhouette. A bounded quadratic projection of each pixel onto the cap planes
now selects the same existing four real coverage rays at that edge. The field,
palette and numerical heights are unchanged. A physical diagonal bounds the
existing 4x4 reconstruction stencil for dirty updates, replacing an unnecessarily
large square-spacing bound. Both changes also qualify against the old Cylinder.

There are **40 matched GPU/Canvas views** across N128/N256 and standard,
thin and thick profiles, including centers, underside, rims, circular maps and
close sidewall rendering. Stable color/relief differs by at most
1 byte between backends and 1 byte from the accepted field reference.
Canvas coverage matches independent physical four-ray coverage with maximum error
0; opaque interiors and empty exterior remain correct. Hardware MSAA and Canvas
quadrature retain their different sampling at silhouettes and map tangencies;
raw comparisons preserve those edge differences.

Thirty sharp incremental Canvas images and thirty GPU images equal fresh complete
reconstruction exactly, covering both old Cylinder details and standard/thin/thick
disc profiles. Actual reopened outputs and graphics loss/restoration also match
fresh reconstruction. Viewing cannot change canonical terrain.

## Actual input-to-visible-pixel measurements

Installed Chrome, AMD Radeon RX 6600 hardware WebGL2 and forced Canvas, 1440x950
desktop viewport, serial workers with no retries. Regional matrices exercise
all four tools in ten physical regions; Raise supplies the captured ordinary
pixel-latency probe. B hardware rows retain their historical evidence; C repeats
both Canvas details with the final working camera and refined image enabled.

| Regional matrix | Worst regional p95 | 15-second held p95 | Worst first regional dab |
| --- | --- | --- | --- |
| N128 WebGL2 (B) | 42.3 ms | 25.5 ms | 80.4 ms |
| N128 Canvas (C) | 103.5 ms | 44.6 ms | 131.5 ms |
| N256 WebGL2 (B) | 53.2 ms | 27.0 ms | 95.5 ms |
| N256 Canvas (C) | 92.1 ms | 65.3 ms | 191.7 ms |

| Real rim crossings | Worst rim p95 | Circumference p95 |
| --- | --- | --- |
| Thin N256 WebGL2 | 28.5 ms | 25.7 ms |
| Thin N256 Canvas | 50.1 ms | 45.3 ms |
| Thick N256 WebGL2 | 29.4 ms | 25.5 ms |
| Thick N256 Canvas | 61.8 ms | 44.5 ms |

Maximum 120 km brush at whole-World scale: 32.0 ms WebGL2 / 69.3 ms Canvas p95.
Navigation p95: 10.4 ms WebGL2 / 43.0 ms Canvas, with exact geography/history
preservation. Gates remain 125 ms ordinary, 100 ms held, 1,000 ms first dab and
150 ms navigation. Canvas stays within 1.5M desktop / 650k coarse-pointer pixels.
Large brushes at very close physical zoom can require more Canvas work; the
qualification distinguishes ordinary working views from whole-World maximum-brush
stress and close-zoom rendering quality.

Final validation passes **294 focused source checks**, TypeScript, production build,
**26 Flat Disc browser cases** and **18 relevant browser regressions**. The latter
cover old solid/hollow Cylinder, Open Cylinder, bounded/wrapped planes, Sphere,
Torus and the completed Spiral, plus matched cylinder solid/hollow rendering at
both 0 m and -100 m. GPU parity fixtures explicitly match backing density.
Testing follows changed adapters/shared mechanisms rather than rerunning every
unrelated World browser suite. The build retains its existing chunk-size warning.

## Remaining owner acceptance and scope

Review appearance, control comfort and ordinary painting on the owner's actual
device. Trusted CDP touch/pen and coarse-pointer emulation are browser evidence,
not a physical handheld-device test. Engineering evidence is not owner acceptance.

Elevations retain the accepted reference-field color/relief presentation; they
do not displace the physical body. Arbitrary-height/depth excavation, holes,
tunnels and links remain the later shared pass. Flat Ring is outside this pass.
The paused excavation recovery branch remains unchanged.
