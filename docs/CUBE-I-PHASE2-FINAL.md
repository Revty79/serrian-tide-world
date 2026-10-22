# Cube-I Phase 2 verification after owner scope correction

2026-10-21. Phase 2 technical verification complete; Ember's independent review
and final owner acceptance remain pending.

The owner's latest scope correction supersedes the earlier requirement to finish
displaced-terrain excavation during Cube-I. Finish the existing Phase 2 cube
editor, preserve compatible research and fixes, then stop for Ember's independent
review and owner acceptance. No next geometry is authorized.

## Stable checkpoint and preserved work

Research checkpoint:
[`204f460dc95ae7312514bf5c339c1f16d8a9d40b`](https://github.com/Revty79/serrian-tide-world/commit/204f460dc95ae7312514bf5c339c1f16d8a9d40b).
It preserves the isolated bilinear material experiment and its numerical fixtures,
plus the shared capsule-ray correction. The capsule fixture reproduces a false
hit from the old calculation: a ray a billion meters away and 0.25 m off-axis
incorrectly hit a capsule of radius 0.125 m. Closest-approach calculations avoid
that cancellation. Existing CSG cases and experimental queries pass together.

The [research contract and precise test claims](CUBE-I-TERRAIN-MATERIAL.md) describe
signed heights, edge/corner joins, oblique intersections, submeter cuts, bent
passage clearance, source revision checks and cancellation. These are numerical
research results, not an approved universal physical-terrain architecture.

The experiment has **no production imports**, is absent from the production
bundle, and is unintegrated with normal rendering, excavation editing, collision
or saved World formats. v1–v7 keep their current meanings. No new save version,
terrain mesher, tiled terrain system or editor engine was introduced. Brush,
worker, scheduling, publication, pointer handling and exact history remain intact.

## Current supported editor

- Solid/hollow N128 and N256 authoring, four terrain tools, folded/unfolded views,
  independent exterior/interior geography and existing direct camera movement.
- Current physical 3× and net 6× zoom; navigation/inspection retain the established
  behavior. No major magnification or terrain-detail architecture was added.
- **Hole:** independent direct reference-shell breach, corresponding opposite
  mouth, adjustable width, resize/move/removal, exact metadata history and Save/Open.
- **Tunnel:** independent endpoint picks, validated proposal, continuous physical
  sphere/capsule route, supported branches/chambers and guided inspection.
- **Map Link:** separate reciprocal abstract World/map/location identity. It does
  not cut material or stand in for travel along a physical tunnel.
- WebGL2 and Canvas, normal painting, explicit cancelled/stopped-prefix recovery,
  guarded Save/Open and compatible library records.

Excavation still requires eligible zero-height support away from edges/corners.
The minimum circular radius remains 0.001% of the outer side; wall thickness must
meet existing display precision. These bounds can exclude small openings on very
large Worlds. Holes have no universal wall-thickness-fraction size cap; their
mouths must fit the actual supported faces. The routing template has its own
corridor-size bound. Limits and rejected edits remain explicit and atomic.
The supported resource limits remain 48 shared cut primitives, eight networks,
128 links and 256 KiB connection metadata; exact metadata history is 64 entries /
4 MiB. Conservative support/overlap checks may reject plausible arrangements.
Canvas inspection detail, maximum-network performance and physical-phone behavior
retain the qualifications in the [published audit](CUBE-I-COMPLETION.md).

## Verification

- Full numerical suite: **1,213 passed**; targeted material/CSG suite after moving
  the independent capsule regression: **20 passed**.
- TypeScript and production build: **passed**.
- Current family browser run: **62 passed**, desktop and Pixel 7 emulation,
  covering current holes, tunnels, navigation, independent surfaces, history,
  Save/Open and both rendering paths. No physical phone was used.
- Ordinary sustained painting: **12 passed**, solid/outside/inside at N128/N256
  with hardware WebGL2 and Canvas. Each case delivered 900 moves over 15 seconds,
  completed all 901 accepted inputs, visibly changed terrain while held and
  restored exact terrain through whole-gesture Undo/Redo. Eleven cases finished
  before the application interruption; the one remaining case passed separately
  on unchanged runtime source. No extreme-speed optimization or acceptance gate.
- Earlier broader regression: **372 passed, two intentional skips**, including
  the four diagnosed test synchronization repairs, retained in the
  [published receipt](evidence/cube-i-receipt.json). The runtime delta since that
  delivery is confined to the shared hollow capsule-ray query; the material
  experiment has no authoring imports. Sphere, cylinder and flat runtime code did
  not change in this follow-up.

The [current compact receipt](evidence/cube-i-phase2-receipt.json) records the
completed case identities, interrupted/resumed run distinction, renderer checks,
latencies and retained limitations. Historical receipts remain unchanged.

Input-to-visible p95 in milliseconds, one trial per case; each cell shows the
earlier published I sample followed by the current sample:

| N | Renderer | Solid | Hollow outside | Hollow inside |
| --- | --- | --- | --- | --- |
| 128 | WebGL2 | 41.2 → 45.6 | 50.0 → 49.8 | 47.1 → 53.8 |
| 128 | Canvas | 36.8 → 41.7 | 39.3 → 41.4 | 39.1 → 44.4 |
| 256 | WebGL2 | 57.2 → 76.0 | 59.3 → 68.5 | 62.4 → 110.2 |
| 256 | Canvas | 51.7 → 71.5 | 52.6 → 75.1 | 76.9 → 117.3 |

All current p95 samples remain below the existing ordinary-use test bound of
180 ms; the largest individual observed latency was 222.9 ms, below its 500 ms
bound. Eleven of twelve current samples are slower than the prior I samples.
These single trials establish no painting-speed improvement or device-wide
guarantee. The accepted brush engine was unchanged. Historical H inside used a
different radius; the receipt preserves that comparison condition separately.

## Mandatory future architecture and review

Watertight displaced terrain for all compatible shapes, correct material thickness,
small physical features on enormous Worlds, mountain/seabed openings, scalable
precision/local detail/rendering, the full visual Tunnel Network Designer and
free collision-aware exploration remain mandatory. The visual designer belongs
alongside Phase 5 multiscale mapmaking; comprehensive physical rendering and free
travel belong in Phase 6. They must use one coherent physical geography model.
Integration is paused until that shared architecture is deliberately designed and
authorized; the cube experiment does not preselect the architecture for other shapes.

After acceptance and separate authorization: **Hollow Sphere → Hollow/Open Cylinder
→ Solid/Hollow Pyramids → remaining geometry inventory**, within the unchanged
eleven-phase roadmap. Original website, Worlds/Atlas pages, databases, server,
Docker and Production remain untouched.

## Owner check

Open **http://127.0.0.1:5260/** in the normal browser. Create a solid or hollow
cube, paint across faces in 3D and the unfolded map, Undo/Redo and save/reopen.
For hollow geography switch Outside/Inside and verify independent terrain and
retained tool choice. On eligible level ground, Cut Hole, change width and move
it; verify the tunnel count stays unchanged. Create Tunnel with independent picks,
inspect/confirm it, follow it in both directions, then save/reopen and continue.
Map Links remain separate advanced controls. Repeat with Canvas fallback if useful.
Sculpted-terrain excavation should reject clearly while preserving the World.

Stop for Ember's source review and owner acceptance. Automated verification is
technical evidence, not a substitute for the owner's experience or approval.
