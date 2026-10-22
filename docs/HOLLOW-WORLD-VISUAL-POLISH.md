# Hollow-world visual correction and cube interior review

This checkpoint restores display detail for existing hollow worlds and verifies
the cube's normal interior-view workflow. The owner accepts Hollow Sphere and
Capped Hollow Cylinder painting for development progression. The owner accepted
the rounded-coastline correction after testing the new blank-ocean default.
Broader view/feature acceptance remains separate. Operational Open Cylinder is the next authorized
checkpoint; this report does not claim it is delivered.

## Findings and correction

Two distinct causes were verified. Before this
correction, a 1,440 x 950 presentation canvas could display a roughly 80,000-ray
cylinder excavation image. Cube excavation/inspection used at most 24,000 rays,
and spherical inspection with a cut was capped at 80,000. Enlarging those buffers
softened their blocks but could not restore missing display samples. An actual
WebGL2 canvas and a full-sized Canvas backing store therefore needed separate
inspection from the CPU ray grid.

The owner's specific remaining complaint was **blocky painted coastlines**.
Hollow worlds initially started at exactly 0 m, whereas solids start at -100 m.
With positive heights surrounded by exact zero samples, a sea-level contour can
follow the grid-cell support boundary even at high display density. Matched
solid/hollow captures from both starting heights reproduced this in the accepted
solid renderer too. Increasing the ray budget alone could not correct it.

After reviewing this evidence, the owner explicitly authorized the same -100 m
blank-ocean default for **new** hollow worlds and confirmed the resulting
coastlines were correct. The existing 0 m start remains selectable as Reference
shell for basic holes/tunnels. Existing geography is never migrated or changed
by viewing. The ocean initialization observes the existing shell-clearance
bounds, requiring at least 400 m of minimum wall thickness; unsupported thin
shells must use the explicit reference-shell start or greater clearance.

Ordinary fitted cube rendering continues using its accepted elevation field and
face atlas. Sphere and cylinder retain their accepted elevation reconstruction,
coast classification, palette and physical gradient relief. The existing solid
and hollow ordinary paths share those systems. The cylinder Canvas excavation
adapter now supplies geometry to the accepted common raster and coastline pass.
Its exterior GPU path presents the accepted terrain mesh first, then changes
only actual excavated material within conservative cut bounds. Unchanged
exterior hits preserve the ordinary terrain pixels. Sphere GPU and cube GPU
also retain the accepted terrain pass outside projected cut bounds. Cube Canvas
retains its accepted atlas for unchanged terrain inside a cut crop. A paired
coverage mask and premultiplied cut layer subtract and add only actual changed
material. This avoids synchronous atlas readbacks and repainting unchanged
terrain during a gesture; fractional coverage preserves the original terrain
contribution at a cut edge.
Shared spherical coloring replaces its duplicated CPU pass. No brush arithmetic,
stroke scheduling, canonical resolution or saved geography changes for
appearance; the separately authorized new-world initialization is the explicit
exception described above.

The final display policy is:

| Path | Final behavior |
| --- | --- |
| Interactive Canvas painting/navigation | Retain the existing fast coherent image and interactive budgets |
| Settled Canvas | Cooperatively prepare backing-density detail, bounded at 1,500,000 pixels on desktop and 650,000 with coarse-pointer input |
| Physical CPU cut/coast boundaries | Classify actual material/coast transitions and evaluate four real subpixel rays only along those boundaries; average coverage before unpremultiplying color |
| Cube inspection | Present the small coherent image first, refine geometry and color in approximately 3 ms slices, and cancel obsolete work on pose/source changes |
| Cube refined cache | Retain the completed image/optional erase mask and small coarse cache; discard large temporary hit arrays. At most 8 bytes per refined pixel; a preparation job is bounded at 30 bytes per pixel, plus the small coherent cache |
| Physical WebGL views | Use up to 1.5 backing pixels per CSS pixel in each dimension, with a 3,000,000-pixel cap and the original single CSG evaluation per backing pixel |
| Ordinary cube backing | Preserve its existing 1,200,000-pixel cap; the larger cap applies explicitly to physical-cut/inspection GPU presentation |

