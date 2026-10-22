# Cube-I correction checkpoint: separate holes, tunnels and map links

2026-10-21. Based on Cube-H delivery `407447d7271913f44a6c6c18a5fec48c25d43205`,
owner-approved solid `d011a377e6a1ad76296e41740422fa5600f69082` and hollow foundation
`543cb6211905a8fffc78013eec9b06d144b94e5b`.

**Initial correction checkpoint technically verified. Final Cube-I acceptance remains blocked by unfinished terrain-aware excavation.** Cube-H owner testing has not been declared
accepted. I is authorized provisionally; owner-reported H defects take priority.
Stop after I for Ember's independent GitHub review and final owner acceptance.
No pyramid code, original website, database, Docker, hosting or Production changes.

## Corrections

- One shared hollow brush choice: tool, requested physical radius, strength,
  intensity, Flatten target and renderer follow the creator across Outside/Inside.
  Each side still enforces its own supported radius range. Solid defaults and
  numerical brush mathematics remain unchanged.
- Guided travel preserves user look direction and zoom while moving. Choosing a
  new segment aligns the camera once, retaining zoom. The previous pose update
  reset both every frame; a browser regression reproduced the loss.
- Native touch cancellation exposed a mobile recovery overlap: navigation covered
  **Undo stopped stroke**. The existing notice now appears above navigation and
  remains below the shared storage-error notice. Actual native cancellation,
  blocked Save, dismissal and exact recovery are tested on both hollow sides.
- Hollow editor accessibility labels identify Outside/Inside correctly. UI text
  explains shared brush settings and per-side radius bounds.
- Retained the accepted 24k Canvas inspection budget. Idle 48k/96k refinement was
  evaluated and deferred: the highest trial approached 475 ms for a rebuild. This
  pass prioritizes the accepted painting path over additional fallback detail.
- Cut Hole creates an independent ThroughHole object with matching opposite-side
  mouths. Circular width is adjustable during placement and afterward, with a
  matching physical outline, numerical width and on-map Smaller/Larger controls.
  Object/mouth identities survive resize and move. Holes never enter network counts.
- Create Tunnel takes independent entrance/exit picks, validates a proposed route
  using accepted Cube-B middle-shell routing, shows its physical cut without
  committing, then requires Create proposed tunnel. Advanced node editing is
  separate from routine placement. Map Links retain distinct saved semantics.
- Guided inspection now derives clearance and travel scale from the actual hole,
  portal or segment radius, including after resizing. It does not use the current
  creation-tool size; narrow resized holes have dedicated GPU/Canvas regressions.
- v7 persists holes and the existing bounded exact metadata Undo/Redo journal.
  Both stacks survive Save/Open, with structural/word-chain/geometry validation.
  v1-v6 keep their original interpretation; Open does not rewrite old records.
  Explicit v6-to-v7 Save is an atomic permitted upgrade, preserving immutable World
  metadata. Old v6 shaft/network identities are not silently reclassified.
- Mobile excavation errors now appear above navigation so Dismiss is reachable;
  on-map sizing controls must not send pointer events into placement/painting.
- Browser trace artifacts now go outside the live development tree. The preview
  log exposed 102 reload requests from temporary trace HTML; test output must not
  interrupt a creator session.

No new brush executor, pointer controller, worker manager, history engine or terrain
authority was introduced. The v7 storage extension adds hole objects and serializes
the existing metadata history after strict bounded replay-chain validation. No fields are rebuilt on a side switch.

## Capability audit: Cube-A through H

"Verified" below means automated numerical and/or browser evidence within the
stated domain; it is not owner acceptance or a promise of future capabilities.

