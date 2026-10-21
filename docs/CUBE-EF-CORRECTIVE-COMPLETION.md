# Cube-E/F corrective pass

2026-10-21. The owner rejected E/F delivery
`01e897e4220d9ffd0357ff358d73dec32691d51b`: painting was extremely slow, the
background was inconsistent, and rotation felt right. This pass corrects painting
and the normal workspace. **Owner hands-on acceptance remains outstanding. Stop
here for that review.** D1 visual acceptance and the approved geometry order stand.
Historical E/F receipts and evidence remain unchanged.

## Open the corrected workspace

The owner's running local preview is **http://127.0.0.1:5260/**.
Save open work, reload Atlas, then reopen the saved cube or create a new one. This
recreates the editor session with the corrected code; a hot-reloaded tab can retain
an older session instance. Use the same browser profile and address for local saves.
A fresh `npm.cmd run dev` uses port 5173, which has a separate browser-local library.

1. Choose **Solid cube world**, N128 or N256, and create it. Start with the default
   radius (45 km for a 1,000 km edge). Select **Corner** to see adjoining faces.
2. Hold Raise and draw a range across a physical edge and corner. Terrain should
   visibly change while held. Lower carves valleys. Try Smooth and Flatten;
   Open tools exposes radius, strength, intensity and the explicit Flatten target.
3. Navigate or Space + drag rotates; wheel/pinch zooms. Switch to **Unfolded map**
   and draw on the same geography. Displayed joins connect; cuts and blank space
   end the stroke. Check whole-gesture Undo and Redo.
4. Save and wait for **Saved on this device**. Close the tab, reopen this address,
   use **Browse saved maps → Open Map**, and continue drawing.

Explicit saves are browser-local IndexedDB records. The original site and its
Worlds pages, databases, server, Docker, hosting and Production were not touched.

## Audit and correction

Read and compared the actual sphere/cylinder session, worker and component paths:
`spherical-session.ts`, `sphere-worker-stroke.ts`, `SphericalViewport.tsx`,
`cylinder-preview-session.ts`, `cylinder-worker-stroke.ts`, `CylinderPreview.tsx`.
Their useful patterns are tracked canonical changes, independently scheduled
derived display work, coherent published epochs, bounded preparation, coalesced
UI updates and explicit completion/backpressure. Their geometry was not copied.

| Cost | Rejected cube | Corrected cube |
| --- | --- | --- |
| Numerical/display scheduling | Numerical loop awaited field/atlas preparation and a frame | Numerical loop requests independent display work; final drain still waits for the final visible epoch |
| Changed geography and saved state | Full canonical copies/comparisons | Exact copied changed-index handoff after atomic history promotion; sparse word comparisons against the saved baseline |
| Derived field | Whole six-face scan and gradient reconstruction on refresh | Changed vertices, connected one-step stencils and every incident alias, including folds/corners; missed epochs use a full fallback |
| Canvas fallback | Whole-face preparation and replacement | Prepare affected pixel patches in bounded slices, then publish all patches synchronously into retained face canvases |
| GPU | Local upload machinery already existed, but upstream work and unconditional readbacks stalled it | Existing dirty texture updates retained; continuous diagnostic pixel readback is opt-in |
| Hover/React | Repeated unfolding at unchanged brush centers; UI state each pump | Geometry-only caching, latest-position throttling, one footprint job, frame-coalesced UI and 100 ms progress updates |

The exact physical metric, C1 brush math, C2A routes/spacing, C2B2 paired pure-path
workers and atomic host history remain authoritative. C1 remains cooperative. The
audit/profile did not justify adopting another brush-worker design; the earlier
31/32 slower worker result is not being ignored. Publication handoffs copy indices
before commit, and reach the display only after history promotion. They cannot
mutate history. The optional handoff is off for legacy numerical callers.

An in-flight display reads a captured coherent epoch, never partly newer terrain.
New numerical publications accumulate separately, bounded by canonical sample
count. Cancellation/missed publication forces full reconstruction. Save drains
accepted work and final display; Undo/Redo use the same exact handoff. Signed-zero
word comparisons preserve the saved/modified indicator. No accepted inputs were
dropped to improve timings, and stopped prefixes remain explicitly recoverable.

The field still copies its previous immutable derived buffer per display epoch:
1.60 MB at N128 / 6.34 MB at N256. This deliberately retains coherent epochs.
It no longer rescans all canonical words or recomputes every node on ordinary dabs.
In the N256 ordinary run, 393,218 initial canonical reads plus 25,405 changed-word
reads replaced repeated full scans; only 29,494 nodes beyond initial preparation
needed recomputation. GPU/Canvas share the same accepted field/color math.

