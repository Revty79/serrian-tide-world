# Cube-H: editable hollow Worlds and physical excavation

2026-10-21. Technical delivery for Ember's independent source review and the
owner's hands-on acceptance. The owner accepted solid `d011a377` and hollow
foundation `543cb621` for progression. **Stop here; Cube-I and further geometries
are not authorized.**

## Try the World workflow

Open **http://127.0.0.1:5260/** on the current local preview, or run `npm.cmd run dev`.

1. Choose **New World / Map → Hollow cube world**. Enter a name, outer/inner side
   lengths and N128 or N256. N128 is the lighter starting choice.
2. Open Atlas tools. **Paint Outside / Paint Inside** select independent geography.
   Raise, Lower, Smooth and Flatten work in 3D and the unfolded map. Additive
   strength starts at the accepted **200 m/dab**. Navigate, Space + drag, wheel,
   pen and touch retain the existing interaction conventions.
3. Use Undo/Redo on each side. **Undo / Redo affects** explicitly selects the
   current side's terrain or **Entrances and excavation**.
4. **Add Entrance** picks two reciprocal locations; switch sides between picks
   if needed. The list navigates to either endpoint, moves endpoints or removes
   the link. External destination IDs are preserved and report unavailable
   navigation. Links do not remove shell material.
5. On **untouched ground at exactly 0 m**, choose **Dig Tunnel**, then pick near
   the middle of a face. Its outline previews the opening radius. The tunnel
   connects matching outside/inside openings. Select a junction to add a segment
   or shaft, grow a chamber, change wall-relative position/depth/radius, or add
   another opening. Invalid changes leave the prior geometry intact.
6. **Explore opening → Travel forward**, then select a connected point at each
   junction. Travel continues through the modeled void; reverse to return or
   choose a branch. Pause and drag to look around; wheel/pinch zooms. **Return to
   terrain** exits inspection. Painting is disabled during inspection.
7. Save, close/reload, choose **Browse saved maps → Open Map**, and continue
   painting. Both surfaces, their identities, entrances, real openings and
   passage networks survive. Saves remain local to this browser/device.

## Reuse and new adapters

One App document lifecycle, one WorkspaceChrome and the existing IndexedDB library
host the World. Two cached CubeEditor/CubeEditorSession instances reuse accepted
bounded-phase spacing, C1 brushes, input admission, exact whole-gesture history,
local field updates and independent display scheduling. G's inward chart adapter
handles public coordinates; elevation values and intrinsic storage are not flipped.

Connection edits reuse TerrainHistory's existing word journal through a bounded
Uint32 buffer, with candidate preview and source validation before replay. Terrain
and connection histories have explicit scopes. Journals are session-only, as in
the existing editors; opening a saved World starts fresh histories.

[The CSG adapter](../src/surfaces/hollow-cube-csg.ts) models actual material as
**outer cube − (inner cavity ∪ passage spheres ∪ passage capsules)**. The existing
six-plane renderer cannot expose tunnel walls or place an eye inside a passage,
so CubePresentation gains an optional geometry/eye adapter. WebGL intersects this
volume directly; Canvas retains the accepted terrain atlas and replaces only the
projected excavation region, caching geometric hits between terrain updates.
Perspective Canvas inspection is bounded to approximately 24,000 ray-cast pixels.
Rendering, passability and continuous route inspection use the same physical
volumes. The solid renderer remains the default for solid Worlds.

Version **6** stores a validated parent configuration, orientation/representation,
both independent canonical Float32 word banks, selected side, linked anchors,
passage geometry and apertures. SHA-256 covers metadata and payload. Source leases,
strict sizes/fields, finite values and the shared ground validator precede storage
or document replacement. Existing v1–v5 codecs retain their contracts.

See the [shared architecture inventory](ATLAS-SHARED-EDITOR-ARCHITECTURE.md) for
adapter boundaries and the controlled future migration; no new numerical executor,
worker system or independent authoring workspace was introduced.

## Safety and supported limits

- This excavates the **reference shell**, with protected zero-elevation ground.
  It does not claim the later global displaced-terrain mesh. Choose sites before
  sculpting them. Ordinary weighted Flatten is not an exact local site-reset
  command; that command is not included in this checkpoint.
- Each surface may lower by at most one quarter of nominal wall thickness.
  Interior positive elevation is limited to one quarter of the inner side;
  exterior positive elevation to the outer side. Violations fail before publication;
  heights are never silently clamped by the hollow policy.
- Protection covers projected excavation bounds, two cells of interpolation
  support and the **entire permitted lowering envelope** on both sides. This also
  protects buried branches away from portals. Geometry changes prepare bounded
  support rectangles cooperatively; dabs inspect only changed samples. Both source
  revisions and the geometry epoch must remain valid.
- Portals require perpendicular entrance necks on a single face, away from edges
  and corners. Initial tunnel neck/chamber placement can further restrict large
  radii. Oblique/edge apertures and insufficient material fail explicitly.
- Radius must be at least 0.001% of outer side length, and excavation wall thickness
  at least 0.01%, to respect display-coordinate precision. There are at most
  **48 balls/segments**, **8 networks**, **128 links** and **256 KiB** of connections.
