# Responsive surface painting

A7-P1B applies this foundation to the physical cylinder only. Sphere and plane
adoption requires independent authorization and acceptance.

## Authority and ordered preparation

The browser's active terrain is the sole numerical authority. A provider may
prepare work from an exact copied Float32 epoch in a worker. It cannot publish
elevations, history, saved checkpoints or document state.

`src/editor/surface-work.ts` contains the three shared primitives actually used by
the cylinder: `OrderedSurfaceInput`, `RevisionLease`, and `SurfaceProgressSignal`. Input ordinals include
positions in transit. There is no event thinning or queue overwrite. The bounded
queue rejects overflow explicitly. A revision lease binds a task generation and
source revision to the current authority and becomes unusable after cancellation.

The cylinder protocol in `cylinder-work-protocol.ts` demonstrates the provider
extension points: start from a metadata/snapshot epoch, accept numbered positions,
release and drain, propose one prepared patch, acknowledge one canonical commit,
report progress/completion/error. A future provider supplies its own geometry,
candidate selection, path reconstruction, brush preparation and visibility rules.
No other shape should import cylinder distance formulas.

## One proposal and one atomic handoff

The existing B2B2 engine pauses at its ready-dab boundary. Paths, tangents, spacing
residuals, refinement and all safety budgets stay inside that same engine. The
worker sends sorted indices and exact before/after Float32 words. It then waits.

The main thread checks task, sequence, source revision, bounds, finite words,
source-word equality, canonical ownership, history synchronization and the real
physical visibility guard. It commits through the existing exact history adapter,
updates saved-checkpoint differences and display colors, then acknowledges the
resulting revision. Only then may the worker apply the identical acknowledged
patch to its scratch epoch and prepare the next dab. The scratch epoch is
immutable between these acknowledgements. It never gets ahead of the authority.

Source revision remains the terrain's per-changed-word revision, not a worker
counter. A stale or malformed response ends the operation safely. No old response
can target a later document or stroke.

Each proposal also carries the original dab's numerical certificate. The main
thread records its error totals and prepared-memory peak with the commit, before
acknowledgement. Cancellation at that boundary therefore retains the exact
committed-prefix certification as well as its words/history. Work abandoned
before proposal delivery has only the last reported preparation diagnostics;
its numerical hard budgets remain enforced inside the terminated worker.

## Lifecycle and persistence

Release stops accepting positions and drains accepted input in order. Save uses
the existing release/drain boundary before encoding v4 and marking a successfully
stored checkpoint. Cancellation, navigation/tool/gesture interruption, loss of
capture and disposal terminate the active worker immediately, invalidate its
lease, and finish the committed prefix as one exact operation. Discarded positions
are reported. Undo/Redo operate on the main-thread history after cancellation.

Save waits for actual worker progress through the shared signal. It does not poll
an idle numerical pump with `scheduler.yield()`: that browser scheduler can keep
posting higher-priority work ahead of the worker messages needed to finish Save.

A failure before the first proposal may replay all accepted input into the
unchanged cooperative engine. No canonical dab has been applied at that point.
Failures after publication retain the exact committed prefix and report failure;
there is no speculative replay over already changed terrain. A later stroke uses
a fresh worker. Preview failure leaves editing and saving available.

Only an active worker and one preloaded spare are retained per cylinder session.
Preview and painting are exclusive. Closing the document terminates both. Every
worker run owns at most one source epoch and one pending proposal. Typed snapshot
and proposal buffers are transferred, never the authority's private storage.
The original candidate/query/box/prepared-patch/stroke/history limits remain in
force. The transport includes one additional before-word array for validation;
this is bounded diagnostic/transport storage, not a larger numerical work budget.

## Presentation and measurement

The main thread schedules the current committed display before spending any
cooperative fallback budget. GPU uploads are revision keyed. CPU rendering retains
its coherent snapshot scheduler. Neither display path can commit elevation.
Native pointer feedback, exact dry-run stencils, committed revisions, submitted
images and observed compositor frames are separate events.

Pending pointer feedback also covers committed revisions awaiting their coherent
GPU/CPU image. Finishing numerical work does not imply that the current image has
already caught up. The saved checkpoint remains a separate exact-content state.

`painting-metrics.ts` is an opt-in recorder in each JS realm. Stage records retain
512 recent samples plus lifetime count/total/maximum; these window quantiles must
not be presented as complete-population quantiles. Worker stage measurements are
reported with the final task diagnostics. Native event handlers, queued input,
long tasks, uploads, overlays and React render durations are measured separately.
Preview prelude tasks are distinguished from the native-down-to-drain task
distribution. Normal editing leaves bulk stage profiling disabled in both realms.

The benchmark uses normal `/`, saved geography, native held gestures and decoded
terrain pixels in compositor PNGs. It hides pointer/footprint overlays only during
pixel measurement to avoid counting cursor movement as geography. Frame-swap
observation includes capture overhead and is not a display-photon measurement.
No-op or subpixel/palette-quantized updates may have no observable changed pixel;
they must be reported as unavailable rather than zero latency.

CPU-throttled mobile emulation is a UI stress profile on the host computer, not
proof of physical phone performance. Chromium's
[CPU throttling implementation](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/inspector/inspector_emulation_agent.cc)
uses the main-thread throttler. Do not treat a page's 4× setting as evidence that
dedicated worker computation or the desktop GPU has become equivalent to a slow
phone. Report worker costs and this limitation separately.

## Visual standard and sphere adoption plan

Keep the cylinder's A7-P1A-R elevation-first interpolation, class-aware coastline
coverage, physical-gradient relief and readable elevation colors. These are
display operations; increased geographic resolution and tiled terrain are later
work. The current shader and reference-cylinder unprojection are shape specific.

Shared candidates for a later visual pass are `elevation-colors.ts`, bounded
surface backing dimensions in `surface-renderer.ts`, diagnostic terminology,
revision-keyed texture upload orchestration, appearance controls, and independent
compositor/stage measurement. Coverage rays, inverse projection, interpolation
stencils, physical gradients, meshes and visibility remain provider specific.

The next sphere pass should:

1. Diagnose the real unified globe and net in `SphericalViewport.tsx` and
   `spherical-session.ts`, using the same input-to-visible standard and saved v3
   fixtures. Preserve the existing limb-assist session and contextual controls.
2. Design spherical reconstruction in `spherical-raster.ts` with ownership from
   `terrain/spherical.ts` and `surfaces/cube-sphere.ts`. Test every cube-face edge,
   corner and pole. Do not interpolate separately duplicated face authorities.
3. Replace display-only color interpolation with spherical elevation interpolation
   before sea classification, with shape-appropriate coast coverage and physical
   tangent gradients. Validate globe/net consistency through `spherical-view.ts`.
4. Evaluate GPU presentation against `spherical-texture-updates.ts` and the existing
   raster/cache fallbacks. Preserve geographic brush unprojection and limb previews
   in `spherical-brush-preview.ts`, `spherical-gesture-path.ts` and
   `spherical-limb-assist.ts`; do not copy the cylinder shader.
5. If preparation needs workers, implement a spherical provider for the shared
   ordering/revision/lifecycle contract, retaining great-circle spacing, changing
   visibility, six-face ownership, exact `spherical-history.ts` and v3 saves.
6. Prove exact words/history, mixed libraries and ordinary native mouse/pen/touch
   workflows before owner visual and hands-on acceptance. Planar adoption follows
   its own wrapping/edge-assistance, bounded geography and v1/v2 contracts.

No sphere, plane, persistence format, database or main-site integration changes
are authorized by this document.
