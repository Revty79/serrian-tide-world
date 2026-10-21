# Physical cube visual preview — Cube-D1

Cube-D1 provides the first read-only physical cube and unfolded map. Both consume the same accepted Cube-A canonical Float32 terrain. Cube-C2B2 is accepted for progression at implementation `d099606144d827d99f4c6c8ba40fe67933fb474e`, delivery `77df76f3a0a12273f9277d201277f13e9985074d`. D1 now awaits Ember’s technical review and the owner’s first visual acceptance. See the [completion report](CUBE-D1-COMPLETION.md) for measurements, screenshots, preservation and delivery evidence.

## Open and inspect

From this standalone repository, run:

```powershell
npm run dev
```

Open <http://127.0.0.1:5173/dev/cube-preview.html>. Alternatively, open the ordinary standalone application and select the **Development preview: inspect the physical cube (read-only)** link in the New World dialog. It opens a separate tab. The four normal shape options remain unchanged. A currently running verification server may use port 5260; its equivalent URL is <http://127.0.0.1:5260/dev/cube-preview.html>.

1. Start with **Overview**, then **Opposite**, **Edge** and **Corner**. Drag to orbit, scroll/pinch or use +/− to zoom, and **Recenter** to reset. Arrow keys rotate the focused viewport; Home resets it. The six axis buttons center individual faces.
2. Follow the blue coastlines and tan mountain ridge across real right-angle edges. Move over terrain to read signed elevation. The faces stay planar while relief changes their colors.
3. Choose **Unfolded map**. Compare the same coastlines, ridge and valleys at their labeled face locations. Labels show the local U/V directions. This net fits the complete six panels; the camera presets are disabled in net mode.
4. Switch numerical detail between **N128** and **N256**. Each constructs a new demonstration authority from the same analytic reference function. Switching is not a resampling/conversion of an existing World.
5. Choose **Canvas fallback** and repeat both views. Automatic rendering prefers WebGL2; Preview details names the active backend and identifies software graphics when detected. Canvas works even when no WebGL context can be created.

The header always marks this as a read-only development demonstration. There are no painting, history, Save/Open or conversion controls. Closing this tab discards the synthetic demonstration. No World record or browser saved map is created.

## Geometry and connected net

The reference side length is 1,000,000 m. Analytic orthographic rays intersect six actual planar square faces at normalized half-side 1. Physical angles remain 90 degrees. The Canvas path projects those same planar squares using affine transforms. Neither renderer displaces vertices, rounds the cube, blends adjacent face normals or substitutes a sphere.

The net uses unit-width panels in this orientation, with +V upward in the diagram:

```text
           +Y (py)
              |
−X (nx) — +Z (pz) — +X (px) — −Z (nz)
              |
           −Y (ny)
```

| Face | Panel center | Local +U on net | Local +V on net |
| --- | --- | --- | --- |
| +Z / pz | (0, 0) | right | up |
| +X / px | (1, 0) | up | left |
| −X / nx | (−1, 0) | down | right |
| +Y / py | (0, 1) | left | down |
| −Y / ny | (0, −1) | right | up |
| −Z / nz | (2, 0) | left | down |

Five physical edges join directly in the net: pz–nx, pz–px, pz–py, pz–ny, px–nz. The other seven physical edges are cuts in the planar layout and reconnect when folded. They remain the same shared canonical keys. Tests prove projection agreement along all five displayed joins and all twelve folded physical edges. The singular corners retain three distinct one-sided face tangent frames.

## Terrain and relief

`createCubeDemonstration` constructs signed oceans, continental elevation, a folded ridge with smaller relief, and a valley from one continuous function of reference XYZ. It writes each canonical sample once during initial construction. This small test seed is not a general procedural-world generator. N128 has 98,306 canonical vertices; N256 has 393,218. Each shared edge/corner has one authority, independently of display caches or duplicate face reads.

Preparation snapshots source words/revision and derives a six-face `[height, du, dv, 1]` Float32 display field. Centered derivatives use physical meter spacing and the accepted reciprocal fold connections for off-face neighbors. Every face keeps its own normal and folded axes at edges/corners. Gradients exceeding finite Float32 display range reject explicitly while retaining canonical terrain.

Both backends interpolate numerical height and gradient before applying the elevation palette and fixed world-space relief light. Sea level is exactly zero. Water remains blue; land transitions through green/tan to pale high elevation. Relief exaggeration is six for land. This changes shading only. A physical crease may change lighting across its two one-sided normals even when height is continuous.

