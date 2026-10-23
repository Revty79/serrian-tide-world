# Hollow Tetrahedron technical review

This extends the verified regular Tetrahedron editor at
`52da75b1851ecf08750b627a5751c3a72321b695`. Technical verification and independent
review remain separate from owner acceptance.

## Physical shell and terrain authority

Two concentric, equally oriented regular tetrahedra share a centroid, with
explicit outer and inner edge lengths. The inner tetrahedron is strictly smaller.
The minimum supporting-plane clearance is
`(outerEdge - innerEdge) * sqrt(2/3) / 4`. Outward interval arithmetic and the
existing geometry roundoff guard establish a conservative positive lower bound;
all inner vertices must remain strictly inside every outer half-space.

The default 1,000,000 m / 800,000 m shell has approximately 40,824.829 m clearance.
The two canonical authorities have distinct surface and terrain identities within
one parent World. Each stores `2*N*N + 2` Float32 words: 32,770 at N128 or 131,074
at N256. Each bank bounds absolute elevation by the lesser of one quarter of
certified shell clearance and one eighth of its own height. Both banks default
to the accepted -100 m ocean where supported; thin shells require an explicit
0 m reference-shell start. Neither initialization clamps or alters existing words.

The reference surface remains the accepted elevation-color boundary. These
bounds are not a claim of displaced terrain collision meshing. Holes/tunnels and
physical connections between the independent boundaries are not implemented.

## Inherited editing and presentation

The existing Tetrahedron sessions, warm workers, connected dab/stroke executor,
certified polyhedral paths, scheduling, exact gesture history, display cache and
common polyhedral presentation remain unchanged. This is a second configuration
of those mechanisms. Geometry adapters reverse cavity normals and supply the
fitted inside camera, real triangular net and cavity-center inspection.

Inside opens a fitted editable overview. Read-only View from inside preserves
terrain/history, then restores the exact editing view and brush controls. Each
bank retains its own pose and history. Brush choices follow bank selection within
its physical radius bounds. All six real edges and three-face vertices are
continuous within each boundary; no invented stroke joins connect the two banks.

Strict format 18 stores both banks in canonical exterior/interior order with
little-endian Float32 words, fixed geometry/representation metadata, selected
bank, physical bounds and checksum. Validation precedes replacement. Cooperative
save rejects a changed name, bank selection or either source revision; canceled
or corrupt work cannot replace active geography. Formats 1-17 retain their prior
interpretations.

## Verification

The first held-map stress loop at the normal 200 m/dab repeatedly raised the
same small circle beyond the 10.2 km physical elevation limit. Both backends
safely rejected the out-of-range dab. This was an invalid endurance workload,
not a work-budget or performance interruption. Two new regressions prove atomic
rejection, exact prefix Undo/Redo and unchanged unrelated bank on both roles.
The held-map endurance fixture uses an explicit 20 m/dab within its valid range;
ordinary workflows and held physical vertex strokes retain the 200 m default.
No runtime code, physical bound, strength default or safety behavior was changed.

The final full unit suite passes 1,451 checks, including the two added safety
regressions. Build/TypeScript passes. The installed-Chrome matrix supplies 17
unique hollow cases: six pixel comparisons, four ordinary two-bank workflows,
four held-stroke cases, two cavity-navigation cases and one graphics lifecycle
case. The two range-exceeding initial map attempts and their successful explicit
20 m/dab reruns are preserved separately in the receipt. Two further cases use
trusted touch/pen input under Pixel 7 browser emulation; this is not physical
mobile-device evidence or attachment to the owner's Chrome/extension session.

The measured twenty-second gesture p95 input-to-visible delays are:

| Backend | Outside map | Inside map | Outside three-face vertex | Inside three-face vertex |
| --- | ---: | ---: | ---: | ---: |
| WebGL2 | 28.9 ms | 30.5 ms | 51.8 ms | 52.9 ms |
| Canvas | 31.2 ms | 36.1 ms | 50.0 ms | 55.7 ms |

Maps commit 321-439 dabs over two or three bounded work epochs. Vertex gestures
commit 74-95 dabs. Every gesture has one exact Undo/Redo operation, no discarded
positions, unchanged other bank, and an unchanged unrelated triangular base in
the three-face case. Native ordinary workflows test all four tools, every one of
the six joins on both banks, correct vertical rotation, cavity return state,
both-bank Save/Open and continued worker-based painting after reopening.
The complete ordinary pre/post/final bank hashes are bit-identical between
WebGL2 and Canvas at both detail levels; both reopened bank hashes match too.

Actual paired GPU/Canvas pixels at N128/N256 preserve outside, fitted-inside and
cavity terrain. Stable color error is at most 2 channel values (limit 3); there
are zero opaque-interior coverage or physical silhouette violations. Coastline
comparison uses the accepted two-texel atlas/subpixel support (maximum channel
difference 37-65 inside that discontinuous boundary support). It does not permit
interior color drift or add blur. The outside fixture has identical complete
numerical words to the published Solid Tetrahedron pixel fixture at both details.

Cavity navigation p95 input-to-pixels is 8.0 ms on GPU and 52.4 ms on Canvas;
p95 presentation is 0.2 / 47.0 ms. Context loss switches to current Canvas terrain
and restoration returns to WebGL2 with both terrain hashes unchanged.

The [source-fingerprinted receipt](evidence/tetrahedron-hollow-editor/receipt.json)
contains 76 hashed artifacts and 39 successful unique browser cases: the 17 hollow
cases, two touch/pen cases, twelve complete Solid Tetrahedron regressions and eight
Pyramid regressions. The initial two range-limit attempts remain visible beside
their corrected map-endurance results. Every existing-family regression in this
checkpoint passes without retries or skips. All suites ran serially at BelowNormal
priority. Final broader earlier-family compatibility follows the Octahedron
numerical foundation; no additional renderer or editor is implied by that pass.

This checkpoint is technically ready for publication and independent review.
Owner acceptance is still required.
