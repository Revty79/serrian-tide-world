# Ringworld focused final review

Pass 7 technically completes the Ringworld editor on 2026-10-24. Owner acceptance
and physical-device review remain pending. The model is one rectangular annular
solid with genuine Inner Band, Outer Band, Upper Rim and Lower Rim, an empty
central opening, independent band interiors and one canonical terrain authority
at all physical creases. All four geographical regions are editable.

Foundation A is `0a836fa76ce50cdff3c3293f6b69b0852e3f9c02`; operational B is
`3123a4a1f9d42a35c557312493cf688b5a51fa70`. The commit containing this review
is final checkpoint C. Their immutable evidence directories are
`evidence/ringworld-foundation`, `evidence/ringworld-operational` and
`evidence/ringworld-complete`. Each receipt binds source and raw evidence hashes;
historical receipts describe their own committed source, not subsequent edits.

## Implementation and supported profile

The [implementation review](RINGWORLD-WORLDS.md) records exact dimensions,
sampling, ownership, reuse and the operational performance matrix. Actual Open
Cylinder distance certificates, routes, terrain, workers and history are reused
with the accepted Cylinder Hermite/GLSL and coherent Canvas presentation.
Ringworld adds distinct identity and strict persistence, balanced sampling,
creation controls, independent band workflows, physical focus/pan/overview,
periodic maps and bounded geometry-only ray caching. No excavation work is merged.

Ring Radius is the inner radius, at least 10,000 m. Outer radius is at most
one billion m. Structural Thickness is 8–25% and Ring Width 15–50% of outer
radius; each is at least 400 m. N128 and N256 are qualified. The default profile
has 43,008 / 169,984 canonical Float32 words respectively. The largest supported
profile has 253,952. Unsupported proportions are rejected clearly. Reference
surface elevations preserve the accepted physical clearance bounds; terrain does
not introduce displaced meshes.

Final UI corrections give the shared workspace shape-specific accessible names
and show the selected band plus both rims in its focus menu. Paint Inner Band /
Paint Outer Band switch the focused geographical workflow. This avoids targeting
an occluded opposite band from the wrong physical view; connected maps and brush
routes still cover the full material boundary. Supported elevation limits are
visible in the Ringworld description.

## Focused final evidence

The final interaction suite passes 16 installed-Chrome cases: three resource /
replacement cases, four matched calibration cases, two navigation cases, one
quick normal-editor pilot, four recovery cases and two connected-topology cases.
Touch/pen emulation adds two passing cases. Focused final numerical checks and
the production TypeScript/build check are recorded alongside these reports.
The prior B qualification remains 91 numerical checks, 22 operational browser
cases and two navigation cases, including the full N128/N256 × backend workflows.

The largest profile runs Raise, Lower, Smooth and Flatten on all four physical
regions with exact whole-gesture Undo/Redo. At the final observation, authority
and color-cache storage are each 1,015,808 bytes. Retained color plus geometry
cache is 5,001,008 bytes in WebGL2 and 35,215,808 in Canvas, within the qualified
37.5 MB geometry-cache ceiling plus color words. The recorded history retains
196,608 bytes for 16 gestures, below the unchanged 8 MiB limit. GPU textures are
1,032,192 bytes; geometry buffers 1,573,296. CDP main-realm heap observations are
38,572,176 / 45,556,288 bytes; these are point observations, excluding GPU and
separate worker memory, not process peak measurements. Exact allocation bounds
and source remain available in the frozen evidence.

One actual N256 gesture crosses Outer Band → entire Upper Rim → Inner Band
while also crossing the angular seam. Both backends retain one exact history
entry, update precisely those three canonical owner regions, leave Lower Rim
untouched, and process all accepted positions. Worker-protocol fault tests retain
an exact undoable failed prefix and recover on a fresh stroke. Context loss uses
Canvas and restores WebGL2 without changing words. Corrupt Open and incompatible
same-ID replacement preserve the active World atomically.

## Pixel response and rendering