The GPU correction uses actual additional geographical rays through increased
backing density. It retains the accepted terrain functions and physical interval
geometry. Repeating the large
CSG kernel for adaptive shader quadrature substantially increased driver compile
time in investigation, so that implementation was discarded. Canvas boundary
coverage and bounded GPU backing are the final implementation; there is no blur
filter over terrain colors or replacement excavation geometry.

Idle refinement can take several frames on the CPU. It retains the current
coherent view, yields between small tasks, and gives new drawing/navigation
priority. It is separate from the numerical detail and does not delay a gesture
until a full-resolution idle image exists. A contour actually encoded by the
height samples retains its geography; higher display density does not invent a
different coastline to hide the numerical grid.

## Actual before/after evidence

The owner's accepted coastline result is visible in these **normal Atlas**
captures using the new ocean default, after real Raise and exact Undo/Redo:
[cylinder](evidence/hollow-ocean-cylinder-after.png),
[sphere](evidence/hollow-ocean-sphere-after.png),
[cube](evidence/hollow-ocean-cube-after.png). The matching Save/reload/Open tests
verify that the result is actual persisted geography, rather than a visual
offset. `tests/hollow-ocean-start.spec.ts` checks all initial Float32 words.

The matched solid/hollow pixel gate (`playwright.atlas-parity.config.mjs`) uses
both -100 m and 0 m starts, N128/N256, actual WebGL2 and Canvas, identical terrain,
camera and backing. Its raw captures also show why changing display density
alone cannot change the 0 m support contour. The new default is separately
authorized, while historical reference-shell comparisons below retain 0 m.

The comparison starts at `b5636ecb2d717fa1617382adc3f7329f186224c0` and uses the
ordinary Atlas UI. The same single-dab inputs, bank selection, physical poses and
hole placements are repeated at N128/N256 on automatic and forced Canvas
backends. Both complete canonical terrain hashes must match between revisions.
Every case captures Outside, fitted Inside editing and actual cavity inspection.
The [compact receipt](evidence/hollow-world-visual-polish.json) records the runs,
limits, source fingerprint and retained timing observations.

| Scene | Before | After |
| --- | --- | --- |
| N128 Canvas cylinder, physical Outside | [Actual screenshot](evidence/hollow-polish-cylinder-before.png) | [Actual screenshot](evidence/hollow-polish-cylinder-after.png) |
| N128 Canvas sphere, cavity | [Actual screenshot](evidence/hollow-polish-sphere-before.png) | [Actual screenshot](evidence/hollow-polish-sphere-after.png) |
| N128 Canvas cube, cavity | [Actual screenshot](evidence/hollow-polish-cube-before.png) | [Actual screenshot](evidence/hollow-polish-cube-after.png) |

Screenshots are unmodified browser captures. The comparison JSON and all
additional scenes remain in `.local/hollow-quality`; the committed tests recreate
the inputs. Before/after comparison requires running the `before` phase on the
starting revision, then `after` on the correction with that output directory
preserved. Default `verify` mode works without historical local captures and
does not claim a before/after comparison.

## Cube's three views

In normal Atlas, choose Hollow cube world, then **Paint Inside**. Its ordinary
**3D cube** is fitted, rotatable and paintable; **Unfolded map** edits the same
canonical geography. **View from inside** is available in the normal view bar
when Inside is selected and no placement/proposal is active. It enters the actual
cavity center, permits looking/zooming, and pauses painting, Undo and Redo.
Its status now remains readable over the scene and says View from inside instead
of incorrectly calling this generic cavity view passage travel.

**Return to editing** restores the prior editing camera and retains brush choices
and both terrains. Physical holes/tunnels remain supported in physical views;
the existing connection and map-link objects retain their identities and history.
Preview/placement must finish or cancel before entering cavity inspection.
Guided passage travel remains a separate operation.

