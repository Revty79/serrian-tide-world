# Pass A4 completion — World surface, geometry and topology foundation

Date: October 17, 2026. Repository: `Revty79/serrian-tide-world`. Delivery branch: `main`.

Approved A3 baseline: `7c4c7158d3b8dfd8e5af6194852e3382c90de0c7`. The owner supplied Ember's A3 source/visual approval and authorized A4 directly on main. This is the surface architecture pass; interactive wrapping belongs to A5.

## Delivered architecture

The new pure TypeScript `src/surfaces` layer separates parent World identity, physical shape, surface identity, terrain representation, topology, projection and camera. It imports no React, Canvas, DOM or browser storage. Only the explicit legacy adapter/compatibility tests refer to the existing numerical engine and save/view code.

- Immutable World/surface catalogs with independent surface and terrain IDs, parent validation, versioned provider references and shape descriptors. Hollow catalogs accept outside, inside or both; duplicate identities, shared terrain IDs and invalid reference radii are rejected.
- Working bounded rectangular and flat periodic-coordinate examples, including normalization of negative/multiple periods, half-open periodic coordinates, real bounded-edge handling, shortest intrinsic flat distances and declared map-unit/meter units.
- A numerical lattice with endpoint-inclusive bounded axes and unique samples per periodic axis. Wrapped neighbors traverse last-to-first without duplicating an authoritative endpoint. Foreign addresses and unsafe/noninteger offsets fail explicitly.
- Identity-bearing chart positions, traversal tangent Jacobians, validated tangent transport, per-edge boundary/seam contracts and a projection interface supporting repeated view instances. Rotation/reversal algebra is tested; arbitrary seam graphs and cube-face tables are not implemented.
- An opt-in legacy adapter that receives host-supplied World/surface/patch IDs and describes the existing map as bounded planar without replacing or changing its metadata, elevations, buffer or saved representation.

[WORLD-SURFACE-ARCHITECTURE.md](WORLD-SURFACE-ARCHITECTURE.md) contains the complete capability matrix, mathematical rules, projection/camera plan, selected spherical strategy, hollow-world conventions, migration boundary and A5–A7 checkpoints.

## Decisions and supported/planned boundary

| Capability | A4 status |
| --- | --- |
| Existing bounded-planar editor, tools, camera, history and local Save/Open | Preserved and regression-tested |
| Bounded/one-axis periodic/two-axis periodic mathematical coordinates, intrinsic flat metric and lattice neighbors | Implemented as opt-in pure examples; no wrapped editor UI |
| Multiple independent surface identities under one World | Implemented catalog validation; hollow multi-surface numerical editor remains future work |
| Circle/triangle and custom geometry | Validated descriptors/provider references; domain masks, arbitrary connections and editor providers remain planned |
| Spherical terrain | Proposed six-patch equiangular gnomonic cube-sphere with uniquely owned shared vertices; implementation and continuity proof deferred to A6 |
| Movable visible seams, repeated projections and surface-aware strokes | Contracts/design only; A5 and later providers must implement them |
| Hollow and cylindrical editors | Contracts/design only; A7 must implement active surfaces, normals, end policies and geometric constraints |
| Tunnels, shell geology/gravity, historical editing, new brushes, globe rendering or main-site integration | Not implemented |

The cube-sphere proposal addresses polar singularities, seams/corners, tangent frames, geodesic brush scale, unique sample keys, resolution changes and projected views. With N face-edge cells it proposes `6N²+2` unique Float32 elevation nodes: approximately 1.5 MiB at N=256 or 6 MiB at N=512 per surface, before history/caches/rendering. These are numerical payload estimates, not browser performance results. Actual face mappings, stencils, corner interpolation and memory budgets need A6 acceptance. Alternatives and primary research sources are recorded in the architecture document.

Hollow surfaces retain shared World identity with independent geography, terrain IDs and future revision streams. Positive elevation points toward habitable space: outside radius `Ro+hOutside`, inside radius `Ri−hInside`. Future radial clearance is `Ro−Ri+hOutside+hInside`, with positive radii and an agreed clearance margin. No hidden constraints or clamps were applied to legacy terrain. Inter-surface passages are distinct from coordinate-equivalence seams and remain unimplemented.

The roadmap now records **A4 architecture → A5 seam-aware editing/continuous navigation → A6 spherical/polar continuity → A7 hollow/cylindrical/other initial geometries → subsequent full heightmap capabilities**. Earlier brush/interchange pass numbering is explicitly superseded. No later implementation was begun.

## Verification and preservation

