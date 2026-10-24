# Ringworlds

Checkpoints B and C deliver and technically qualify a normal Atlas Ringworld
editor. The reference body is a
rectangular annular solid: Inner Band, Outer Band, Upper Rim and Lower Rim.
The center is empty space. All four regions belong to one material boundary,
with independent band interiors and single canonical words at every real crease.
The versioned World provider is `physical-rectangular-ringworld`; this is not a
Hollow terrain bank or a Torus tube. Foundation checkpoint A is `0a836fa`.

## Physical dimensions and sampling

Ring Radius is the inner radius. Ring Width is axial; Structural Thickness is
radial. Supported inner radius is at least 10,000 m; outer radius is at most
one billion m. Width is 15–50% and thickness 8–25% of outer radius, each at
least 400 m. Unsupported proportions/detail are rejected before editing.
New geography starts at the shared -100 m blank ocean. Elevations obey the
accepted annular clearance bounds; geography is never clamped to mask a defect.

Area is `2π[(Ri+Ro)W + (Ro-Ri)(Ro+Ri)]`; reference material volume is
`π(Ro-Ri)(Ro+Ri)W`. Wall distance uses the wall's actual radius; annular distance
uses the varying radial coordinate. Positive inner elevation follows its inward
material-boundary normal. These are reference-surface elevations, without a
new displaced mesh.

N128/N256 use 4N angular samples. Let `h=2πRo/(4N)`: axial cells are
`Z=max(2,ceil(W/h))`, half-rim radial cells `P=max(2,ceil(T/(2h)))`.
Canonical count is `4N(2Z+4P)`, capped at 262,144 for this qualified profile.
The supported maximum is 253,952 words; the Open Cylinder's own profile and
131,072-word preview cap remain unchanged. No common work/history cap increases.
Inner angular spacing is 75–92% of outer spacing. No angular endpoints or
contradictory crease words are duplicated.

| Default dimensions: Ri=1,000,000 m, W=400,000 m, T=200,000 m | Angular | Axial cells | Half-rim cells | Canonical words | Authority bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| N128 | 512 | 28 | 7 | 43,008 | 172,032 |
| N256 | 1,024 | 55 | 14 | 169,984 | 679,936 |

## Shared Atlas mechanisms and Ringworld adaptations

The actual Open Cylinder charts, annular distance certificates, continuous
routes, canonical ownership and finite-volume smoothing are reused. Raise,
Lower, Smooth and Flatten run through the same connected gesture engine,
workers, host commits, bounded history and workspace. The worker now uses the
already accepted validated private bulk Float32 loader, preserving words and
revision while avoiding per-key snapshot restoration. A zero-turn cap endpoint
uses its actual angle to avoid a spurious ULP-sized terminal chord; the existing
path certificates and solver budgets are unchanged.

Creation and persistence have distinct Ringworld identities. Paint Inner Band /
Paint Outer Band select fitted geographical workflows. World overview restores
the real annular body; physical focus starts at 2× and focused band maps at 4×.
Pan World translates the physical camera; ordinary navigation rotates it. Each
band map retains the connected rims. The complete boundary map follows Outer
Band → Upper Rim → Inner Band → Lower Rim. Dashed edges are honest projection
cuts, not physical barriers. Horizontal map dragging moves the angular cut.
The same valid warm numerical worker survives a band viewport switch.

Presentation uses the accepted Cylinder Hermite field, palette, physical
relief, shared GLSL and coherent Canvas raster. Integer/fraction addressing now
uses one unwrapped angular coordinate, avoiding inconsistent negative near-grid
rounding on the hardware shader. Dirty updates receive the same real-crease
coverage pass as complete renders, with a one-pixel label halo.

Ringworld physical dirty rectangles enclose the intrinsic dab plus the actual
two-cell Hermite/gradient stencil projected from each affected chart. They use
the accepted bounded overlap union. A Torus-style geometry-only camera cache
retains 25 bytes per center pixel: at most 37.5 MB desktop / 16.25 MB coarse,
with one camera epoch. Fractional rays still use the real geometry. It contains
no terrain elevations or colors and is released on document disposal; map views
release it. The accepted numerical presentation is prepared once on an isolated
private fixture before input; its image is never published and active geography
is untouched. Canonical terrain remains the authority throughout.