All timings below are actual input-to-submitted-pixel observations on installed
Chrome / AMD Radeon RX 6600 ANGLE D3D11 or forced Canvas, not revision-only
timings. Ordinary p95 remains below 125 ms, held p95 below 100 ms and navigation
p95 below 150 ms. First response is recorded separately. B's several-second
physical strokes contain 23–49 or more commits; the short maximum-profile
diagnostic strokes contain 8–18, and retain every sample.

| Final N256 case | WebGL2 ms | Canvas ms |
| --- | ---: | ---: |
| Matched Ringworld map trace p95 | 33.5 | 27.3 |
| Matched Open Cylinder map trace p95 | 37.2 | 28.4 |
| Ringworld map trace first response | 45.6 | 59.3 |
| Largest-profile four-region Raise p95 range | 40.3–77.5 | 56.3–116.5 |
| Connected band/rim/angular-seam gesture p95 | 38.8 | 48.5 |
| Physical rotation p95 | 8.7 | 128.3 |

Calibration fixes the same initial -100 m heights, 1,000,000 / 1,200,000 m
radii, 400,000 m width, 36,000 m radius brush, 200 m/dab, camera, viewport,
720,000 m physical trace and 160 timed native moves. Ringworld N256 uses 169,984
balanced samples; Open Cylinder N256 uses its accepted 131,072-word layout.
These are matched physical workloads with different sampling layouts.

B's 16 matched rendering cases cover both details and actual independent
annular-ray/palette references: maximum stable GPU/Canvas channel difference 1,
exact Canvas subpixel coverage over 33,756 boundary samples, no hardware edge
envelope failures or independent empty/opaque ray failures. Six physical/map
poses at both details compare incremental and fresh full output byte-for-byte.
Actual captures were visually inspected, including the annular opening, physical
rim painting, connected seam gesture and mobile input. Recovery and workflow
screenshots can show the intentionally retained interactive raster before idle
refinement; the matched settled-pixel suite supplies sharp-quality evidence.

## Existing-family compatibility and strict persistence

The targeted regression run passes Open Cylinder's four physical/map pixel cases,
both normal-editor workflows and four N256 Torus/Cylinder input/history cases.
The initial solid/hollow Cylinder GPU comparison correctly rejected unequal
backing sizes: ordinary DPR 1 versus the accepted physical-cut minimum DPR 1.5.
The dedicated parity project now runs both members at DPR 1.5. Its Canvas and
hardware WebGL2 comparisons use the same words, camera and backing at -100 m and
0 m, preserving all original pixel thresholds. Both the initial diagnostic report
and the corrected pair's report are retained. Other workflow measurements remain
DPR 1. Only this relevant pair is repeated, not the entire legacy matrix.

New format 35 validates exact keys, dimensions/provider, topology/ownership,
resolution, disjoint identities, finite physical elevation limits, editing
selection/camera/navigation/brush state and SHA-256 integrity before replacement.
N128/N256 preserve exact Float32 words, including negative zero. Normal-editor
Save/Open restores geography, camera and controls and supports continued editing.
Session history is exact; historical Undo is not persisted across Open. Formats
1–34 retain their interpretations; 21–24 remain reserved in the recovery branch.

## Acceptance and scope

Browser touch/pen input uses trusted CDP events with Pixel 7 emulation. It proves
browser input handling and exact replay, not physical touch/stylus hardware.
Owner review should cover preferred ring proportions, physical navigation,
inner/outer painting feel and visual quality on the owner's devices. Technical
results are local-machine observations, not universal performance guarantees.
Cold graphics-program preparation can take about 17–18 seconds; Canvas remains
available during preparation.

Thin/narrow proportions outside the qualified range, arbitrary shaping, new
holes/tunnels/links, excavation, displaced terrain and subsequent Exotic Worlds
remain outside this pass. No website, hosting, deployment or database change is
included. The paused excavation recovery branch remains at
`35f7f5d34edf861c33c5eb4decad92d41664c749`.