The planar-face interior footprint uses a polygonal circle: the straight segment
attains the 3D chord lower bound there. Near physical joins/corners it still uses
the accepted certified distance plan. This is a display contour only. Authoritative
brush distances, selection, rotation, camera projection and terrain palette did
not change. The integrated stage now uses the sphere workspace's dark blue/teal
gradient, with legible header/footer styling. The read-only D1 diagnostic remains
separate. Desktop and mobile screenshots were visually inspected.

## Matched sustained measurements

[Machine-readable results](evidence/cube-correct-performance.json) include the
original pre-edit baseline, a warmed replay from an isolated archive of rejected
`01e897e`, corrected runs, matched hashes, CPU categories, long tasks, frame gaps,
hover timings and mature-editor references. Chromium on Windows, AMD Radeon RX6600
hardware ANGLE/D3D11, 1440 × 950, one browser case at a time. Each ordinary drag
uses the same 180 native mouse moves over three seconds, 1,000 km cube edge,
45 km radius and 650 m/dab. The unchanged spatial filter accepts 91 points and
executes 61 dabs in both versions. Inputs and SHA-256 of all canonical words match.

These are instrumented development-machine measurements, not promises for every
device. Input-to-display timings use accepted input timestamps and actual displayed
revisions. An independent terrain-frame pixel probe verifies first change and
changing pixels during the held gesture; it excludes cursor/HTML overlays. Sampling
profiles and pixel probes add overhead. Native input wall time, not only a nominal
three-second duration, is retained in the JSON. Reported final cube benchmarks do
not overlap numerical jobs.

| Ordinary stroke | Warm rejected p95 input→display | Corrected p95 | Corrected first changed pixels | Release→complete before / after |
| --- | ---: | ---: | ---: | ---: |
| N128 WebGL | 123 ms | 22 ms | 19 ms | 108 / 40 ms |
| N128 Canvas | 155 ms | 21 ms | 20 ms | 85 / 36 ms |
| N256 WebGL | 206 ms | 39 ms | 41 ms | 101 / 41 ms |
| N256 Canvas | 341 ms | 39 ms | 42 ms | 341 / 38 ms |

All four corrected cases show **60 changed terrain presentations while held**,
maximum observed frame gap 16.8 ms and no long tasks during the measured interval.
The initial pre-edit baseline was substantially worse: N256 p95 1.27 s WebGL /
1.74 s Canvas, release backlog 1.34 / 2.38 s. Warm-up/JIT/system activity materially
affect the rejected implementation, so the table uses the more conservative warmed
baseline rather than presenting only its slowest run. Both are retained.

| Physical trajectory | Warm rejected p95 | Corrected p95 | Corrected first changed pixels | Corrected release backlog |
| --- | ---: | ---: | ---: | ---: |
| N128 edge, WebGL | 107 ms | 38 ms | 20 ms | 41 ms |
| N256 edge, WebGL | 308 ms | 53 ms | 37 ms | 40 ms |
| N256 edge, Canvas | 243 ms | 52 ms | 45 ms | 42 ms |
| N128 corner, WebGL | 103 ms | 37 ms | 18 ms | 87 ms |
| N256 corner, WebGL | 190 ms | 65 ms | 65 ms | 45 ms |
| N256 corner, Canvas | 295 ms | 59 ms | 52 ms | 93 ms |

Edge/corner runs use the same physical projected piecewise trajectories in both
versions, including the exact three-face corner. Each pair accepts 61 points and
executes 63 dabs, with identical final word hashes; 62 changing presentations
occur while held. This checks the expensive join previews as well as interior work.

Same-machine mature reference runs used comparable mean affected samples per dab:
cube 104 / 416, sphere 112 / 449 and cylinder 100 / 401. Sphere N128/N256 first
changed pixels were 55 / 65 ms, release backlog 3 / 3 ms; cylinder 61 / 75 ms and
29 / 37 ms. Cylinder uses its maximum detail 256 for both reference footprint
sizes, not a fictional cylinder N128/N256 representation. Different metrics and
path lengths mean these are responsiveness references, not interchangeable brush
algorithms. One later reference run overlapped numerical tests; it is retained
but excluded from performance claims.

Main-thread sampling on warmed N256 WebGL attributes approximately 1,132→89 ms
to React, 542→267 ms to derived fields, and 196 ms→below sampling resolution to
presentation/readback across the measured stroke. C1 stayed similar, 217→208 ms;
history stayed small, 8→13 ms. This supports fixing host/display overhead instead
of replacing the accepted physical calculations. Profile categories include
descendants without double counting; GPU submission time is not GPU execution
time. Corrected interior cursor work maxed at 0.2 ms, footprint jobs at 1.4 ms.

## Verification and limits

