# Horseshoe Worlds final technical review

Pass 9 implements **Horseshoe World** only. Technical qualification is complete;
owner acceptance and physical-device performance are separate and remain open.

## Published checkpoints and scope

- Foundation A: `1c238cfe01a546fdaf1a642ab0fa24677a5a73b6`.
- Operational B: `d91998d71a9229bf89429386e13f2a69a6672fd4`.
- Completion C: the commit containing this review and `evidence/horseshoe-complete/receipt.json`.

Each checkpoint has a separately frozen receipt. Final publication requires a
clean tree, HEAD/origin/main/direct-remote parity and an independent Git-object
hash audit. The recovery branch `recovery/excavation-paused-2026-10-23` stays at
`35f7f5d34edf861c33c5eb4decad92d41664c749`. No excavation code is restored.

## Physical model and controls

A genuine closed U prism joins two straight substantial arms through a faceted
elliptical half-bend. The open gap is outside the solid. Upper and lower caps,
inner/outer bend walls, four arm sides and two positive-width end faces are real
physical surfaces. The 116 vertices, 114 physical polygons, 228 triangles and
342 edges form one oriented closed manifold, Euler characteristic 2. Sixteen
bend intervals and six intervals on each arm define the actual reference solid.

World Scale uniformly scales all material dimensions. Bend Curvature controls
the longitudinal bend radius `Scale/(2*Curvature)`. Explicit arm length, center
spacing, width and thickness ratios control the actual solid; the creator shows
physical arm length, gap and thickness. Flat and beveled ends retain real closed
terminal faces. Beveling narrows the last Width/4 to 75% width; it does not taper
to a zero-width Crescent tip. Dimensions are fixed after creation. The complete
supported ranges and equations are in [the geometry specification](HORSESHOE-WORLDS.md).

## Reuse, distances and picking

The shared polygon-prism construction, surface distance, brush binding, view and
presentation modules retain Crescent compatibility entry points. They use the
accepted indexed authority, physical-gradient field, polygon atlas, palette and
relief, four-quarter-pixel shader, dirty journals, workers, scheduling, history,
ConnectedWorkspace and Atlas lifecycle/persistence. Four prior Crescent physical
bit fingerprints remained identical through construction extraction.

Cap paths use exact-sign visibility and outward interval Dijkstra bounds inside
the real U footprint. Local transitions use certified hinges/cones/saddle-apex
routes and bounded genuine prism search. Unsupported remote wall queries fail
explicitly. Projection is a lower bound, never a replacement surface distance.
Opposite-arm pruning uses the real inner-bend cut at z=0, so no route crosses
empty space. Pointer subdivision follows connected material. Real triangle rays
pick the surface; inward-arm focus clears the other arm before targeting it.

Focused numerical checks passed **51/51**. Independent 70-digit Decimal arithmetic
enclosed all **352** local cone/saddle cases. Optimized visibility agreed with the
original full-triangle rays in **45,600** comparisons over four supported profiles,
all faces, aliases and ten camera directions. Browser focus tests additionally
round-trip every native gesture position onto its intended real physical point.

## Resolution, resources and actual latency

N128/N256 equivalent profiles use 32/64 subdivisions per chart and own exactly
116,738 / 466,946 Float32 words (466,952 / 1,867,784 authority bytes). New terrain
starts at -100 m; finite elevation limits remain +/-Thickness/8. Observed display
cache ownership is 14,228,880 / 49,148,136 bytes. GPU field textures use
3,972,672 / 15,412,800 bytes plus 46,512 static mesh bytes. The 228 texture layers
fit the WebGL2 minimum of 256. Existing Canvas desktop 1.5M/coarse 650k and GPU 3M
backing budgets and all shared history/work/queue limits are unchanged.

Installed Chrome used actual AMD Radeon RX 6600 ANGLE/D3D11 WebGL2 and separately
forced Canvas. Heavy browser tests ran sequentially, one worker, no retries, at
BelowNormal priority. Measurements include captured output pixels, not just
pointer delivery or commit timestamps. Each profile covered fourteen physical
regions with all four tools, exact Undo/Redo, a 15-second held stroke, normal
Save/Open, camera retention and continued editing: **224** region/tool gestures.

