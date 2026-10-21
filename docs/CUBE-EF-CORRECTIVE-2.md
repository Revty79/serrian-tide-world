# Cube-E/F corrective pass 2

2026-10-21. The owner rejected `0686f5adcfff0b762c48d39b7e27918f67ef7b4e`.
This correction addresses long-form drawing, work-limit interruptions, trailing
and strength. **Stop for Ember's independent GitHub review and owner hands-on
acceptance.** No next geometry or architectural migration is authorized here.

## Causes and changes

- **The reported exact-work exception came from spacing, not an unsuccessful route
  search.** An initial 15-second native circular replay failed at 185 N128 / 191 N256 accepted
  points, with 139 committed dabs and 59 peak radical terms. The 16-million lifetime
  path budget was exhausted: 15,941,540 arc work units versus 58,460 route work units,
  no failed-route allowance, paired-worker backend. Each turn grew an algebraic arc
  expression, repeatedly normalized/enclosed/rounded. The message came from the
  shared exact budget after the remaining lifetime allowance became too small.
  A separate numerical reproduction also exhausts the unchanged 200,000-unit
  single-step ceiling inside `cubeArcBounds` / `cubeArcRound` while rounding a dab
  coordinate, after only 5.53 million lifetime units. Both limits expose the same
  growing-expression problem; the exception text alone does not identify a failed
  route search or distinguish the two budget windows.
- **Interactive spacing now has constant-size certified phase.** Each certified
  route length is rounded nearest/even into integer units of `spacing / 2^64`, using
  integer square root and exact squared-midpoint comparisons. Summed integer phase
  replaces unbounded radical accumulation. At `m` routes, ideal arc error is at most
  `m × spacing / 2^65`; final chart coordinates are separately rounded nearest/even
  with rational bounds. At default 45 km radius and the full 65,536-point allowance,
  phase error is below `2.0e-11 m`, before chart rounding. Certified cube routes,
  topology and C1 brush distances remain exact. Common-face chord and longer-squared-
  candidate pruning preserve the complete physical minimizer set.
- **This intentionally changes ideal dab-placement semantics for the interactive
  editor.** It uses a disclosed bounded phase rather than an arbitrary-length exact
  radical sum. Extremely near a terminal spacing threshold, endpoint dab count may
  differ by one within that bound. Legacy C2A/C2B2 numerical callers retain their
  exact placement and paired-worker path by default. Existing saved words are never
  resampled or converted; all new canonical changes and history remain exact Float32.
- **Practical gesture limits now match mature cylinder lifetime counts:** 65,536
  admitted observations and 16,384 dabs. Provider queues remain eight points/eight
  events; UI outstanding input remains bounded at 128. Every numerical step retains
  the 200,000 exact-work ceiling. The lifetime path allowance is derived from finite
  step counts, not enlarged to accommodate growing algebra. C1 retains 16 million
  work units per atomic dab. History retains its 16-million reservation ceiling,
  surface sample bound, 32-entry / 8 MiB retained storage and exact atomic replay.
  Legacy aggregate work windows remain default for numerical callers. Broader N256
  curves exposed the old lifetime history ceiling after 865 dabs; per-reservation
  scoping removes that artificial interruption without increasing an operation's
  computational or memory ceiling. Overload/failure still preserves an explicitly
  stopped undoable prefix; no accepted prefix is labelled complete.
- **Trailing included avoidable scheduling and topology work.** The existing 4 ms
  numerical slice now continues through cheap ready path stages, yielding at the
  budget or a real worker barrier. Native/coalesced input retains its original event
  timestamp. A geometry-only inverse stencil cache eliminates repeated alias/neighbor
  discovery during local display preparation. Its fixed extra storage is 2.39 MB at
  N128 / 9.50 MB at N256, built once; actual accepted height/gradient dependencies
  define it, including every edge/corner alias. Dirty textures, Canvas patches,
  coherent epochs and terrain colors remain unchanged.
- **Horizontal rotation follows the owner's drag.** The owner reported leftward
  dragging rotated the surface right. The physical editor now reverses only the
  horizontal input delta. Vertical rotation, unfolded-map panning, camera mathematics
  and the accepted D1 diagnostic remain unchanged. Native browser checks exercise
  both horizontal and vertical directions and verify navigation never paints.

## Shared Atlas architecture

The editor reuses `OrderedSurfaceInput` and `SurfaceProgressSignal` from the mature
sphere/cylinder host, the proven planar coalesced-pointer policy, one shared 200 m/dab
default, existing cube sessions, canonical history, local display and v5 storage.
No new worker executor was introduced. Constant-size path work measures cheaply
enough to stay cooperative; the previous slower brush-worker prototype was not
revived. The [shared systems and adapter audit](ATLAS-SHARED-EDITOR-ARCHITECTURE.md)
records current duplication and a controlled migration proposal after acceptance.

## Brush parity

The old cube default was 650 m/dab: **3.25 times** the standard additive delta.
Planar, sphere, cylinder and cube controls now share the 200 m/dab definition.
No strength multiplier or falloff/palette change was introduced.

Canonical-elevation tests use the same 45,000 m physical radius, 200 m strength,
450,000 m travel per leg and non-boundary sample offsets on all three geometries:

