# Cylinder display architecture — A7-P1A-R

The numerical cylinder, intrinsic distances/paths/dabs/strokes, exact history and all four persistence codecs retain their A7-D authority. Rendering reads committed elevations and never supplies data to editing or saves. The historical A7-P1A completion records the acceleration checkpoint; its geographical visual acceptance was subsequently rejected by the owner and Ember.

## Elevation before color

Three bounded R32F textures represent side rows and two polar cap grids. A common upload magnitude prevents interpolation overflow for extreme valid Float32 values; the shader restores meter units for color and gradients. Explicit texel fetches require no float-linear extension. Padded rows repeat the one canonical center and reference canonical shared-rim words, including end-cap angular reversal. N64/N128/N256 texture payloads remain 17,152 / 67,072 / 265,216 bytes. Temporary canonical snapshots use 16,136 / 65,032 / 261,128 bytes.

Separable cubic Hermite elevation reconstruction uses harmonic-mean, sign-limited tangents. It passes through stored samples, stays within the four adjacent cell heights, and introduces no extrema outside their range. Angular interpolation is periodic. Repeated boundary rows make the cap center single-valued and its exact radial derivative zero. Side/cap rim values use the same angular interpolant. This is a read-only display reconstruction of sparse geography, not additional geographic detail or irreversible resampling.

Sea-level classification and Atlas's ordinary elevation ramp run after elevation interpolation. Near a sea contour the GPU uses four subpixel elevation classifications for coverage; derivatives only bound this extra work. The CPU uses four subpixel rays in cells crossing sea level and near reference silhouettes/cuts. If all subpixel classifications agree with the center, the ordinary color/relief remains unfiltered. Classified palette texels are never interpolated to create the current terrain image. No indiscriminate blur crosses land/water boundaries.

The CPU fallback captures one coherent elevation epoch per raster. Its sampler reuses 16-value/four-column scratch arrays and angular sine/cosine tables, avoiding nested allocation per pixel. Water lighting is skipped. The legacy packed-color cache remains for the existing commit adapter and compatibility checks; its palette interpolation helper no longer drives cylinder display. No elevation or extra retained authority is added to that cache.

## Relief and editing

Tools offer **Shaded relief · 5× display** (default) and **Elevation colors**. Relief uses actual neighboring sample differences divided by angular, axial and radial distances in meters. Side normals use angular/axial axes; cap normals use Cartesian disk axes with an opposing-first-ring estimate at the single center. Interpolating these physical finite-difference normals avoids lighting creases from differentiating the nonlinear slope limiter. They are sample-scale gradient estimates, not new terrain features.

A fixed surface-local light and explicitly labeled fivefold vertical display exaggeration improve slope readability. Water retains elevation colors. Reference-shape facing light is separate. No displacement, mountain placement, noise, contours or additional brush is added. Appearance changes redraw without uploading unchanged terrain or adding history. Readouts and stencil dots still inspect canonical samples, not interpolated picture values.

## Meshes, transforms, diagnostics and failure

`SurfaceRenderer<View>` retains its provider lifecycle and receipts. Two persistent meshes show the physical capped cylinder and connected side/disk map, with 4,096 angular display segments independent of numerical N. Reference sagitta is bounded by `1 - cos(pi/4096)` radius units. Camera/cut changes update uniforms, without rebuilding meshes or uploading terrain. Committed revisions trigger bounded texture replacement. Scene/overlay backings retain the three-million-pixel and 1.5 device-scale caps with correct proportions.

The GPU canvas presents directly. The input canvas retains the existing pointer/keyboard arbiter, and a separate exact stencil/selection overlay and independent native/DOM pointer remain. Fallback draws on the input canvas. One coalesced RAF, one in-flight coherent CPU raster, finite timing rings and existing CPU pixel/work limits remain. Same-mode CPU camera requests coalesce behind that raster; incompatible mode/resize jobs cancel.

Fragment lookup reconstructs the analytical reference-surface point from pixel/camera uniforms. Geographical coordinates do not depend on interpolated positions or derivatives of the very thin display triangles, which lose precision on some pixel alignments. Zero-radius cap centers have an explicit angle guard. Mesh depth/coverage still selects the visible surface; double-precision CPU projection and brush membership remain authoritative. Odd-backed GPU readback checks include exact center pixels on both caps.

Context loss, shader/resource/upload failure and identified software graphics use bounded CPU rendering. The transform becomes editable after a coherent current image is submitted. Restoration rebuilds resources from committed elevation. Existing interruption rules can still retain one undoable committed prefix while reporting discarded pending positions if a displayed target becomes unavailable. Pending work is never reconstructed from pixels. Disposal releases owned graphics resources, not caller-owned terrain.

Tools' **Display diagnostics** shows the actual backend, renderer when exposed, fallback reason, terrain backing, presentation backing and numerical resolution. In fallback, the two backing sizes distinguish the limited CPU raster from its larger canvas. Evidence includes ordinary installed Chrome launched without graphics flags and default headless Chromium's genuine software-renderer fallback. Explicit hardware benchmark flags remain confined to labeled test launches.

## Sampling intervals and future detail

For default R = 1,000,000 m and L = 1,600,000 m:

| N | Canonical samples | Side angular / rim arc | Side axial | Cap radial | Cap first-ring angular arc |
| --- | ---: | ---: | ---: | ---: | ---: |
| 64 | 4,034 | 98,174.77 m | 50,000 m | 62,500 m | 6,135.92 m |
| 128 | 16,258 | 49,087.39 m | 25,000 m | 31,250 m | 1,533.98 m |
| 256 | 65,282 | 24,543.69 m | 12,500 m | 15,625 m | 383.50 m |

Both caps have identical interval magnitudes. At cap radius r, angular arc spacing is `2πr/N`; chord spacing is `2r sin(π/N)`. Angular spacing collapses toward the center while radial spacing does not. The side is anisotropic. These intervals explain remaining coarse island shapes and missing small ridges. The correction removes palette mixing and improves continuity/readability, without recovering missing geography.

Doubling N costs approximately four times the canonical samples, payload, display textures and full-cache preparation. Fixed-meter brush footprints generally reach about four times as many samples, with additional intrinsic distance/refinement costs. Numerical detail and interactive numerical budgets remain unchanged. Future higher/adaptive/tiled terrain needs separately scoped canonical ownership, shared-rim continuity, exact history, persistence/resource limits and local refinement rules. Unlike display interpolation, it would add authoritative data.

## Evidence and limits

See [completion](A7-P1A-R-COMPLETION.md) and [matched visual review](evidence/a7-p1ar-visual-review.html). Independent double-precision CPU geometry/field checks compare GPU colors and physical-gradient relief, including cuts, rims, centers and orientations. Subpixel envelopes cover actual multisample coverage; center errors are retained. Whole-word, preview, history, mixed-format persistence and context-failure regressions remain required.

CPU submit time is not GPU completion or photon latency. Input-to-following-RAF opportunity is a presentation proxy. Frame intervals are measured separately. Mobile performance evidence uses Chromium emulation with fourfold CPU throttling on the desktop GPU, not a physical phone. Fallback remains lower-resolution and slower, especially on throttled mobile; its active backing and reason are observable.

GPU display arithmetic does not replace exact Float32 numerical inspection/history/save words. Independent pointer feedback can still wait behind synchronous numerical tasks. P1B, illustrated cartography, 3D terrain, new geometries and integration require separate authorization. Stop for Ember review and owner visual acceptance.