A real-source N16 subgrid is published first through Canvas, followed by the complete N128/N256 field. It contains actual canonical source samples with source-grid physical derivatives. WebGL initialization starts only after the verified Canvas terrain has received paint opportunities, so cold graphics startup cannot gate first geography. Initial graphics startup can still block the main thread after that point. This is an explicitly coarse first view, not new numerical detail. Full preparation cannot replace or mutate the authoritative elevations.

## GPU, fallback and lifecycle

`SolidCubeWebGL` uses one program, one six-layer RGBA32F texture and one vertex-array object. A fullscreen triangle evaluates the planar cube or net. Manual numerical bilinear interpolation and four subpixel rays provide coverage. Texture upload occurs only for a different display-field object. Camera/view changes require no geography preparation or texture upload.

The independent Canvas path builds six bounded `(2N+1)²` raster caches from the same numerical interpolation/palette/relief and maps them to the exact planar quads. The small coarse cache supplies the first terrain in automatic mode; the full CPU cache is prepared only when Canvas is selected or WebGL actually fails. A forced Canvas startup creates no WebGL context. It uses no server rendering or external service. The shared module dependency on the WebGL file is a pure backing-size calculation; Canvas rendering does not call its WebGL class.

WebGL initialization/shader/upload/presentation errors activate the real-terrain Canvas fallback. Automatic mode also releases GL drawing resources and selects Canvas when the renderer identifies a software adapter such as SwiftShader: measured software GL navigation was substantially slower than the affine Canvas path. The renderer string and reason remain available in diagnostics. This trades longer full CPU-cache preparation for responsive navigation while first coarse terrain remains visible. Hardware WebGL remains preferred.

Context loss keeps source and derived field intact, displays the available coarse/full CPU cache, prepares full CPU detail if needed, and restores/reuploads the current field after context recovery. Coalesced revision-aware jobs reject obsolete generations, source changes and disposal. Explicit refresh is required for an externally changed authority; an old field cannot be silently labeled current. Disposal releases GL objects, zeros raster/canvas dimensions and cancels queued publications.

## Bounds and raster tolerances

| Retained allocation | N128 bytes | N256 bytes |
| --- | ---: | ---: |
| Canonical Float32 authority | 393,224 | 1,572,872 |
| Full RGBA Float32 display field | 1,597,536 | 6,340,704 |
| GPU texture payload, when active | 1,597,536 | 6,340,704 |
| Six CPU face-cache RGBA rasters, when full fallback needed | 1,585,176 | 6,316,056 |

The N16 CPU cache is only 26,136 bytes. Each presentation canvas is limited to 1,200,000 backing pixels and DPR 1.5; two canvas stores can therefore account for at most 9,600,000 RGBA bytes. Coarse/full fields and old/new atlases can overlap while replacement finishes. Preparation additionally holds one canonical snapshot, a temporary canonical index table (N256 1,585,176 bytes), and at most one face ImageData. These payload counts exclude browser, JS objects, GPU driver resources and implementation-dependent canvas copies; measured process memory is reported separately.

GPU output is checked against an independently evaluated CPU ray/subpixel color reference within 2 channel values. CPU-cache pixels are checked within 8 channel values away from shoreline coverage and pixels straddling physical joins. Palette application after numerical interpolation prevents a broad false coastline band. CPU raster filtering can differ within one display-raster texel or screen pixel at a coastline; silhouette and internal quad-edge antialiasing can produce a thin coverage crease. These are documented raster tolerances, not permission to move terrain or expand faces to hide edges. Automated checks and actual screenshots accompany the report; human visual acceptance remains outstanding.

## Preserved scope and next gate

All accepted cube numerical providers, brush/execution/history paths, ownership/version contracts, sphere/cylinder/bounded/wrapped editors and v1–v4 persistence remain unchanged. The 65,536-word gesture-history ceiling remains a separately tracked requirement before a complete Cube-E editor. The eleven master phases, geometry order, custom irregular worlds and future independently editable hollow interior/exterior/passage requirements remain intact.

Stop at D1. A proposed next bounded checkpoint is **D2 visual review and targeted rendering refinement**: review owner/Ember feedback, identify concrete presentation defects, and approve a small measured correction list before coding. No D2 implementation, interactive editing, persistence, hollow geometry, new shape, main website, Worlds, database, Docker, hosting or Production work is authorized by this delivery.
