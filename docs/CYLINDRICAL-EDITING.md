# Physical cylinder development editor — A7-C

This is a real, session-only editor for the existing solid capped exterior. Both views use one `CylindricalTerrain`, the accepted A7-B2B2 stroke engine and its exact history. [Numerical foundation](CYLINDRICAL-HEIGHTMAP-FOUNDATION.md), [certified distance](CYLINDER-GLOBAL-DISTANCE.md), [atomic dabs](CYLINDRICAL-SCULPTING.md) and [continuous strokes](CYLINDRICAL-STROKES.md) retain their original code and mathematics.

## Open the preview

```powershell
cd D:\serrian-tide-world
npm.cmd run dev
```

Open **http://127.0.0.1:5173/dev/cylinder.html**. Stop the local server with Ctrl+C. The ordinary Atlas route remains http://127.0.0.1:5173/.

The preview starts blank at −100 m, sea level 0, reference radius 1,000,000 m and length 1,600,000 m. Standard detail is 128 angular samples / 64 axial cells / 32 radial cells, **16,258 canonical samples**. Lightweight 64/32/16 and higher 256/128/64 are available in tools; select detail then **New blank cylinder**. Replacement of modified terrain requires an explicit discard decision. Cancellation retains terrain, identity, view and history. This is not map conversion.

The persistent notice says **Development preview · session only · cannot save**. There is no Save button, library, IndexedDB adapter, codec, autosave or account. Ctrl/⌘ S explains that saving is unavailable. Reloading/closing loses the terrain; supported browsers warn after edits. Returning to Atlas does not preserve the cylinder. A7-D must supply validated preservation before ordinary Cylinder creation joins New World / Map.

## Working controls

- **Physical view:** rotate a real curved side and circular caps. A convex cylinder cannot show both opposite cap interiors at once. Use **Center region → Start cap / End cap / Side**, or rotate, to examine each. This is the reference shape; elevations color it without displacing it into Phase 6 terrain.
- **Surface map:** the side is an aspect-correct rectangle; both ends are genuine circles. Matching colored angle markers identify real geographical connections. White tangent points are the continuous displayed joins. Dashed boundaries are projection cuts, never added geography or false sewn edges.
- **Select and recenter:** select Rotate / Pan and click a valid position, or focus the canvas and press Enter to select its center. **Center region → Center selection** centers it. In Surface map this also moves the working meridian and rotates the disk charts consistently. Geography and sample ownership do not move.
- **Drawing:** mouse, pen or one finger uses Raise, Lower, Smooth or Flatten. Open **Cylinder tools** for meter radius, meter-per-dab strength, percentage intensity and signed meter Flatten target. Invalid settings disable painting. Settings are frozen at stroke start. Samples beyond the supported work limits stop explicitly; no approximate substitute is applied.
- **Navigation:** Rotate / Pan, Space-drag, middle-drag or two fingers; wheel/pinch, ± buttons, canvas +/− keys and arrows. **Fit cylinder** or Home resets the active view. Zoom is 60–600%. The collapsible panel overlays the map without changing its viewport or geographic proportions. Escape interrupts drawing and closes tools, returning focus to its toggle when appropriate.
- **History:** Undo/Redo and Ctrl/⌘ Z / Ctrl/⌘ Shift Z (also Ctrl Y). Native text-field Undo stays native. Each held gesture is one operation. Release drains accepted input; interruptions discard pending work and retain one exact reversible committed prefix, with a visible explanation.
- **Fullscreen:** optional browser Fullscreen API, requested only by a button click, observes exit, catches failure and preserves numerical terrain. It is independent of view proportions.

No cylinder assisted rotation or edge scrolling is introduced. Navigation interrupts drawing. A new gesture can continue after repositioning the working area.

## Physical projection and visibility

The renderer uses browser CPU ray casting and Canvas; the server requires no GPU. Work in reference-radius units, with `q = (x/R, y/R, (z−L/2)/R)`, half-length `h=L/(2R)`. Camera right/up/forward form an orthonormal right-handed frame. One uniform scale maps the projection to the viewport:

```text
screenX = width/2  + scale · dot(q−target, right)
screenY = height/2 − scale · dot(q−target, up)
```

At a screen point, the orthographic line is `o + t forward`, with o in the camera right/up plane. Intersect the lateral quadratic `x²+y²=1` with z in [−h,h], and the two planes z=±h with radial distance ≤1. The **greatest valid t** is the frontmost hit. A stable quadratic root form avoids cancellation. Cap orientation uses the established physical theta: side/start theta=u, end theta=−u. Centers normalize to one position. The inverse returns no position in non-map space. Small boundary guards cover Float64 projection roundoff, not editable pixel margins.