| Capability | Verification and result | Supported limitation / acceptance risk |
| --- | --- | --- |
| Solid creation/editing | Normal Atlas N128/N256 creation, four tools, real changed canvas pixels, exact gesture history and reopen/continue in `cube-editor`, `cube-corrective`, `cube-world` browser tests. | Accepted reference-surface height field/relief, not a globally displaced 3D terrain mesh. |
| Hollow creation/editing | Normal two-surface World, independent hashes, scoped Undo/Redo, return outside and continue; H browser tests plus I shared-control and cancellation cases. | Two cached surfaces cost more memory than one. |
| Exterior/interior physical coordinates | G chart/normal/identity tests; numerical positive elevation and independent tool tests; I moved/resized apertures on all six faces from both roles. | Inward public chart differs from the intrinsic math chart; no buffer/elevation negation. |
| Faces, edges and corners | A/B topology/route/oracle and C1/C2 tests; browser multiface/net and physical corner gestures, exact alias ownership and history. | Unfolded chart cuts terminate a gesture rather than teleport across a gap. |
| Brush behavior/continuity | Shared 200 m/dab defaults and falloff; accepted four-tool source tests, UI parity, native sustained corner runs and exact Undo/Redo. | Explicit bounded queue/input/dab/history limits and stopped-prefix recovery remain. |
| Folded/unfolded views | G and E browser projection/normal/pixel checks, independent hollow net/3D edits and switching without geography changes. | View changes do not convert terrain. |
| Navigation, pen and touch | Accepted four-direction direct-drag regression, native pen/single-touch/two-finger tests, no accidental painting, Canvas/GPU paths. | Pixel 7 emulation on a desktop, not a physical phone test. |
| History/cancellation | Exact source-word and metadata replay, native cancelled-prefix recovery on both sides, opposite-side hashes unchanged. | v7 metadata journals survive Open; terrain gesture histories remain session-only. A conflicting metadata replay fails safely. |
| v5/v6/v7 persistence | All canonical Float32 words, signed zero, identities and geometry; N128/N256 codecs, ordinary reopen/continue and corrupt Open. I mixed library opens v1-v7 without rewriting old records. | Browser/profile/origin/device local; no export/cloud/crash-autosave claim. |
| Linked entrances | Reciprocal picked locations, side navigation, metadata Undo/Redo, removal, external identities and unavailable-destination feedback. | Links remove no shell material; external maps cannot be opened here. |
| Independent direct holes | Own ThroughHole/mouth identities; matching opposite-side placement, accurate circular preview, numerical/on-map resize, move/remove, zero network entries, exact persisted metadata replay and both renderers. | Circular reference cuts; custom outlines, unequal end sizes and terrain-aware apertures are unfinished. |
| Physical excavation | Actual outer material minus inner cavity and capsule/ball union; CPU rays/free-volume, rendered opening/rock pixels and restored geometry checked. | Reference-shell geometry only. Terrain-aware excavation remains an explicit final-acceptance blocker, with the guard retained until replaced correctly. |
| Tunnel/branch/chamber authoring | Browser resize/reposition, third opening, branches, chamber growth, removal/restoration and v7 reopen; I numerical bent loop and vertical shaft. | Current node/segment controls are not the future visual Tunnel Network Designer. |
| Bidirectional inspection | Continuous positions, branch choices, reverse/emerge, look/zoom while moving and return to terrain; both renderers. | Guided centerline routes, not free first-person collision-aware travel. Crossings need explicit authored graph junctions. |
| Shell safety/recovery | Strict envelope/precision/edge/overlap/ground tests, stale opposing/geometry leases, invalid publication and corrupt rehashed saves rejected atomically. | Conservative support/AABB tests can reject otherwise plausible sites/networks. Reject unsupported terrain atomically; do not recommend flattening geography as a solution. |
| Performance/resources | Native timestamp/stage and changed-terrain-pixel observer, held gestures, presentation/frame gaps, switching, Save/Open and declared retained resources. | Measurements and remaining fallback costs are reported below; no physical-device or maximum-network-speed claim. |

## Verification and measurements

- Numerical suite: **1,196 passed**. TypeScript and production build passed.
- Family browser run: **58 passed**, desktop and Pixel 7 emulation. After the
  inspection-radius correction: **22 targeted checks passed**, including the new
  small resized-hole cases, both renderers, persisted history and v6 upgrade guards.
  Automatic hole cases explicitly verified hardware WebGL2 and changed rim pixels;
  Canvas cases verified the same dimension change. No physical phone was used.
- Native sustained/fast cases: **14 passed**. All twelve ordinary 15-second,
  900-move corner strokes completed, with exact full-gesture Undo/Redo and changing
  terrain pixels while held. All p95 latencies were below 180 ms; largest ordinary
  observed input-to-visible latency was 142.2 ms.
