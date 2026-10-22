# Hollow Sphere: basic radial-hole checkpoint

This extends the published sphere editor `3150267` with functional direct holes.
Technical verification is complete; owner/Ember acceptance remains separate.
Sphere tunnel networks and reciprocal map links are the next authorized work,
followed by capped Hollow Cylinder and its connections, then Open Cylinder.

## Supported workflow

One `ThroughHole` object owns two independent mouth identities. Their spherical
directions align across the inner and outer radii, including chart seams and
poles. Moving and resizing preserve those identities. The physical bore is a
straight radial capsule whose end balls lie outside the shell material; analytic
subtraction clips it against the actual two spherical surfaces. It has no tunnel
network nodes or segments.

| View | Editing and hole presentation |
| --- | --- |
| Paint Outside / Globe | Sculpt outside terrain; inspect the physical reference-shell cut and exposed opposite geography |
| Paint Inside / fitted Globe | Sculpt the actual independent inside bank; mouth markers identify openings |
| View from inside | Read-only cavity camera with physical cuts; Globe or Net returns to editing |
| Six-face net | Edit connected spherical geography and locate mouth markers |

Cut Hole starts placement with a correctly scaled spherical aperture outline.
Selecting a point prepares a physical preview. **Create Hole** publishes it after
geometry and terrain-support checks. Cancel leaves terrain, objects and history
unchanged. Selected holes have numeric width, on-map Smaller/Larger controls,
identity-preserving move, removal, Undo/Redo and Save/Open. The authoring controls
survive switching sides and views.

Physical views identify the inside terrain visible through an outside opening.
That visible opposite surface, rock walls and open space cannot be painted or
picked as if they were the selected surface. Reference editing views label their
marker-only presentation. The immersive view disables painting and hole-authoring
editing controls.

## Hands-on review

1. Refresh the preview and create a Hollow sphere world with outer radius
   1,000,000 m, inner radius 800,000 m and N128. Existing v8 Worlds remain usable.
2. Draw different terrain on the two sides. Leave ample untouched, level 0 m
   ground around the intended opening on both sides.
3. In Atlas tools, set Opening width to 30,000 m and choose Cut Hole. Close the
   tools, select the intended point, then reopen them to review the proposal.
   View proposed Inside/Outside hole locates either mouth. Choose Create Hole.
4. Select the hole, apply a 40,000 m width, use on-map Smaller/Larger, move it,
   remove it, and Undo/Redo. **Undo scope** selects terrain or holes/connections.
5. Inspect Outside Globe and View from inside, then return to the fitted inside
   editor or Net. Brush preferences and both terrain banks must remain intact.
6. Save, reload, Browse saved maps and Open Map. The hole and exact connection
   Undo/Redo return. Continue sculpting away from protected opening support.

## Geometry and safety domain

This checkpoint cuts the **reference shell on level 0 m ground**. Both mouths and
conservative interpolation/gradient support must remain level. A protected-sample
policy rejects the entire prepared dab before any write. Whole terrain Undo/Redo
also validates before changing terrain or history stacks. Moving or removing an
opening rebuilds its derived support mask through a locked geometry transaction.

Supported hole radius is at least `outerRadius * 1e-5` and at most
`min(innerRadius * 0.1, shellThickness * 0.25)`. Reference-cut shell thickness must
be at least `outerRadius * 1e-4`. A thinner World remains editable, with an explicit
explanation that hole authoring is unavailable at that scale. Separate hole bounds
cannot overlap. Geometry and history remain unchanged after rejected proposals.

These bounds reserve reference-shell precision and clearance. Displaced mountain
or seabed excavation, a full material mesher, unrestricted tiny-feature precision
and free-roaming collision/navigation remain later work.

## Persistence and reuse

Version **9** checksums both exact little-endian Float32 banks, immutable parent
geometry and surface identities, selected role, direct-hole objects and a bounded
connection journal. Fields, sizes, dimensions, dense arrays, identities, alignment,
support and replay states validate before an Open candidate is promoted. Anchor
validation preserves exact valid chart angles; direction-vector differences avoid
the precision loss of comparing near-one direction cosines.

An explicit Save can upgrade the same immutable World from v8 to v9. Featureless
v8 records retain their interpretation. Versions 1–7 and accepted cube contracts
remain unchanged. Terrain histories remain session-only; connection history is
saved. Connection metadata uses the existing `TerrainHistory`, with 256 KiB state
words, a 4 MiB journal budget and 64 retained entries. There are at most 48 cuts.

The sphere retains its accepted brushes, sessions, worker protocol and numerical
ownership. Only host sample protection and atomic replay validation were added.
The existing spherical renderer gained analytic shell subtraction and an opposing
field texture. Canvas traces projected cut bounds and keeps the established fast
field path elsewhere. Both use the accepted palette and shared sphere/capsule
intervals. The extracted cube shader remains byte-identical to `3150267`.

## Verification and evidence

The full numerical suite passed **1,235** cases, including aligned seams/poles,
real bore walls, shifted-anchor rejection, protected cooperative/worker dabs,
atomic terrain replay, connection transactions and v8/v9 corruption checks.
Typecheck and the production build passed.

The complete desktop/Pixel 7 workflow matrix passed **22** cases. Focused checks
also passed eight native-input/palette cases, four physical-cursor cases, two
thin-shell cases, twenty existing solid-sphere cases, and four existing cube
physical-passage cases. Groups overlap. Trusted CDP pen/touch includes cancelled
contacts and two-contact navigation without accidental placement. Graphics-loss
fallback preserves real cuts and both banks. Mobile proof is browser emulation.

All eight 15-second painting cases passed with a real pole hole, N128/N256,
inside/outside, WebGL2/Canvas, exact whole-gesture replay and opposing-bank
isolation. Observed first changed pixels: **68.7–203.3 ms** at 100 ms observer
cadence. Release to coherent display: **26.7–365.2 ms**. N256 Save/Open with the
hole took **1.48 s / 5.10 s**, including support validation. The receipt states
the timing and memory-accounting limits; these are not per-input first-pixel or
total-process-memory claims.

[Compact receipt and case identities](evidence/hollow-sphere-holes.json).
[Desktop physical cut](evidence/hollow-sphere-holes/desktop-auto.png),
[Canvas fallback](evidence/hollow-sphere-holes/desktop-canvas.png),
[mobile emulation](evidence/hollow-sphere-holes/mobile-auto.png).

Reproduce with a fresh dev server: `npm run dev -- --port 5262 --strictPort`,
`npm test`, `npm run build`, and
`npx playwright test --config playwright.hollow-worlds.config.mjs`.
For the held-painting cases, set `SPHERE_LONG_HOLES=1` and run
`npx playwright test --config playwright.hollow-worlds-long.config.mjs`.

No website, shared database, server, Docker or Production deployment is included.
Sphere physical tunnel graphs and reciprocal map links remain pending under the
updated overnight authorization; no unfinished feature is claimed operational.