Projection visibility also checks outward one-sided facing and equality with the frontmost ray depth. At a shared rim, either incident sheet can expose the same canonical point. The guard uses a depth allowance `2e-9 × max(1,h)` in radius units and rejects negative facing; hidden cap centers and side interiors remain unprojectable. Independent tests check all regions across camera orientations, cap-facing views, seams/rims and desktop/ultrawide/square/tall viewports.

The physical editor freezes its view for each stroke. Before **each** numerical commit, including asynchronous queued dabs, it verifies the actual center and all changed canonical samples against that frozen visible surface. A dab reaching hidden terrain is rejected atomically, with a message to rotate, reduce radius or use Surface map. It does not silently clip the brush or change the accepted formulas. Affected front-facing terrain outside the viewport can remain part of a valid dab; viewport clipping and physical occlusion are different conditions. Smooth may read intrinsic neighbors while only visible changed samples are writable.

Camera changes cancel pending numerical work before changing orientation. Pending raster jobs are cancelled on view/size changes. Hit testing uses the **applied** view and size of the actual image, and drawing waits while a new camera image is pending. Resizing clears the prior bitmap until a correctly proportioned view is ready. It never stretches numerical terrain or paints through an outdated transform.

## Surface-map projection and real joins

With delta = wrapped(theta−phase), coordinates in radius units are:

```text
side:      x=delta,             y=z/R−h
start cap: x=(r/R) sin(delta),  y=(r/R) cos(delta)−h−1
end cap:   x=(r/R) sin(delta),  y=−(r/R) cos(delta)+h+1
```

Thus the side spans 2πR by L and each disk has radius R. The outward end-cap orientation is correct. The disk and straight rim line can coincide at only one tangent point in this layout; the editor makes this limitation visible. Elsewhere matching angles are geographical correspondences across a cut. The hit inverse treats actual gaps as empty. A side/cap screen segment continues only through the real displayed tangent join (within `1e-8` radius units of coordinate roundoff). Both directions and both rims use the same accepted physical engine. Side/cap aliases share a canonical word; cap-center aliases never duplicate authority.

Same-region screen segments lie in their convex rectangle/disk. Cross-region false joins and cap-to-cap shortcuts are rejected. Pointer segments over **96 CSS pixels** reject before geographic movement; B2B2 also retains its default physical local bound `min(4 × radius, πR/4)`. The UI never supplies the explicit long-shortest-surface bypass. It does not invent intermediate geography or silently coarsen/drop accepted points. Recenter the working cut to bring a desired angular wrap or rim join to the center, or lift and restart across a visual cut.

This is a cylinder-specific view provider. Its rectangle/disks are not a universal arrangement for future spherical, hollow or polyhedral surfaces.

## Exact brush stencil and display data

The pointer preview performs an **actual B2A dry preparation**, at the current source revision and current settings. It never commits. The dots are the exact canonical sample words that the next dab would change; the status also reports all samples inside the intrinsic influence. It shows cap shortcuts, centers, rims and periodic angles without a misleading screen-space circle. Shared rim changes appear in both relevant map aliases but still represent one sample. Physical previews use the same visibility guard as commit.

This is a numerical change stencil, not a continuous contour or invented high-resolution terrain. A flat/no-op Smooth can show zero changed dots while reporting its physical affected count. While calculating, it clears the previous stencil and reports progress. Stale/failed/cancelled previews do not write terrain. During a held stroke the dots show the last committed physical dab; idle hover computes the next dab. Source/settings/view changes invalidate the preview. Canonical stencil projection is redrawn only when its data, selection, view or backing size changes.

One shared **packed RGBA palette-color cache**, four bytes per canonical sample, is derived from the authoritative values. No view owns an elevation copy. Side/cap interpolation resolves canonical rim/center indices and interpolates display colors; exact readouts use the nearest authoritative sample. Interpolation adds no numerical geography. Raster edge coverage uses real subpixel rays around boundaries, separate from brush hit testing. Physical shading changes colors only.

The browser adapter inherits the real closure-backed B2B2 history and observes its ready handoff. It stages bounded indices and palette colors before calling the **same** atomic history transaction. Successful commits update colors without allocations in that update loop; pending failures leave authority untouched. Undo/Redo uses the original history and refreshes only its operation's indices. There is no UI-only history stack or full terrain copy per dab. The adapter is currently the sole writer; a future external/worker writer must synchronize authority revisions and rebuild/update display caches explicitly.