- Broader existing-geometry coverage: **372 passed, 2 intentional skips** across
  desktop/mobile. The original 374-case run had 368 passes and four failures in
  two older flat-map tests: a tools-panel action raced asynchronous Open, and a
  camera snapshot preceded completed Zoom. Their data/history/camera assertions
  were retained; the tests now wait for the actual completed UI state. The exact
  four cases then passed a targeted rerun. No flat-editor runtime change was needed.
  Both the original outcome and matching rerun are retained in the receipt.

Input-to-visible p95 in milliseconds, one current trial per case:

| N | Renderer | Approved solid d011 | H outside | H inside | I solid | I outside | I inside |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 128 | WebGL2 | 53.4 | 42.3 | 52.5 | 41.2 | 50.0 | 47.1 |
| 128 | Canvas | 45.2 | 39.1 | 50.9 | 36.8 | 39.3 | 39.1 |
| 256 | WebGL2 | 61.1 | 59.1 | 64.8 | 57.2 | 59.3 | 62.4 |
| 256 | Canvas | 187.9 | 55.9 | 109.3 | 51.7 | 52.6 | 76.9 |

Historical figures come from the preserved H receipt, not rerun campaigns.
I's shared physical brush radius is 45 km on both sides; historical H inside used
36 km. Inner comparisons therefore have different physical footprints. The approved
solid N256 Canvas sample missed the 180 ms target at 187.9 ms; preserve that
qualification. These are current measurements, not a guarantee across devices.

The extreme N256 exterior sweep sends 240 moves over three seconds and produced
891 exact dabs. Both renderers completed all 241 accepted inputs with zero
uncompleted inputs and exact Undo, with 27-28 changed-terrain observations while
held. However, p95 input-to-visible latency was **2,715 / 2,738 ms**, with roughly
**2.88 / 2.91 seconds** of release backlog. This stress case remains visibly delayed;
passing its correctness/progress test does **not** mean fast-motion lag is fixed.
The accepted brush executor has not been replaced or work silently thinned.

Six N256 side-switch samples took **63.5-65.1 ms** from click to two paint
opportunities (host drain 11.9-14.7 ms), comparable to H's 63.6-64.8 ms. One N256
v7 Save/Open trial took **155 ms / 2,023 ms** and restored both exact terrain hashes
and all connections. These are samples, not distributions.

Declared retained buffers/textures/pixels with the same nine-primitive N256 network
remain **90.4 MiB** (94,758,460 bytes), versus H's 94,758,444 bytes; the extra 16 bytes
are retained metadata history. The approved single solid baseline was 38.6 MiB.
This excludes JS object overhead, transient history serialization, process RAM and
GPU-driver overhead. Largest 48-primitive or maximum-history performance is unproven.


## Remaining limits and unfinished requirements

H's correctness safeguards remain: lowering is limited to one quarter of nominal
wall thickness per side; inner positive height to one quarter of the inner side;
outer positive height to the outer side. The interim validator still requires excavation interpolation support at exactly
0 m throughout the permitted lowering envelope. The owner rejects that as final
behavior. Terrain-aware positive/negative mouths are a required remaining feature,
not deferred to an unrelated geometry or waived by this checkpoint.
Mouths require valid perpendicular cuts away from face edges/corners. Minimum
radius is 0.001% of the outer side and minimum excavatable wall thickness is 0.01%
of that side, matching the existing display-precision safeguards. These bounds
can prevent crawl-scale openings on planet-scale Worlds until multiscale precision
is implemented; this checkpoint makes no such unsupported scale claim. The tunnel route template limits radius to fit its middle-shell corridor. Independent
holes have no wall-thickness-fraction width cap; both mouth disks must fit their
actual faces and supported precision. Alternative shapes/end sizes remain future
aperture versions.

At most 48 shared cutting primitives (one per hole, balls/segments per network),
eight networks, 128 links and 256 KiB connection
data are supported. Connection history is 64 entries / 4 MiB; v7 persists both metadata history stacks; terrain retains its
accepted session-only bounded exact whole-gesture history and creator-visible stopped-stroke
recovery. Separate networks with overlapping conservative bounds are rejected;
extend one connected network instead. No silently successful failed prefix is allowed.