- **980/980 numerical tests**, final build/typecheck pass. New regression tests
  reconstruct every N8 canonical vertex including all folds/corners against the
  full accepted field, plus N128/N256 bursts, signed zero, cancellation/fallback,
  non-aliasing history handoffs and overlapping numerical/display epochs. A deferred
  display test proves numerical work progresses while Save waits for final pixels.
- **32/32 cube browser cases**: N128/N256, hardware WebGL and forced Canvas,
  sustained painting, all tools, physical/net joins/corners, exact whole-gesture
  history above 65,536 words, native pen/touch input, two-finger navigation,
  normal v5 create/paint/save/close/open/continue, corrupt Open and failed writes.
- **20/20 focused legacy/D1 browser cases**: existing flat/wrapped/sphere/cylinder
  four-tool/history workflows, v1–v4 mixed libraries and failure handling, setup
  cancellation, all-face D1 GPU/Canvas pixels, context loss/recovery and rapid changes.
- Canvas actual whole-frame RGBA after incremental painting matches an independently
  rebuilt full field/atlas/render with **zero different channels**, at both resolutions
  and desktop/mobile viewports. Production readback is off; `?verifyPixels=1` enables
  the explicit diagnostics used by pixel assertions. Performance uses an independent
  external frame probe with production behavior.

Browser mobile coverage is Chromium Pixel 7 emulation on this desktop; pen/touch
are native browser-protocol events. No claim of physical-phone testing or owner
acceptance is made. The performance tables measure sustained Raise; all four tools
have focused interaction/correctness coverage, not a full comparative timing matrix.

Very wide brushes remain demanding. The N256 maximum-radius four-face test changes
135,933 words in one exact gesture and takes about **17–18 seconds for its complete
draw/Undo/Redo browser case**. It is not ordinary-brush performance. Certified C1
work and large local updates remain costly; do not infer a fast maximum-radius
workflow from the default-radius table. Progress, queued work and recovery stay
visible. The 256 accepted-point, 4,096-dab, aggregate-work and 128-point UI-queue
safeguards remain. At the point warning, release and begin another gesture. No
exhausted or cancelled prefix becomes a successful complete stroke. Single-dab
capacity remains 65,536; interactive whole-gesture history remains surface-bounded
under the existing 32-entry / 8 MiB retained-history budget and exact replay rules.

Cold GPU initialization finishes under the visible loading state before painting
is enabled. Weak/software GPU falls back to Canvas. Extreme finite v5 geography
that exceeds representable display gradients remains saved/openable exactly, with
a display error rather than changed terrain. Browser-local storage limits and lack
of autosave/export/cloud sync are unchanged. Broader weak-device and physically
mobile latency are unverified.

## Reproduce and review

From the repository root with the preview running and no competing benchmarks:

```powershell
$env:CUBE_CORRECTION_URL = 'http://127.0.0.1:5260/'
node scripts/measure-cube-correction.mjs review cube
node scripts/measure-cube-correction.mjs review-cross cross
node scripts/measure-cube-correction.mjs review-corner corner
npm.cmd test
npm.cmd run build
```

Raw measurements, profiles and screenshots go to `.local/cube-correct-LABEL`.
`all` also measures mature references; `pilot` selects N256 WebGL. Use a separately
served Git archive of `01e897e` and a different label/URL for a baseline; never reset
the current working tree or overwrite historical receipts. The reporting script
aggregates the recorded baseline/matched/cross/corner labels used in this pass.

Run browser evidence writers from an isolated working directory to preserve old
receipt filenames (the configuration's source root stays the repository):

```powershell
$atlasRepo = (Get-Location).Path
New-Item -ItemType Directory -Force '.local/cube-correct-replay/docs/evidence' | Out-Null
Push-Location '.local/cube-correct-replay'
& "$atlasRepo/node_modules/.bin/playwright.cmd" test --config="$atlasRepo/playwright.config.ts" cube-corrective.spec.ts cube-editor.spec.ts cube-world.spec.ts --workers=1
Pop-Location
```

This uses the repository config's normal port 5173 and may start a separate local
preview. The delivered run used equivalent isolated configs against port 5260,
one worker, desktop 1440×950 and Pixel 7 emulation. Logs and validation receipt are
under `docs/evidence/cube-correct-*`; the source inventory covers this pass's source,
tests and benchmark/report drivers. Historical E/F evidence was not regenerated
into tracked paths. Large raw CPU profiles/traces remain local to avoid an archive
campaign. No Cube-G/H, hollow cube, new shape or cartography work has started.

Owner review should judge the actual drawing experience at N128 and N256,
including sustained ranges, valleys, joins, navigation and Save/Open. Automated
results support that review; they do not grant acceptance.