| Check | Result |
| --- | --- |
| `npm.cmd test` | 76/76 passed: all 62 existing tests plus 14 surface/catalog/compatibility tests |
| `npm.cmd run test:browser` | 91 passed, 1 existing skip of 92 scheduled; Chromium desktop and Pixel 7 profile |
| Skipped case | Existing duplicate desktop native single-touch test; mobile drag and desktop/mobile pinch/tap tests pass |
| `npm.cmd run build` | Passed, including `tsc --noEmit` |
| Application build | Same 37 modules and same assets as A3: `index-BrTHMxVU.js`, `index-DHjEmbV3.css`; opt-in math is not bundled into App |
| Editor runtime / numerical engine / v1 persistence | No modifications to App, components, styles, interaction, rendering, history, terrain or persistence source |
| v1 codec source blob | Approved A3 and current source both `09650afadc96e51ea715dad7f403d9ddb42913cb` |
| `git diff --check` | Passed after normalizing new text files |
| Historical preservation | A0–A3 reports and evidence unchanged; A3 screenshot regressions now write to ignored test output |

The frozen A3-compatible fixture is a 64 × 32 v1 map with 2 × 1 logical dimensions, sea level 12.5 m, signed zero and nontrivial exact elevations. It was generated during A4 using the encoder source whose Git blob matches the approved A3 baseline. The fixture's base64 wrapper is test transport only, not a new external import/export format.

Unit tests prove all-sample correspondence between the legacy grid and the new bounded lattice; negative/multiple-period equivalence; idempotent normalization; wrapped neighbor continuity and real boundary rejection; tangent orientation transport; independent surface IDs/buffers; and nonmutation through topology/metric/camera transforms. The fixed v1 record decodes, binds and re-encodes to identical metadata, checksum and every elevation byte.

The added browser test opens that saved record through actual map selection/Open, verifies its 2:1 proportions, zooms/pans, applies Raise, undoes it and saves the original full byte digest, then redoes/saves changed elevations while retaining metadata and terrain identity. It runs in disposable Playwright storage, not the owner's browser profile. Existing regressions also prove blank ocean, all four brushes, full-screen overlay/focus, touch/pen, cancellation, Reset history, save/close/reopen, corruption rejection and unsaved warnings. No unsupported shape selector was added.

Preservation screenshots were generated by real interactions and inspected directly:

- [Desktop: legacy save reopened and continued](evidence/a4-desktop-legacy-preserved.png)
- [Mobile: legacy save reopened and continued](evidence/a4-mobile-legacy-preserved.png)

The fixture intentionally uses a coarse numerical grid, visible as nearest-neighbor blocks. The mobile open panel overlays its map center; numerical assertions independently verify the saved terrain and proportions. These images show the preserved editor, not a working spherical or wrapping mode.

## Outstanding decisions and risks

- Legacy flat maps have no physical scale; no map-unit-to-meter conversion was invented.
- General seam graphs require reciprocal/orientation/corner-cycle and metric validation. The flat periodic example is not evidence of complete multi-face or spherical continuity.
- The proposed cube-sphere needs exact face bases/ownership rules, corner Smooth/interpolation policy, physical footprint tests, selected projections and actual browser memory/performance budgets.
- Nonrectangular masks, independent cylinder ends/caps, allowed flat edge gluings, nonorientable/nonmanifold custom surfaces and elevated-relief travel distances need later providers or research.
- Hollow clearance tolerance, geometric edit rejection/constraint policy, active-surface Undo presentation and future historical semantics remain explicit decisions.
- Future multi-surface persistence needs a separately tested versioned format and migration/conversion policy. Keep the v1 reader/original records; never silently treat independently authored v1 endpoints as one periodic sample.

These items are not blockers for the bounded A4 foundation; none is exposed as completed editor functionality. They define later acceptance work and are detailed in the architecture document.

## Exact changed files

- `docs/A4-COMPLETION.md`
- `docs/ARCHITECTURE.md`
- `docs/evidence/a4-desktop-legacy-preserved.png`
- `docs/evidence/a4-mobile-legacy-preserved.png`
- `docs/PHASE-1-HEIGHTMAP-ROADMAP.md`
- `docs/WORLD-SURFACE-ARCHITECTURE.md`
- `package.json`
- `README.md`
- `src/surfaces/compatibility.test.ts`
- `src/surfaces/contracts.ts`
- `src/surfaces/legacy-planar.ts`
- `src/surfaces/rectangular.test.ts`
- `src/surfaces/rectangular.ts`
- `src/surfaces/world.test.ts`
- `src/surfaces/world.ts`
- `tests/fixtures/saves/a3-v1-heightmap.json`
- `tests/surface-compatibility.spec.ts`
- `tests/workspace.spec.ts`

## Delivery and review

The commit containing this report is the A4 delivery checkpoint; its exact SHA is included in the owner-facing completion response. It is pushed directly to main as authorized. Ember's independent A4 review and owner hands-on acceptance remain pending. Chromium input emulation and automated checks do not claim every physical device/browser or human acceptance.

The original Serrian Tide website, its Worlds/Atlas implementation and database were untouched. No server infrastructure, deployment, unsupported functional UI modes or A5 implementation was added. Stop after A4.