- Overlapping volumes within a network form a genuine union. Inspection offers
  authored graph junctions; it does not infer extra branches at accidental crossings.
  Independent networks with overlapping conservative bounds are rejected; extend
  the existing network instead. Free-flight/game controls are not included.
- Connection history is bounded to 64 entries / 4 MiB. Existing bounded exact cube
  terrain histories remain unchanged. Replay that would conflict with subsequent
  terrain is rejected before publication. Stopped strokes retain explicit recovery,
  rather than being reported as complete gestures.
- Physical-phone behavior and maximum-complexity network performance are unverified.
  Functional mobile results below are browser emulation on the desktop GPU.

## Verification and performance

**1,019 numerical tests passed; build/typecheck passed.** The hollow/foundation
browser sweep passed **28/28**, and existing Atlas regressions passed **86/86**
across desktop and Pixel 7 emulation. Targeted final checks additionally covered
solid N256 painting/dragging, restored opening pixels, actual rock-wall pixels,
continuous travel, branching, removal/replay, corrupt Open and painting after reopen.

Eight native held corner cases passed: **15 seconds / 900 scheduled moves** each,
N128/N256 × both sides × WebGL/Canvas, with a physical tunnel loaded. The four N256
cases passed again after publication-guard integration. Every accepted gesture
completed and Undo/Redo restored exact words while preserving the opposite side.
Changed terrain-canvas pixels were sampled separately from the SVG cursor.

Input → terrain presentation, p95 milliseconds, using the accepted timestamp/stage
instrumentation and the same native corner observer against archived solid d011a377:

| Resolution / renderer | Approved solid | Hollow outside | Hollow inside |
| --- | ---: | ---: | ---: |
| N128 WebGL | 53.4 | 42.3 | 52.5 |
| N128 Canvas | 45.2 | 39.1 | 50.9 |
| N256 WebGL | 61.1 | 59.1 | 64.8 |
| N256 Canvas | 187.9 | 55.9 | 109.3 |

The approved solid Canvas N256 comparison **missed the 180 ms p95 target**; all
four baseline gestures still completed. Hollow cases met the existing 180 ms p95 /
500 ms maximum targets. The largest hollow latency was **331.5 ms**, so these are
measured distributions, not a promise that every dab is instant. Held-frame p95
was about 16.8 ms, with a 33.3 ms worst gap in these runs. Canvas pixel readback
and GPU submission are measured; physical screen visibility may add a frame.

Cached N256 side switches reached paint opportunities in **63.6–64.8 ms**, including
about 14–15 ms of drain/task scheduling. Ordinary tunnel support preparation was
approximately **1–3 ms**. Measured N128 Save/Open was about **0.11 s / 1.1 s**;
N256 with both sides painted and a tunnel was **0.17 s / 2.03 s**, preserving exact
both-side hashes and connections. Held-gesture Undo/Redo measurements ranged about
**22–177 ms** including browser interaction. Detailed preparation/commit/display
stages, first changed pixels, release backlog and resource counts are in the
[compact receipt](evidence/cube-h-receipt.json).

At N256, authoritative terrain is 3.00 MiB for the pair versus 1.50 MiB for solid;
cached display fields are 12.10 MiB versus 6.05 MiB. A physical hollow viewport also
needs the opposing surface texture. The receipt compares retained typed buffers,
canvas pixels and GL texture storage against the actual archived solid presenter.
The declared N256 WebGL totals were about **90.4 MiB hollow / 38.6 MiB solid**,
including both cached hollow viewports. These are not OS resident-RAM or
driver-overhead measurements.

To rerun the new checks from the repository root:

```powershell
npm.cmd test
npx.cmd playwright test --config playwright.cube-h.config.mjs
npx.cmd playwright test tests/hollow-cube-long.spec.ts --project desktop --workers 1
npm.cmd run build
```

The dedicated functional config runs 28 desktop/mobile cases serially on the normal
5173 development URL. Set `ATLAS_PREVIEW_URL` to reuse an existing local preview.
Native long tests use their explicit 1440×950 viewport and Windows ANGLE flag.

## Review evidence and checkpoints

[Outside painted](evidence/cube-h-outside-painted.png) ·
[Inside painted](evidence/cube-h-inside-painted.png) ·
[Outside net](evidence/cube-h-outside-net.png) ·
[Inside net](evidence/cube-h-inside-net.png) ·
[Actual tunnel walls](evidence/cube-h-physical-tunnel.png) ·
[Mobile Canvas tunnel](evidence/cube-h-mobile-canvas-tunnel.png).

Implementation checkpoints: **H1 fa3bb8d**, **H2 e4d6e68**, **H3 7186cbe**,
**H4 329e82a**, **H5 5f28280**. Full implementation SHAs are in the receipt; the
following delivery commit contains this handoff, reproducible test configuration
and evidence. No original website,
shared database, Docker, hosting or Production work occurred.

**Technical verification is complete; independent Ember review and owner
acceptance are still required before Cube-I.**
