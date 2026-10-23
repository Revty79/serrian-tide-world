# Solid and Hollow Pyramid family review

The authorized Phase 2 scope is a genuine square-based Solid Pyramid followed
by a closed Hollow Pyramid. The working implementation is published as
`3a96f05ae20e0fe699576649a14208af55a46ab9`; final verification continues on that
same product source. The owner explicitly requested publication before the remaining
checks and authorized follow-up fixes if a check failed.

## Creator behavior and shared architecture

Both World types appear in the ordinary Atlas selector. They retain the Atlas
host, connected input/workspace, certified brush execution, worker transport,
exact whole-gesture history, local catalog and atomic save/open behavior.
Pyramid adapters supply real triangles/base/apex, canonical ownership, physical
metrics, unfolded routes, picking, visibility and projection. The accepted
rendering palette, field/relief policy, sharp face atlas and graphics/backing
mechanisms remain the presentation baseline.

Solid Pyramid has four triangular sides, one square base and one shared apex.
Hollow Pyramid validates a completely nested cavity, including its base corners
and apex, before allocating two independently identified terrain banks. No
copied/inverted heights create fake inside terrain. New hollow oceans start at
-100 m where clearance permits; explicit reference-shell initialization uses 0 m.

Fitted Outside/Inside editing and unfolded maps support all four tools and all
eight visible physical joins. Leaving the projected map ends a gesture safely.
Read-only cavity inspection preserves both terrain banks and returns to the
exact previous editing pose and brush choices. Inside vertical dragging was
corrected from the owner's report; actual projected-feature direction tests
cover both axes in outside editing, inside editing and cavity look.

## Measured corrections

Fixed-source certified unfolding coefficients and conservative candidate bounds
remove repeated interval reconstruction at folds without changing numerical
brush words. Forty four-tool N128/N256 footprints match the original exhaustive
distance implementation bit for bit. Ambiguous route certificates retain the
original safe solver.

Bounded rolling work epochs prevent an ordinary held gesture from exhausting a
lifetime query counter. Each complete dab retains its hard safety budget, and
each whole gesture retains one exact history operation. Queue and history limits
remain explicit. Twenty-second gestures on both hollow banks and both backends
cross work epochs without release or interruption.

The Canvas cavity adapter samples the existing colored atlas through exact
inverse homographies of the five real planes. The original affine transform
cannot represent that perspective, and a measured fragment implementation was
too slow. The final allocation-free atlas sampler retains full backing detail
and coherent source epochs, including when a painted bank is reopened in a new
viewport or graphics resources are lost/restored. It adds no terrain smoothing,
numerical alteration or low-resolution interaction image.

Parallel full-suite verification caused owner-visible CPU contention. Stopping
that run restored responsiveness in the same view. Final verification runs one
process/browser at a time at lower CPU priority. This development load is kept
separate from measured ordinary editor responsiveness.

Current ordinary wall strokes measure these p95 input-to-changed-output-pixel
delays, including canonical commit and presentation. These are desktop workflow
measurements, not a claim that every camera, machine or brush size has the same
latency.

| Detail / backend | Hollow outside | Hollow inside |
| --- | ---: | ---: |
| N128 / WebGL2 | 44.8 ms | 50.9 ms |
| N128 / Canvas | 46.3 ms | 56.7 ms |
| N256 / WebGL2 | 67.3 ms | 80.7 ms |
| N256 / Canvas | 74.4 ms | 87.0 ms |

The separate twenty-second N256 held-map cases report p95 total delays of
33.6/36.8 ms outside/inside on WebGL2 and 34.9/40.3 ms on Canvas. Each bank's
gesture crosses two work epochs, commits 314-427 dabs and retains one exact
history entry. Ninety actual changed cavity-navigation frames per backend give
p95 input-to-visible delays of 8.9 ms on WebGL2 and 54.2 ms on Canvas; the latter
includes 49.5 ms p95 presentation. Source hashes remain unchanged while viewing.

