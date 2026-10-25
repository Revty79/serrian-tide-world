# Flat Disc Worlds

Checkpoint A (`5d38de0`) implements the physical/numerical foundation. Checkpoint B
integrates the operational creator/editor and format 42. Final configuration,
independent rendering, recovery and broader regressions remain checkpoint C.
The verified starting point is the completed Spiral `894b124`.

A Flat Disc is the existing closed circular cylinder, with radius R and material
thickness H. The two actual circular caps have independent interiors and single
center samples. The periodic sidewall owns both shared canonical rim rings. The
body occupies z=0..H; the accepted camera centers it at z=H/2. Normals, physical
intersection, polar/Cartesian metrics, continuous shortest routes, field, brushes
and exact history are reused from the capped cylinder.

Diameter is 100,000–1,000,000,000 m. Thickness is 2.5–20% of diameter. Standard is
2,000,000 m diameter by 100,000 m thick. N128/N256 use 128/256 angular samples,
48/96 radial cells per cap and a proportionate number of sidewall cells. All
profiles stay inside the existing 65,282-sample cylinder display cap. The thin
2.5% profile requires Higher detail to retain a useful physical brush. Dimensions
are creation-only. Heights retain the accepted finite Float32 reference-field
semantics; they do not displace or subtract physical material. Blank ocean is -100 m.

A thin-disc numerical sweep exposed avoidable cross-material distance queries:
two 120 km center dabs exceeded the unchanged query limit, and one mid-radius dab
took 138 ms in Node. A conservative mandatory-rim lower bound now rejects those
unreachable samples before the unchanged continuous distance solver. Opposite-cap
paths must traverse both radial clearances and the full axial span; cap/wall paths
must traverse one radial clearance and the required axial span. The bound is used
only for exclusion, with the existing floating-point guard. No influential distance
or brush arithmetic changes. The same 40 probes pass after this change, with a
maximum measured Node preparation time of 18 ms. Browser qualification remains
separate from those numerical timings.

Foundation validation covers genuine dimensions/normals/closed connectivity,
single centers and exact rim ownership, planar and exterior-route distances, all
four tools and exact history, protected opposite centers, and legitimate exterior
influence onto the underside. Accepted cylinder numerical, field, worker, history
and format regressions accompany these checks. Frozen receipts belong to their
own commits. Owner visual/device acceptance remains separate from engineering
verification. Flat Ring and new excavation are outside this pass.

## Operational editor checkpoint

The normal creator offers **Flat Disc World**, diameter (also World Size),
thickness, N128/N256 detail and Thin/Standard/Thick/Wide presets. Changing diameter
scales thickness proportionately. Thin/Wide select Higher detail; invalid
dimensions/detail disable creation. Default detail uses 12,802 samples; Higher
uses 51,458. At the supported extremes, Higher uses 50,178–58,882 samples.

The editor specializes the accepted capped-cylinder adapter, display cache,
Hermite height/gradient reconstruction, shaders, Canvas raster, worker protocol,
four tools, scheduling, history and Atlas shell. Only Flat Disc opts into the
existing rolling-work stroke policy. No display, work, history or backing budget
increases. Its default brush is smaller than half the thickness, so a physical
sidewall stroke does not inadvertently demand editing an invisible opposite cap.
Larger legitimate exterior footprints remain available in the connected maps.
The existing physical visibility guard rejects hidden influential samples before
applying a pending dab; rotate, reduce radius or use a map for those footprints.

Physical view supports orbit, Pan World, wheel/toolbar zoom, Fit, overview and ten
useful region focuses. Upper and Lower maps expose complete circular geography;
Sidewall map unwraps the real circumference. Complete boundary map shows both
caps and wall together. Real attached rims remain connected; the periodic wall
map has an explicit working-meridian cut. Lift/restart at the cut or change the
meridian. All views edit the same canonical terrain. A focused rim camera shows
the adjoining cap and sidewall together.

Format **42** was allocated after inspecting the local registry: published
formats 1–20 and 25–41, with 21–24 reserved. No Earth-Form or Filled-Torus codec
is present in this checkout. Existing formats keep their original meanings.
The new strict format covers dimensions, construction/topology version, three
distinct World/surface/terrain identities, region mapping, exact sample profile,
units/sea level, camera/navigation/brush controls, private little-endian Float32
words and SHA-256 integrity. Unknown fields, mismatched metadata, invalid cameras,
wrong payload lengths and nonfinite/corrupted words reject before replacement.
An existing saved World cannot be overwritten with different geometry/detail.
History remains session-local; Save/Open preserves canonical geography and editor
configuration, including negative zero words.

Installed Chrome on AMD Radeon RX 6600 passes all four tools in ten physical
regions, N128/N256, hardware WebGL2 and forced Canvas. Every gesture has exact
whole-word Undo/Redo. Four 15-second strokes complete without discarded accepted
positions. Ordinary regional painting p95 is at most 53.2 ms GPU / 79.5 ms Canvas;
held p95 at most 27.0 / 89.6 ms. The maximum observed first regional dab is
131.9 ms. All gates retain 125 ms ordinary, 100 ms held and 1,000 ms first-dab
limits. Tests start regional strokes after the ordinary sharp settled image;
the short initial probe also covers painting before full refinement. Its first
attempted coordinate path was corrected to interpolate both screen axes.

All four reopened active images match fresh numerical reconstruction exactly,
including alpha, on both backends/details. The frozen
[editor receipt](evidence/flat-disc-editor/receipt.json) records its own source
and artifact hashes. These are engineering checks on desktop Chrome, separate
from physical-device and owner acceptance.
