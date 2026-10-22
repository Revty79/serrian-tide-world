# Open Cylinder corrective review

The owner rejected `0df1a666047f91ec85846553bdd40092e3083adf` for slow painting,
soft terrain and unusable annular rims. This pass preserves the accepted Atlas
engines and the single Open Cylinder authority. It does not begin pyramids.

## Development-PC reproduction

The owner's normal browser reported CPU fallback, an AMD Radeon RX 6600 through
ANGLE D3D11, "Graphics resource allocation failed", a 1778 × 843 terrain image
and a 1920 × 911 presentation at N256. An isolated instance of the PC's installed
Chrome 134 reproduced all of those values. Bundled Chromium did not reproduce
the initialization failure. Native desktop control could not establish the
current browser URL safely and was stopped; no owner browser/profile was driven.

An `INVALID_VALUE` (1281) was already pending in the initial GL information
phase, before resources were allocated. Instrumentation first detected it at
the `WEBGL_debug_renderer_info` probe, which returned the correct identity;
that does not establish which internal Chrome/ANGLE operation generated it.
The later allocation check incorrectly blamed this stale error on resources.
Shared graphics information now captures initial/probe errors separately,
before any resource is created.
Allocation, upload, link and context-loss failures still trigger honest fallback.
The same installed Chrome subsequently activated hardware WebGL2 at 1920 × 911,
with the diagnostic 1281 retained separately in `probeErrors`.

## Numerical and display findings

Matched ordinary wall dabs at N128 and N256 produced identical Float32 words
and footprints to the accepted cylinder. Hermite reconstruction, relief,
palette and coastline coverage already used the accepted numerical functions.
Adding blur, sharpening, texture or terrain smoothing would not fix this issue.

The rejected Canvas interaction path enlarged a roughly 40,000-pixel frame.
This visibly softened painted terrain during drawing and navigation even when
the settled image was sharp. In an initial matched normal-editor run, Open
Canvas raster work took about 2006 ms across the workflow, versus 823 ms for
the capped cylinder; Open dab preparation accounted for about 11 ms. These
whole-workflow costs are not individual input latencies.

Ordinary Open intersections now reuse the accepted convex-cylinder ray function
for unchanged curved walls and actual annular material. Rays through natural
openings, excavation and inspection retain the proper annular subtraction.
Shared Canvas presentation retains the sharp settled image and updates only
conservative regions containing actual changed samples plus the field stencil.
Periodic seam copies remain separate bounded rectangles. The pixel calculation
is the same coherent Hermite/color/coverage pass; no authority is resampled.
Full renders remain the fallback for pose/scene changes, cuts, inspection,
unknown revision chains or updates covering most of the viewport.

Open preparation and exact hover inspection now use the accepted worker
transport, ordered publication, source lease and canonical acknowledgement.
The geometry adapter validates real Open metadata and topology. Worker scratch
epochs never become authoritative. Hover starts after a stable pointer, is
cancelled before painting and is labelled separately from pending terrain or
display work. The synchronous numerical API remains available for fallback.

## Rim correction and continuous editing

At the example dimensions, N128 rim radial spacing is 3125 m, while angular
spacing is approximately 39–49 km. The old 28,800 m default could change only
one angular column. Extra interpolation could not supply missing numerical
detail. The accepted cylinder's 83,700 m Outside default now applies within a
proven local domain; Inside uses the same accepted `0.0837*R` policy. Strength,
falloff, spacing and sample layout remain unchanged. Tests compare actual
changed columns and exact words at shared physical annular/cap sample positions.
Existing maps, canonical ownership, history and v14 words are not reinterpreted.

The strict radius is below `min(0.48*min(T,L),0.2*Ri)`. Since twice the radius is
below 96% of a strip width, a footprint cannot meet both bounding creases of a
wall/rim strip. Every query must still satisfy the original global lower/upper
enclosure and work limits; an unsupported route still fails explicitly.

Outside/Inside now choose fitted views rather than an arbitrary editing barrier.
All actually visible connected terrain can be painted continuously, including
both complete annuli and an opposite wall visible through an end. Real occlusion
and read-only inspection rules remain enforced. The annular midpoint continues
to assign canonical bookkeeping and is never a physical break.

Native physical-join tests found a second numerical defect: nearly identical
rim pointer-up coordinates lost their sign after summing large identical
meridian prefixes. Those prefixes now cancel algebraically before interval
summation. As in the accepted cylinder, distinct endpoints retain reconstruction
error even when their rounded Cartesian chord collapses. Input is retained and
the global excess/position certificates remain explicit. No coordinate snapping
or invalid closed-disk route was introduced.

## Verification and receipt

The repeatable correction suite is `playwright.open-correction.config.mjs`.
Run `node scripts/verify-open-cylinder-correction.mjs` from the repository root
for the complete isolated queue. It requires the PC's installed Chrome for the
actual-browser comparison, reuses only the owned preview on port 5264, checks
the frozen source fingerprint after every phase and stops on any failed check.
It uses installed Chrome on the PC's actual AMD graphics, with identical wall
dimensions, initial heights, brush radius/strength, detail, camera, zoom and
backend for the capped/Open comparisons. Both annuli receive sustained full
circumference strokes, four-tool editing, radial strokes, periodic-seam cases,
all four native physical joins in both fitted views, exact replay and v14 reopen.