The six matched Hollow Pyramid pixel cases have a maximum stable-terrain color
error of one channel value and zero silhouette or internal coverage violations.
Coast classification uses the inherited two-texel atlas filter support plus the
GPU subpixel-ray footprint. Coastal channel differences reach 32-54 values
inside that support; the raw comparisons retain those differences for review.
The [N256 cavity comparison](evidence/pyramid-final-regression/raw/hollow-pyramid-pixels/n256-cavity.png)
shows WebGL2 on the left and Canvas on the right. The ordinary
[Canvas inside editing capture](evidence/pyramid-final-regression/raw/hollow-pyramid-browser/n256-canvas-interior-wall.png)
records the creator's fitted view separately.

The final legacy parity run exposed a test-capture scheduling defect: all six
WebGL cases awaited an asynchronous terrain hash before reading a GPU drawing
buffer created with `preserveDrawingBuffer: false`. Chrome could composite and
discard that buffer during the wait, producing zero checked pixels. The fixture
now snapshots terrain words and reads pixels in the presentation task, then
awaits the hash. Cylinder cache disposal follows capture. Renderer code, backing
dimensions and every numerical/pixel threshold stay unchanged. The failed run
and its empty readbacks are preserved alongside the corrected run; the final
source fingerprint identifies this fixture change explicitly.

## Validation results

The [final machine-readable receipt](evidence/pyramid-final-regression/receipt.json)
records the source fingerprint, commands, pass/fail counts, actual pixel and
timing results, source hashes and raw captures. Its fingerprint reconstruction
verifies that the published runtime and previous tests are unchanged except for
the documented parity-capture fixture. All final checks pass; no application
correction was required after the owner-requested code publication.

| Check | Status |
| --- | --- |
| Full numerical/unit suite | 1,414 passed, zero failed/canceled/skipped |
| Production build and TypeScript | Passed |
| Hollow Pyramid operational/pixel/navigation/context matrix | 15 passed |
| Solid Pyramid operational/pixel matrix | Eight passed |
| Trusted touch/pen and two-finger navigation | Four passed; Pixel 7 emulation |
| Existing solid/hollow family browser regressions | 68 passed: 34 desktop, 34 mobile emulation |
| Accepted matched-family rendering parity | 12 passed, each comparing both -100 m and 0 m starts |
| Open Cylinder correction compatibility | Two wall/rim cases plus five solid-family cases passed |

The final groups total 114 browser test executions. The initial parity attempt
had six empty WebGL readbacks and six Canvas passes; its failed report and
captures remain explicitly labeled. The corrected twelve-case rerun is complete
with no skipped, flaky or failed cases. The final build retains the existing
nonblocking bundle-size warning.

The dedicated [solid review](PYRAMID-SOLID-EDITOR.md),
[hollow review](PYRAMID-HOLLOW-EDITOR.md),
[solid checkpoint receipt](evidence/pyramid-solid-editor/receipt.json) and
[owner-requested publication receipt](evidence/pyramid-hollow-editor/receipt.json)
preserve the separate delivery sequence and evidence available at each push.
Earlier receipts are historical snapshots and are not silently overwritten.

Installed headless Chrome uses the development PC's actual AMD RX 6600 through
ANGLE/Direct3D11; paired cases deliberately force Canvas. Trusted CDP pen/touch
events use Pixel 7 browser emulation. These do not claim physical-phone tests or
direct control of the owner's Chrome/extension session. Owner observations and
final owner/Ember acceptance remain separate from automated technical results.

## Persistence, connections and review boundary

Strict new formats 15/16 preserve real dimensions, identity, representation and
canonical little-endian Float32 words. Hollow format 16 saves both banks and the
selected surface. Header/checksum/clearance validation and private candidate
preparation precede adoption; existing formats 1 through 14 are not reinterpreted.
Cancellation, corruption, foreign metadata and stale saves preserve active edits.

Pyramid physical hole/tunnel authoring remains deferred under the brief's
conditional connection instruction. Existing physical-hole, tunnel and map-link
interfaces/implementations are preserved. A verified five-plane triangular
material/portal/protection adapter is required before exposing new pyramid
excavation; format 16 rejects unsupported connection fields. No cosmetic marker
is presented as removed material. Full displaced-terrain excavation and the
Tunnel Network Designer remain outside this shape assignment.

Stop after this family for Ember review and owner acceptance. No subsequent
shape, website integration, database, hosting, Production or Docker work is part
of this delivery.