Canvas settled budgets remain 1.5 million desktop / 650,000 coarse pixels,
with the existing interactive/refinement policy. GPU backing remains capped at
3 million pixels. Existing candidate, distance, patch, queue and history limits
remain unchanged; oversized input fails explicitly with an undoable prefix.

## Measured operational qualification

Installed Chrome used hardware AMD Radeon RX 6600 / ANGLE D3D11 and forced
Canvas, 1440×950 at DPR 1. These are actual submitted output-pixel observations,
not just revision counters or GPU-call return times. Physical measurements use
several-second native gestures with 23–49 or more commits so p95 has a useful
sample count. First visible response is separately retained; held map strokes
last 15 seconds. Raw events, samples and source hashes are frozen in
`evidence/ringworld-operational/receipt.json`.

| Detail | Backend | Four physical regions p95 ms | Largest physical first response ms | Joins/seam p95 maximum ms | Full-circle p95 ms | Held map p95 ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 128 | WebGL2 | 27.7–34.4 | 52.0 | 48.3 | 26.7 | 30.3 |
| 128 | Canvas | 46.7–87.0 | 124.1 | 97.8 | 27.2 | 55.4 |
| 256 | WebGL2 | 33.8–45.9 | 67.4 | 50.6 | 36.0 | 30.6 |
| 256 | Canvas | 31.2–70.3 | 74.9 | 75.0 | 27.0 | 42.8 |

Ordinary painting retains the existing 125 ms p95 gate, held painting 100 ms,
and navigation 150 ms. Recorded navigation p95 is 8.9 ms WebGL2 / 113.1 ms
Canvas. These PC observations are not universal latency guarantees. Background
graphics initialization can take about 17–18 seconds on a cold program; Canvas
remains available during preparation.

The 91 focused numerical checks, TypeScript and production build pass. All 22
operational Chrome cases pass: 16 matched pixel/reference cases, two exact
incremental/full-output comparisons, and four complete N128/N256 × backend
creator workflows. Two further navigation cases verify rotation, physical pan,
Fit/overview and read-only geography/history. The 16 pixel cases check 33,756
boundary samples: exact Canvas quadrature, no hardware edge-envelope failures,
maximum stable GPU/Canvas channel difference 1, and no independent ray failures.
Incremental Canvas and GPU output matches fresh full output byte-for-byte across
six poses at each detail. Captures are reviewed alongside the numeric gates.

## Strict Save/Open and remaining acceptance

Format 35 is newly allocated. Formats 1–34 retain their interpretations;
experimental excavation formats 21–24 remain reserved in the recovery branch.
Ringworld saves preserve World/surface/terrain identity, provider, exact physical
dimensions and thickness, detail/layout/ownership/topology, exact finite Float32
words, band selection, valid camera, brush controls and physical navigation mode.
Strict fields, clearance, identities and SHA-256 integrity are checked before
active replacement. Incompatible same-ID geometry cannot replace a saved map.
Session Undo/Redo restores whole gestures exactly; historical terrain Undo is
not promised across Open. Save/Open restores geography and permits new editing.

The [focused final review](RINGWORLD-FINAL-REVIEW.md) checks the largest profile,
recovery, a complete band-to-band rim gesture, matched Open Cylinder calibration,
emulated touch/pen and relevant prior-family regressions. Technical qualification is separate from
owner acceptance and physical-device evidence. Arbitrarily thin proportions,
excavation, holes, tunnels, links, displaced meshes, custom shaping and subsequent
World families remain outside this pass. The excavation recovery branch is not
merged or modified.

For later small Ringworld changes, the maintained pilot is a quick normal-editor
smoke covering creation, band focus, painting and exact v35 reopening:
`node node_modules/@playwright/test/cli.js test --config playwright.ringworld.config.mjs tests/ringworld-pilot.spec.ts`.
Use the relevant numerical/rendering/navigation subset when its shared mechanisms
change; run the full qualification matrix for material changes to those mechanisms.
