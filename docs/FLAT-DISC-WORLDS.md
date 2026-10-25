# Flat Disc Worlds

Checkpoint A implements the physical/numerical foundation. The creator/editor and
format-42 integration are still pending; this checkpoint is not a delivered
operational World. The verified starting point is Spiral `894b124`.

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
will be creation-only. Heights retain the accepted finite Float32 reference-field
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
