# Operational Hollow Pyramid checkpoint

Hollow Pyramid is a normal Atlas World type with explicit outer/inner base
widths, heights and cavity base elevation. The independently published material
foundation is `1a350c5`, following the usable Solid Pyramid checkpoint `2207edc`.
All geometry remains a genuine nested pair of five-face square pyramids.

The selected bank uses the same `PyramidSession`, certified distance adapter,
connected brush/worker execution, numerical history, display cache and
`ConnectedWorkspace` as Solid Pyramid. The parent document owns bank selection,
combined locking/draining and the two-bank save checkpoint. It does not add
another painting engine. A canonical edge/apex word belongs to one bank only.

Outside and Inside each retain their fitted physical or unfolded-map editing
pose. Brush choices follow the creator within the selected bank's supported
physical radius range. Every genuinely visible side/side and side/base join
remains paintable in a held gesture. A closed shell's outside and cavity are
separate physical surfaces, not a fabricated continuous chart across material.

`View from inside` uses a physically valid eye at one quarter of the cavity's
height above its base. It pauses numerical painting and keyboard/toolbar history.
`Return to editing` restores the exact previous editing view, including map mode,
pan, frame and zoom. Source words remain unchanged through looking and zooming.
The owner identified reversed vertical movement in fitted Inside editing;
geometry-specific drag signs now make projected terrain follow both drag axes.
Independent direction tests cover Outside, fitted Inside and immersive look.
Accepted sphere/cylinder/cube navigation mathematics are unchanged.

## Perspective Canvas adaptation

Fitted editing and unfolded maps use the exact Solid Pyramid face atlas path.
GPU cavity inspection extends the same field/color/relief shader with actual
eye rays. There is one terrain presentation standard for both banks.

The accepted Canvas face transform is affine. A plane viewed from an internal
perspective eye is a projective transform, so a single affine draw cannot fulfill
that projection. An initial bounded-fragment adaptation matched stable pixels,
but actual Canvas input-to-visible navigation reached 476 ms at p95. That measured
failure justified changing the projection adapter before publication.

`pyramid-perspective-atlas.ts` now clips the five real faces in homogeneous
coordinates and scan-converts their convex projected polygons. Exact inverse
homographies address the SAME accepted colored atlas. The allocation-free pixel
loop uses its ordinary bilinear texel reconstruction and endpoint convention.
It does not introduce a terrain/color engine, resample numerical geography,
reduce backing resolution or add a blur pass. One bounded ImageData buffer is
reused at the shared backing size. Only rare uncovered shared-edge centers use
the real physical ray picker. The complete closed cavity retains full coverage.

Independent inverse-ray tests cover look changes at 0.6x, 1x and 6x. The new
navigation pixel test measured 53 ms p95 Canvas input-to-visible response,
including actual pixel capture, and 42.2 ms p95 presentation. GPU response was
8.8 ms. Source words remain unchanged. These are measured desktop cases, not
physical-mobile performance promises.

Both presentations retain a private coherent atlas epoch. Returning to a
previously painted bank reconstructs from its real cached field revision;
graphics failure cannot silently adopt the initial blank atlas as current.
Copy-on-write color tiles keep private epochs isolated while sharing untouched
initial atlas data. Graphics loss and restoration have a dedicated painted-bank
pixel/hash workflow. The color/coverage gate still permits at most three channel
values at stable pixels and zero internal coverage holes. Coastal differences
remain bounded by the accepted color atlas's finite texel footprint, with raw
matched captures supplied for review.

## Persistence and connection boundary

Strict format 16 stores both banks in canonical little-endian Float32 order,
their distinct identities, validated nested dimensions, numerical resolution,
orientation, units and selected bank. Validation checks all headers/unknown
fields, sample counts, finite clearance, date and checksum before adopting a
private candidate. Save leases include both terrain revisions, name and bank
selection. Cancellation, damaged words, rehashed out-of-clearance payloads,
touching shells and forged bank identities reject without replacing active work.
Exact signed-zero roundtrips are tested at N128 and N256. Formats 1 through 15
retain their existing meanings and immutable replacement guards.

The accepted physical-hole, tunnel and reciprocal-link interfaces remain intact.
The World descriptor exposes real surface roles/identities and the actual
versioned geometry/representation provider. Format 16 deliberately rejects
unimplemented connection fields. No false hole marker stands in for removed
material. Pyramid hole/tunnel UI is not included in this checkpoint.

The Phase 2 connection instruction is conditional on correct implementation
without derailing the shape assignment. Existing cube excavation and protected
mouth adapters assume six square orthogonal faces; cylinder adapters assume
walls/disks/annuli. Their geometry clipping and support proofs cannot simply be
relabeled as triangular pyramid cavities. A verified nonorthogonal five-plane
material/portal/protection adapter is still required. That work, and displaced
terrain excavation/full Tunnel Network Designer, remains deferred; the accepted
implementations in the existing families are preserved.

## Review evidence

Installed Chrome workflows exercise N128/N256, hardware WebGL2 on this PC's
AMD RX 6600 and forced Canvas fallback. They use native mouse gestures for both
banks, all four tools and all eight physical joins, with exact Undo/Redo and
two-bank Save/Open. Actual input, canonical commit and changed output-pixel
timestamps are separate measurements. Read-only inspection and restoration are
checked against both complete terrain hashes and the exact editing view.

The output-pixel cases match source words, geometry, view, zoom, appearance,
viewport and backend inputs for Outside, fitted Inside and cavity views. Stable
color error must remain at most three per-channel values; silhouette and internal stable
coverage violations must remain zero. Viewing must preserve the source hash.
Raw evidence distinguishes this automated installed desktop Chrome work from
physical-device testing and from the owner's independent acceptance observations.

The final family regression receipt is a separate checkpoint. Stop after the
Solid/Hollow Pyramid family for Ember review and owner acceptance; no later
geometry, website, database, hosting or Production work is authorized here.

The owner requested immediate publication of this working checkpoint before the
remaining regression run. The [publication receipt](evidence/pyramid-hollow-editor/receipt.json)
labels prior full-suite results, current targeted proof and remaining checks
separately. The subsequent [final family review](PYRAMID-FINAL-REVIEW.md) and
[final receipt](evidence/pyramid-final-regression/receipt.json) now record the
complete frozen-runtime validation, the test-only GPU readback correction and
the completed legacy/Open Cylinder compatibility checks.
