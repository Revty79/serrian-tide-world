# Hollow Octahedron operational checkpoint

This follows the verified Solid Octahedron at
`6adc8e37d3d972ad1a88554b4f416819c148b014` under Overnight Queue 2.
The accepted two-bank document/session/workspace/persistence mechanisms are
configured with actual regular octahedral geometry. No additional painting or
presentation system is introduced. Owner acceptance remains separate.

## Physical shell and protected geography

The boundaries are concentric, equally oriented regular octahedra with explicit
outer and inner edge lengths. Every outer supporting plane is at
`edge/sqrt(6)` from the centroid. Certified minimum reference clearance is
`(outerEdge-innerEdge)/sqrt(6)`, evaluated with outward intervals and the accepted
roundoff guard. The default 1,000,000 / 800,000 m edges give approximately
81,649.658 m clearance. Tests check all six inner vertices against all eight
outer planes, covering complete edges and faces by convexity.

Volumes use `sqrt(2)*edge^3/3`, with factored shell subtraction. Unsupported,
touching, nonfinite, inverted or ambiguous thin shells reject before either bank
is allocated. Each bank limits absolute elevation to the lesser of one quarter
of certified shell clearance and one eighth of its own minimum physical width.
Default bank bounds are approximately +/-20,412.415 m. Thin models require the
explicit 0 m reference-shell option; safe models start at the shared -100 m ocean.
No existing elevations are reinitialized or clamped.

One parent World owns two independently identified surfaces and terrain arrays.
Each has `4*N*N+2` canonical words: 65,538 at N128, 262,146 at N256. Edges and
four-face vertices have one owner on their bank. Foreign keys and duplicate bank
identities reject. Inward normals point into the cavity; positive inside heights
rise toward it. No fake physical connection joins the separate boundaries.

## Accepted editing, inspection and storage

Paint Outside and Paint Inside use comfortable fitted editing. Both use the
same verified eight-triangle connected map, worker protocol, mathematical brush
kernels, exact whole-gesture history and sharp GPU/Canvas presentation as Solid
Octahedron. Shared brush controls stay within the selected bank's physical
limits. Each bank retains its editing pose and separate history.

View from inside is actual eight-plane cavity-center perspective and is read-only.
Camera changes and toolbar/keyboard history cannot mutate either bank while
inspecting. Return to editing restores the exact preceding pose and controls.
Visibility uses real inward/outward incident faces, including four-face vertices.
All twelve physical joins are paintable within a boundary; net cuts remain honest.

Strict format 20 saves both complete banks in fixed exterior/interior order,
exact little-endian Float32 words, identities, physical configuration, numerical
detail, selected bank and checksum. Header, counts, physical bounds and payload
validate before replacing active geography. Either changed bank revision, name,
selection or canceled work rejects the save. Signed zero and both reopened
banks are tested exactly. Existing formats 1-19 retain their interpretation.

Cache resources use the qualified Solid Octahedron profile. Each N256 bank owns
22,135,000 bytes of derived cache ArrayBuffers; the sum of both bank observations
is 44,270,000 bytes. One active N256 field texture is 8,454,272 bytes. These are
separate from authoritative terrain, workers, history and Canvas bitmaps. The
World authority itself is 2,097,168 bytes at N256. No work, history or display
backing limit is increased for the hollow configuration.

## Verification

The focused geometry/storage checks pass and the full suite passes 1,490 units
plus build/TypeScript. Preflight actual RX 6600 GPU/Canvas pixels and cavity
navigation pass at both numerical details. Stable terrain color error is at most
2, with zero interior-coverage gaps or silhouette violations. Cavity navigation
p95 input-to-pixels is 9.8 ms on GPU and 46.2 ms on Canvas; corresponding p95
presentation is 0.2 / 42.2 ms. Inspection does not alter terrain or history.

Ordinary painting uses the unchanged 200 m strength. Measured p95 milliseconds
are input-to-visible, including numerical preparation, commit and presentation:

| Detail / backend | Outside face | Inside face | Slowest outside join | Slowest inside join |
| --- | ---: | ---: | ---: | ---: |
| N128 WebGL2 | 46.9 | 48.4 | 57.3 | 63.2 |
| N128 Canvas | 44.7 | 44.1 | 52.1 | 57.8 |
| N256 WebGL2 | 68.3 | 87.5 | 85.7 | 115.3 |
| N256 Canvas | 64.9 | 94.2 | 85.6 | 113.1 |

All twelve joins are exercised on each bank, with Raise, Lower, Smooth and
Flatten, whole-gesture Undo/Redo, exact both-bank format-20 reopen and continued
worker painting. Before/after/reopened canonical hashes agree bit-for-bit
between GPU and Canvas for both details. The finer physical spacing of the
800,000 m inner bank puts more samples inside the same metric brush radius;
its numerical work is correspondingly higher. It retains the same engine and
quality policy.

Each bank also receives separate 20-second held map and four-face vertex strokes
at N256. Map endurance uses an explicit 20 m strength to remain within the shell
elevation limits; the default and vertex tests retain 200 m. GPU/Canvas map p95
input-to-visible is 32.6 / 34.9 ms outside and 33.6 / 48.7 ms inside. Four-face
vertex p95 is 69.4 / 56.8 ms outside and 92.1 / 93.2 ms inside. All retained
positions finish without a stop, discard or cancellation, each gesture remains
one exact history operation, and unrelated opposite-hemisphere and other-bank
hashes remain unchanged. Held maps cross the existing bounded work-epoch
transition (395,230-567,349 distance queries); no global work budget is raised.

The frozen-source final run passes 49 browser cases: 17 native hollow cases,
two trusted touch/pen cases under Pixel 7 browser emulation, 15 Solid Octahedron,
eight Pyramid and seven earlier-family regressions. The last group includes the
original Open Cylinder wall/rim endurance and sharp 1.49-million-pixel gates in
both GPU and Canvas. There are zero unexpected failures, retries, flaky cases
or skips. Browser emulation is not physical-device evidence or owner acceptance.

The [receipt](evidence/octahedron-hollow-editor/receipt.json) records all 628
frozen source/config inputs and 87 evidence artifacts, with tested working-byte
hashes and canonical Git-blob hashes. Sixteen accepted painting, worker, history,
field, projection and presentation mechanisms are byte-identical to the
published Solid Octahedron. Both exterior pixel fixtures also retain the complete
canonical word hash of the solid reference. Captures of fitted inside, connected
map, cavity and held painting have been visually inspected alongside numeric
pixel gates. The build retains the existing nonblocking bundle-size warning.

Displaced terrain meshing and Octahedron holes/tunnels remain separate systems.
The supported nested model is centered and equally oriented; arbitrary cavity
translation/rotation is not implied.