Canvas inspection still has visibly coarser detail and slower movement than hardware
WebGL. This is not full-resolution physical rendering. Maximum
48-primitive performance and physical-phone behavior are not established by these runs.

## Required next architecture and underground work

The [shared inventory and Pyramid-A proposal](ATLAS-SHARED-EDITOR-ARCHITECTURE.md#cube-i-readiness-inventory)
identify reusable host/input/scheduling/publication/history/storage contracts and
the specialized topology, metrics, projections, containment and aperture mathematics.
Proposed Pyramid-A boundaries are physical contract, canonical topology, certified
metric adapter and numerical readiness review before the following usable editor.
They authorize no code and remain subject to the one-week narrowing rule.

The [terrain-aware dependency/checkpoint plan](CUBE-I-TERRAIN-EXCAVATION-CHECKPOINTS.md)
records the substantial shared material, aperture and presentation work that must
agree with clearance, preview, exact history and saves before this correction is complete.

The owner's [permanent underground roadmap](UNDERGROUND-NETWORK-ROADMAP.md)
separates physical through-holes/breaches, physical tunnel-network entrances and
supporting linked-map navigation. Direct local underground access must not require
an extended shaft or opposite-surface connection. Terrain-aware/underwater and vehicle-validated
breaches and scalable world-spanning networks need versioned aperture, coordinate,
depth/level, curve/section and spatial-paging contracts.

The visual plan/profile designer is required alongside Phase 5 professional
multiscale mapmaking. Full free, collision-aware first-person exploration belongs
in Phase 6 comprehensive 3D. Guided H/I inspection does not fulfill it. The bounded
proposal stages local access/contracts, visual network editing, curves/sections/
levels, scalable geographic storage, then coherent full-3D collision/traversal.
All reuse Atlas rather than introducing another application or editing engine.

## Try it and review

Open **http://127.0.0.1:5260/**, create a Solid or Hollow cube at N128/N256, draw in
3D or the unfolded map, and Undo/Redo. For a hollow World, change brush choices and
switch Outside/Inside; independently sculpt both, save, reload and open it again.
For the current reference-shell checkpoint, Cut Hole on eligible level terrain,
change its width, move it and check zero tunnel networks. Create Tunnel takes two
independent picks followed by preview/confirmation. Sculpted endpoints fail clearly
and atomically; they remain unfinished. Inspect either physical feature, reverse
travel, then return to terrain. Save/Open restores the World geometry.

Implementation: [95561ca32087c661fdb1f59de020b8bf94afc30c](https://github.com/Revty79/serrian-tide-world/commit/95561ca32087c661fdb1f59de020b8bf94afc30c).
The [compact verification receipt](evidence/cube-i-receipt.json) records current
cases, original/rerun regression outcomes, timings, retained resources and limits.
The following delivery commit records that receipt and the test synchronization
repairs; it changes no runtime code.

Stop here for Ember's published-source review and the owner's checkpoint testing.
This is a functional initial circular-hole checkpoint, not final Cube-I or
cube-family acceptance. Terrain-aware excavation remains required next work.

To reproduce checks, use the installed Node 24 toolchain, `npm.cmd test`,
`npm.cmd run build`, and the three `playwright.cube-i*.config.mjs` configurations.
Set `ATLAS_PREVIEW_URL` to the running preview (5260 in this delivery; otherwise
Vite defaults to 5173). The long configuration uses `CUBE_LONG_OUTPUT` and
`CUBE_HOLLOW_LONG_OUTPUT` to keep current metrics separate from historical H data.
Run the legacy configuration from `.local/cube-i-regression-run` after creating
its `docs/evidence` directory: older tests use relative evidence paths, so running
from the repository root would overwrite historical receipts/screenshots. The
configuration's testDir and server cwd remain the repository root. Set
`CUBE_I_REGRESSION_REPORT` to a separate absolute JSON path for a targeted rerun.
These steps keep historical evidence intact; no extra benchmark archive is needed.