| Measurement | Cube / sphere / cylinder with radius/4 spacing |
| --- | --- |
| Single center dab | +200 m Raise / −200 m Lower |
| Quarter, half, three-quarter radius weights | 0.84375 / 0.5 / 0.15625 |
| One leg | 41 dabs, four dabs per radius |
| Out and back, one operation | 81 dabs; center −100 → 1,500 m within 0.0003 m |
| Matched Lower return | Center restored to −100 m within 0.0003 m |

The accepted cylinder UI uses `0.2371 × radius`, approximately 5.44% denser than
radius/4 (43 versus 41 dabs on the matched leg). That makes cylinder overlap slightly
stronger, not cube stronger. It remains unchanged. Parity probes avoid the existing
cylinder exact-boundary precision rejection; they test inside/outside support and
actual final elevations rather than color appearance. Default radii have different
geometric meanings; numerical parity uses identical meter values explicitly.

## Validation and performance

Final measured results and validation counts are recorded in
`evidence/cube-pass2-results.json`. Tests use the normal Atlas interface, N128/N256,
hardware WebGL2 and forced Canvas, 900 trusted native move samples sent at 60 Hz over
15 seconds: repeated circles, broad curves/reversals, edge crossings and circular
motion around all three faces of a corner. They retain all admitted observations,
check real changing terrain during the hold, exact whole-gesture Undo/Redo, repeated
Lower gestures, native event age, full timing distributions and release backlog.
Matching rejected-version circle/corner runs use an isolated Git archive of `0686f5a`.

| 15-second cases | Rejected `0686f5a` | Corrected |
| --- | --- | --- |
| Circle/corner comparisons, N128/N256, both renderers | All 8 strokes failed; 108–188 points admitted | All 8 complete |
| All four motions, both resolutions/renderers | Focused comparison only | 16/16 complete; 451–901 admitted points and 478–948 dabs |
| N128 input-to-visible p95, per-case range | 51–418 ms before failure | 24–51 ms |
| N256 input-to-visible p95, per-case range | 70–1,213 ms before failure | 35–92 ms |
| Worst corrected input-to-visible sample / observed release backlog | Failed strokes cannot measure complete draining | 178 ms / 138 ms |

The existing three-screen-pixel admission threshold remains: small observations
accumulate into the next admitted point, and release includes the terminal point.
Thus 900 injected moves do not imply 900 admitted terrain points. Every admitted
point completed, with no dropped accepted prefix or recovery prompt. Actual changing
terrain, not just pointer feedback, was observed throughout each hold.

The measurement includes native input waiting, path readiness, C1 preparation,
history reservation, canonical commit, derived display preparation and frame
publication. Pixel readback samples actual terrain at first change and every 100 ms
thereafter; HTML cursor/outline motion cannot satisfy it. A diagnostic every-frame
probe consumed about 3.3 seconds of main-thread time in 15 seconds, so its distorted
latency is excluded from final claims. Sampling/profile overhead and browser event
coalescing are reported, not mistaken for production work or lost admitted input.

Independent numerical tests prove phase midpoint inequalities and ties, compare
physical routes and centers against legacy exact placement at folds/corners, replay
long independent bends deterministically, and reconstruct incremental fields against
the accepted full renderer. History tests retain the original lowered reservation
ceiling while completing long exact gestures. Existing v1–v5, old geometry and
native input regressions are included in the final receipt. Mobile emulation is not
physical-device evidence. Development-machine latency is not a universal guarantee.

Verification: **988/988 numerical tests**, TypeScript and production build passed;
**34/34 cube** and **20/20 legacy/D1 browser regressions** passed on desktop/mobile
emulation. The **16/16 long-form drawing cases** and one additional hardware corner
replay passed. The latter explicitly records AMD Radeon RX 6600 hardware WebGL2;
adjacent N128/N256 regression snapshots confirm the same adapter. The eight rejected-
version diagnostic replays all reproduced failed strokes and are not counted as
successful editing cases. See the [representative three-face corner](evidence/cube-pass2-corner.png).

Very wide brushes and unusually fast long travel can still be expensive. Finite
input/dab, C1 work, history memory and numerical representability safeguards remain;
they are not suppressed. This is not a promise of unlimited gestures or instant
maximum-radius rendering. No original website, database, shared server, Docker, hosting or Production
work was performed.

## Owner checkpoint

Save open work, reload **http://127.0.0.1:5260/**, then reopen/create a solid cube.
Try 15–20 seconds of circles and reversing ranges at N128 and N256, around edges
and a three-face corner. Try Raise/Lower at 200 m/dab, navigation, Undo/Redo, then
Save, close, reopen and continue. Older hot-reloaded sessions can retain old code.
Browser-local saves remain tied to the same profile and origin.

To replay measurements, run `cube-long-sculpting.spec.ts` with one worker and a
running preview. `CUBE_LONG_OUTPUT` chooses a local results directory;
`CUBE_LONG_BASELINE=1` records rejected-version circle/corner failures without treating
them as a successful editor result. Use a separate baseline server/source archive,
and run evidence writers from an isolated working directory. Large raw profiles,
traces and per-case diagnostic files remain local. Only the concise combined receipt
and one representative screenshot accompany this report.