Input admission, canonical commits and actual post-draw pixel readback are
recorded separately. GPU readback occurs before the default drawing buffer is
discarded; every measured commit must have a matching output epoch and multiple
distinct pixel hashes. Timing checks cannot pass with an empty sample set.
These are browser pixel-availability measurements, not photon latency.
Canvas tests also require settled backing density throughout measured painting.

The complete queue passed against the same frozen 365-file source fingerprint:
`5918d9d46b8eca61ff50bcde27d3db060af77c4e02b18216d90c1f540a6fd7fe`.
The production build and final TypeScript check passed. The build retains its
existing large-chunk warning.

| Verification | Passed |
| --- | ---: |
| Numerical, rendering, worker, history and persistence units | 1,365 |
| Installed-Chrome matched painting and capped references | 16 |
| Open workflows, connections, recovery and emulated touch/pen | 24 |
| Accepted capped-cylinder connection compatibility | 12 |
| Existing solid/hollow editor regressions | 68 |
| Matched solid/hollow pixel parity | 12 |
| Open CPU/GPU actual-pixel comparisons | 12 |
| Ordinary 15-second held painting and exact replay | 8 |
| **Distinct browser cases** | **152** |

The installed-Chrome painting comparisons used a 1920 x 911 viewport, -100 m
initial elevation, 83,700 m radius and 200 m/dab strength. Camera, zoom,
appearance and detail were matched to the capped reference. All eight Open
cases completed with zero numerical failures and zero cancellations. Canvas
retained at least 1.49 million terrain pixels in every measured output epoch.

The following are independently computed p95 measurements in milliseconds;
column percentiles do not add arithmetically. Auto selected hardware WebGL2 on
the development PC. Each rim received 285 committed dabs around its circumference.

| Detail / backend / view | Wall input to commit | Wall commit to pixels | Wall input to pixels | Capped input to pixels | Start / end rim input to pixels |
| --- | ---: | ---: | ---: | ---: | ---: |
| N128 / WebGL2 / Outside | 2.4 | 32.9 | 35.0 | 31.1 | 28.6 / 27.8 |
| N128 / WebGL2 / Inside | 24.3 | 31.4 | 45.5 | 47.0 | 28.6 / 28.0 |
| N128 / Canvas / Outside | 2.2 | 46.6 | 48.5 | 49.1 | 43.3 / 42.6 |
| N128 / Canvas / Inside | 26.7 | 78.3 | 105.0 | 82.1 | 43.0 / 42.9 |
| N256 / WebGL2 / Outside | 3.6 | 34.8 | 43.8 | 35.7 | 43.6 / 41.6 |
| N256 / WebGL2 / Inside | 57.6 | 43.4 | 90.6 | 68.4 | 47.4 / 51.5 |
| N256 / Canvas / Outside | 4.3 | 39.9 | 42.6 | 47.2 | 34.6 / 33.5 |
| N256 / Canvas / Inside | 50.3 | 54.5 | 104.8 | 77.8 | 34.9 / 33.1 |

Inside-wall preparation remains more expensive than Outside in both editors;
Open N256 retains additional annular/visibility cost. These measured results
are within the fixed comparison gates, not a claim that every view has identical
cost. Readback overhead is included. Pixel availability does not measure the
display's physical presentation time. Coarse-pointer coverage uses Pixel 7
browser emulation, not a physical phone.

Actual rim footprints now cover 3-4 angular columns at N128 versus the old
default's 1-2, and 7-8 at N256 versus 2-3, including centers halfway between
columns. All 15,360 shared physical annular/cap Float32 samples compared exactly
across both rims, both details and both angular phases. The numerical receipt
also records coastline radii and the unchanged grid spacing. This improves
the default footprint without claiming to add numerical detail to an old map.

A separate repetition of the original normal-editor Canvas workflow retained
the 40,000 m brush. Open raster work decreased from approximately 2006 ms to
697 ms across that workflow; the corrected capped reference took 445 ms.
Both completed 39 dabs / 152 writes without failures or cancellations. These
whole-workflow costs include final refinement and must not be read as input
latencies. The raw active-drawing captures show the sharper retained image.
Navigation, changed scenes, cuts and inspection still use the accepted bounded
interactive raster and idle-refinement policy.

Evidence is preserved separately from the historical `0df1a66` receipts:

- [Machine-readable final receipt](evidence/open-cylinder-correction.json)
- [4,864 per-commit timing rows](evidence/open-cylinder-correction/timings.csv)
- [Numerical footprints and exact shared-word comparisons](evidence/open-cylinder-correction/footprints.json)
- Canvas during drawing: [before](evidence/open-cylinder-correction/canvas-drawing-before.png), [after](evidence/open-cylinder-correction/canvas-drawing-after.png)
- Installed Chrome initialization: [before](evidence/open-cylinder-correction/chrome-before.png), [after](evidence/open-cylinder-correction/chrome-after.png)
- Matched terrain: [accepted capped wall](evidence/open-cylinder-correction/capped-wall.png), [Open wall](evidence/open-cylinder-correction/open-wall.png), [Inside rim](evidence/open-cylinder-correction/rim-inside.png), [Canvas rim](evidence/open-cylinder-correction/rim-canvas.png)

The owner independently reported that the live result was beautiful again and
authorized this correction's completion and push. This checkpoint implements
no subsequent geometry, host integration or deployment.