Keyboard Undo/Redo is blocked at the parent document handle during cube and
sphere inspection as well as at the toolbar. A regression test first reproduced
the shortcut bypass, then verified unchanged full-bank hashes and connection
objects during inspection, followed by working keyboard replay after returning
to editing. The cylinder already guarded its parent replay path.

The sphere retains **Globe / View from inside / Six-face net**, and the cylinder
retains **Physical view / View from inside / Surface map**. Consistent behavior
does not require replacing their different projections or the accepted editors.

## Completed technical verification

The [committed measurement receipt](evidence/hollow-world-visual-polish.json)
records the source fingerprint, actual GPU, pixel errors and each ordinary
held-painting timing. All completed suites below have zero failures, skips or
retries. The sustained cases ran alone after the other browser/build work.

| Gate | Passed |
| --- | ---: |
| Numerical suite | 1,287 |
| Production build | Yes |
| Matched solid/hollow output pixels, two initial heights per case | 12 |
| Existing solid/hollow compatibility workflows | 68 |
| Desktop before/after geography and three-view comparison | 12 |
| Mobile emulation geography and three-view verification | 12 |
| Ordinary 15-second held painting and exact replay | 24 |
| New-world ocean initialization and normal Save/Open | 12 |

The unchanged N256 Canvas cube limits are 180 ms p95 and 500 ms maximum
input-to-visible latency. Final Outside/Inside p95 values were 99.8/136.7 ms,
with maxima 161.1/258.7 ms. Round-world coherent-release timing is measured
separately from changing-pixel feedback; it is not a per-input latency claim.

Matched Canvas captures show the initialization difference directly:
[cylinder](evidence/hollow-parity-cylinder-n128-canvas.png),
[sphere](evidence/hollow-parity-sphere-n128-canvas.png),
[cube](evidence/hollow-parity-cube-n128-canvas.png). The reference-shell cavity
captures above intentionally retain their original 0 m terrain and its actual
contour. The owner-approved rounded coastlines are the separate normal-ocean
captures, not a claim that a 0 m support contour has changed.

## Reproduce

Use Node 24 from this repository. The browser configs use an owned preview at
127.0.0.1:5262 and place outputs in `.local` or the system temporary directory.

```powershell
npm.cmd test
npm.cmd run build
npx.cmd playwright test --config playwright.hollow-quality.config.mjs
npx.cmd playwright test --config playwright.hollow-polish-regression.config.mjs
npx.cmd playwright test --config playwright.atlas-parity.config.mjs
npx.cmd playwright test --config playwright.hollow-ocean.config.mjs
```

For an explicit matched comparison, set `HOLLOW_QUALITY_PHASE=before` at the
starting source revision and `HOLLOW_QUALITY_PHASE=after` at the correction.
`HOLLOW_QUALITY_OUTPUT` selects the preserved local comparison directory, and
`HOLLOW_QUALITY_REPORT` selects the JSON test report. The historical input script
must be present in the baseline checkout; it adds tests, not application changes.

Run sustained painting alone, without simultaneous builds or other browser work:

```powershell
$env:SPHERE_LONG_NETWORKS='1'
$env:CYLINDER_LONG_NETWORKS='1'
$env:SPHERE_LONG_OUTPUT='.local/hollow-polish-long-sphere'
$env:CYLINDER_LONG_OUTPUT='.local/hollow-polish-long-cylinder'
$env:CUBE_HOLLOW_LONG_OUTPUT='.local/hollow-polish-long-cube'
npx.cmd playwright test --config playwright.hollow-quality-long.config.mjs
```

The long config selects the 24 ordinary cases. Two optional fast-sweep diagnostics
also passed during investigation, but they are excluded from this default config
and are not a visual-polish acceptance gate. Native Pixel 7 emulation, trusted
browser pen/touch input and screenshot review are distinct from physical-device
testing and owner acceptance. Saved formats v1 through v13 retain their meaning.
