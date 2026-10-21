# Cube-E — interactive solid cube

2026-10-21. Built on owner-accepted Cube-D1 delivery
`3a267b77b4d9b1b2dc654ac0c519f363841407ce`. Technical checkpoint;
Cube-E has not received owner acceptance. Cube-F follows under the same authorization.

Open `http://127.0.0.1:5260/dev/cube-editor.html` while the local preview is running.
For a new preview run `npm.cmd run dev` and use port 5173. Add `?n=256` for N256
or `&backend=canvas` to exercise the fallback. This page is a temporary working
session, not a saved World. Leave the tab open to retain it until Cube-F.

## Try it

1. Drag with Raise. Adjust radius and strength. Lower carves valleys; Smooth and
   Flatten offer intensity, and Flatten has an explicit target elevation.
2. Use Corner, the face buttons, Navigate, or Space + drag to inspect the cube.
   Wheel / pinch zoom. Navigate pans the unfolded map. Navigation never paints.
3. Draw across the physical joins in 3D, including the three-face corner.
   Unfolded map paints the same authority. Its five drawn joins are continuous;
   blank space and cut edges end a gesture. Rotate the cube to cross a cut.
4. Undo and Redo restore the whole held gesture. Wait for accepted input to finish
   before starting another gesture. The footer reports dabs, queue and point count.

## Implementation and limits

Cube-A geometry, Cube-B routes, C1 brush distances/dabs, C2B2 sessions, paired
path workers and exact history remain authoritative. The editor adds input
arbitration, bounded retained backpressure, task scheduling, progress, a cursor
and a sampled physical footprint using the C1 distance plan. Mouse, native browser
pen and touch events are exercised. Physical-device testing remains owner work.

History explicitly opts into up to the whole canonical surface (98,306 / 393,218
samples), with the existing 32-entry / 8 MiB retained-history budget and eviction.
C1 single-dab capacity stays 65,536. Legacy callers retain the old history default.
Replay validates the entire patch before any write, preserves signed zero, and
rejects conflicts atomically. Draft plus active plus retained patches are bounded;
their transient peak may exceed the retained 8 MiB budget, below 18 MiB at N256.
The browser wide-stroke case changes **135,933 words in one operation**, with exact
Undo/Redo. A separate numerical case verifies signed-zero replay and final-word
conflict rejection above the old ceiling.

Other accepted execution bounds remain: 256 accepted points, 4,096 dabs,
16 million aggregate dab/path work units, and a 128-point UI queue. Release and
start another gesture for very long / complex strokes. At 192 points the footer
asks the creator to release soon. Exhaustion/cancel retains an explicitly labelled
partial operation. Further drawing and Save require Undo or **Keep partial result**.
Failed prefixes are never relabelled complete. Overflow is tested.

D1 appearance is retained. Editor display preparation caches geometry resolvers,
copies exact full-resolution derived fields, recomputes affected stencils, updates
changed WebGL texture rectangles and repaints affected Canvas atlas regions.
Presentation never edits terrain. Brush contours are visually sampled; numerical
brush membership remains certified and exact. N256 / wide brushes can queue work;
navigation and progress remain responsive while it drains.

## Verification and evidence

- Full numerical suite: **967/967 passed** after history changes. Later display
  optimization received focused field/history and accepted D1 regressions.
- Editor browser coverage: N128/N256 × WebGL2/Canvas × desktop/Pixel7 emulation;
  all four tools, multiface paths, exact history, navigation without mutation,
  actual changed pixels, native pen, single-touch drawing and two-finger navigation.
  Four-face wide and physical corner cases add coverage on both projects.
- D1 regression: **8/8 passed**, actual GPU/Canvas pixels on all faces/edges/corners,
  context loss/recovery, current revision and disposal, N128/N256 on both projects.
- Build/typecheck passed. Protected prior evidence was preserved by running D1
  evidence writers in an isolated working directory.

`docs/evidence/cube-e-*` contains actual painted screenshots and browser metrics.
`cube-e-performance.json` explains measurement boundaries. Final ordinary stroke
first input → verified changed pixels: **67–82 ms N128; 96–152 ms N256** on this
machine (AMD RX6600 / Chromium). The sparse fast three-face test queues 130 dabs;
continuous input-to-display timing includes that backlog, reaching seconds at
N256. These are measured limits, not claims of zero-latency drawing. Startup GL
initialization can cause a roughly half-second long task; Canvas avoids it.
Pixel verification reads a 128×128 image of actual presented pixels; the recorded
two-RAF paint opportunity is browser scheduling evidence, not monitor photon time.

Source inventory and concise test receipts accompany this checkpoint. No original
website, shared database, Docker, hosting or Production changes. No hollow or new
shape work. Roadmap and future physical cave/tunnel requirements remain unchanged.