The UI chooses B2B2's existing spacing option as **0.2371 × physical radius**. Quarter-radius default traversal from an initial cap-center sample predictably reaches exact brush-boundary ties after four advances. This noncommensurate controller setting avoids that common case while retaining the original interval membership and all residual/count safeguards. It cannot eliminate every exact numerical boundary tie. The original B2B2 default and formulas remain unchanged; both its original tests and a new UI-spacing cap-center regression pass.

## Scheduling, limits and memory

| Resource | Development-preview policy |
| --- | --- |
| Numerical detail | 64/32/16, 128/64/32, 256/128/64 only; maximum 65,282 canonical samples |
| Candidates / distance calls / boxes in one dab or dry preview | 8,192 / 4,096 / 65,536; original B2A hard limits are not increased |
| Prepared changed payload | At most 65,536 bytes (8,192 samples × 8); history remains separately bounded |
| Dabs per gesture | 2,048, caller-lowered from B2B2; all original input/aggregate/history safeguards retained |
| Numerical frame slice | Up to eight pump calls, 16 candidate steps each, soft elapsed budget 3 ms |
| Dry preview | One 32-candidate pump per frame while idle; paused/cancelled for editing |
| Raster | Desktop 40,000 interactive / 160,000 settled pixels; coarse-pointer 22,000 / 90,000; API hard cap 180,000 |
| Raster step/frame | At most 2,048 pixels / 10,240 actual rays in one step; at most 16 steps, soft frame budget 9 ms |
| Canonical palette cache | 16,136 / 65,032 / 261,128 bytes at the three detail levels |
| Ready stencil | At most 8,192 indices / 32,768 bytes; one next preview and one last applied stencil |
| Per-dab staged display indices/colors | At most 65,536 bytes, reserved before numerical commit |

One pending raster captures one coherent palette-color epoch. Color edits can continue while that image finishes; subsequent work presents the newer epoch. Front image and reusable raster storage are bounded; an incompatible reusable argument can remain alive during a pending size/quality change, so a conservative transient allowance is **three rasters × 180,000 × 4 bytes**, plus one palette snapshot. GC can retain unreachable old allocations temporarily. The browser diagnostics separately report actual completed/reusable raster payload and canonical cache bytes. They do not count pending storage as if it were zero.

Scene and pointer-overlay native canvas backing is capped at 3,000,000 pixels **each** (DPR ≤1.5), plus the bounded scratch canvas. Native Canvas/compositor/browser buffers, JS Maps/objects, staging, caller snapshots and the authority/history remain additional. This is not an exact process working-set bound. The [allocation receipt](evidence/a7-c-preview-allocation.json) excludes the already-existing authority, checks pending color/raster payload, 100 dry-preview cancellations and disposal while the session remains referenced. Its ArrayBuffer deltas equal declared live payload, and disposal releases derived storage/history to zero additional bytes.

B1 queries, one high-valence Smooth calculation, history handoff/commit/Undo/Redo, stencil projection and a raster step are synchronous and non-preemptible. Candidate/ray counts and soft elapsed budgets **do not guarantee frame time**. Unsupported precision/work/history configurations stop explicitly with reversible committed terrain. The browser evidence includes real delays, 4× mobile CPU emulation, N=128/256 cap Smooth/Flatten, rim edits, repeated/long/cancelled strokes and actual heap readings. Higher detail can have noticeable queued-input latency; the lighter setting remains available. No speedup or universal device claim is made.

## Verification and A7-D boundary

Run `npm.cmd test`, `npm.cmd run test:browser`, `npm.cmd run build`, and `node --expose-gc scripts/measure-cylinder-preview.mjs`. The normal browser suite includes the real development preview. Its read-only development diagnostics and test observer never install terrain or bypass pointer editing. Actual pointer traces are replayed in a separate accepted numerical engine instance and compared sample by sample. Original B1/B2A/B2B2 numerical sources/tests remain unchanged. See [completion, exact files, screenshots, traces and measurements](A7-C-COMPLETION.md).

A7-D must explicitly extend the unified document/library/shape selection only after an independently versioned, validated cylinder record can preserve identity, physical dimensions, representation/ownership, resolution, exact Float32 words, integrity and resource limits. Preserve v1/v2/v3 interpretations; no conversion/migration is implicit. Add atomic Save/Open, failure-safe/discard-aware document replacement, accepted-input draining, real saved checkpoints despite history eviction, and full compatibility tests. The preview's revision-based conservative departure warning is not a saved-state checkpoint implementation. Review device/large-footprint limits before exposing broader configurations.

The complete eleven-phase roadmap remains mandatory, including functional linked maps before isolated integration with existing Worlds. Authentication, authoritative permissions, database and World records remain host responsibilities. No original website, Worlds, database or production deployment is modified.

**Stop after A7-C for Ember's independent review. Do not begin A7-D.**