| Profile | Worst ordinary p95 ms | Held p95 ms | Worst first pixels ms |
| --- | ---: | ---: | ---: |
| n128-auto | 44.6 | 28.1 | 65.4 |
| n128-canvas | 44.3 | 39.6 | 65.4 |
| n256-auto | 39.7 | 30.1 | 61.6 |
| n256-canvas | 43.1 | 53.3 | 79.7 |

Existing gates remain ordinary <125 ms, held <100 ms, navigation <150 ms and
first pixels <1000 ms. Close-arm N256 p95 values were 34.4 ms WebGL2
and 39.8 ms Canvas; opposite-arm words remained identical, both
inward faces were editable and a whole U-body gesture was exactly undoable.
Navigation pixel p95 values were 7.5 / 26.0 ms.
Pan, rotation, zoom, Fit, overview, focus and map navigation preserved words/history.

## Rendering, history, persistence and recovery

Forty matched poses (twenty at each detail) cover upper/lower surfaces, every
focus region, real ends, inner/outer bend, oblique and map views. Independent
projected geometry checks alpha coverage and silhouettes, including pixels
missing from both renderers. Stable and independent field color maxima were
**2/255**, within the unchanged 3/255 gate; coverage/outside/diagonal/strip-seam
violations were zero. The established bounded two-texel coast-support allowance
is retained. Actual captures were visually reviewed. Real edited incremental
fields, all atlases, GPU images and Canvas images exactly equaled fresh rebuilds
at both details.

Six physical cap/wall joins per backend cover bend, both sides and both terminal
ends, with input processing, exact whole-gesture history and actual pixel gates.
Empty-gap physical picking paints nothing. Raised geography, unchanged lower
surfaces and close arms are checked separately. Completed ordinary gestures have
zero discarded positions and all accepted positions processed.

New strict format **37** preserves raw/derived construction, identities, topology,
detail, all Float32 words including -0, tools, camera and navigation. It validates
exact schema fields, physical limits and SHA-256 header/payload before replacement.
Corrupt Open retains the current canvas and exact geography. An incompatible
saved geometry under the same identity is rejected. Cooperative Save detects
authority edits. Undo history starts fresh after Open, as in the accepted family.

Worker protocol fault tests preserve an exact undoable/redoable failed prefix and
recover with a fresh worker stroke on both backends. Graphics context loss uses
the warm current Canvas field and restoration retains the painted epoch. Four
extreme creator/backend cases remain editable and invalid creation retains the
active World. Trusted CDP touch/pen and two-finger navigation pass in desktop
coarse emulation and Pixel 7 phone viewport emulation on both backends; captions
record actual viewport dimensions. These are not physical-device measurements.

## Efficient regressions and evidence qualifications

The dedicated `playwright.horseshoe-regression.config.mjs` selects fourteen cases:
four directly affected Crescent workflows/pixels/incremental checks, plus ten
representative solid/hollow polyhedral, Torus and Ringworld checks. All pass.
No full historical browser suite was repeated. Earlier Crescent A/B/C and both
Horseshoe receipts are independently checked against their committed Git blobs.

Raw failed/interrupted diagnostics remain distinct from accepted results. The
first short-point fixture generated 240 positions for a 256-position gesture;
the corrected fixture retains all original painting gates. A later cold preview
navigation consumed 120.3 seconds before configuration editing, then the same
warm configuration passed normally. The new close-gap test's creator initially
hit the default 15-second click deadline although creation completed; its final
run uses the existing helper's 120-second setup deadline. No application change
was needed for either setup issue. Application source is unchanged from B.

## Limits and owner acceptance

This is the documented faceted reference solid with fixed construction parameters,
finite physical elevation clearance and the stated local non-cap metric domain.
It colors connected geography on the real boundary; full material displacement,
arbitrary-height excavation, hollow variants, links and free 3D exploration are
deferred. Existing bounded coast reconstruction remains visible at high zoom.
The build's existing large main-chunk advisory is unchanged.

Owner review should inspect the physical U and end faces, paint all major regions,
cross the bend and cap/wall joins, try close arms and representative dimensions,
navigate physical/maps, and Save/Open on the owner's actual target devices.
Technical evidence does not substitute for that acceptance. This pass authorizes
no Arc or other next shape, website integration, deployment or database changes.
