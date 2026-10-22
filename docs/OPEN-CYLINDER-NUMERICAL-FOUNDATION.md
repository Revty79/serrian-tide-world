# Open Cylinder connected numerical foundation

This is the next checkpoint after published visual correction `2303bd2`.
The connected terrain, bounded metric, continuous paths and shared brush/history
integration are implemented and verified as a numerical milestone. The normal Atlas selector,
three-view editor, new Save/Open interpretation and operational connections are
still required. This document does not claim their delivery or owner acceptance.

The older [assessment](OPEN-CYLINDER-ASSESSMENT.md) remains the evidence that a
closed-cylinder provider cannot be relabeled as open. Its reference prototype
is preserved. The implementation below adds a real connected terrain authority;
it does not turn the prototype's two logical ownership labels into two terrains.

## Actual boundary and ownership

Material has `Ri <= hypot(X,Y) <= Ro` and `0 <= Z <= L`. Its boundary is one
connected surface with four right-handed charts. Every chart's `u` is physical
angle. Its `v`, measured in meters, follows the positive cyclic meridian:

| Chart | Increasing v | Physical material normal |
| --- | --- | --- |
| outer-wall | Z = v | radial outward |
| rim-end | radius = Ro - v, Z = L | +Z |
| inner-wall | Z = L - v | radial inward |
| rim-start | radius = Ri + v, Z = 0 | -Z |

The meridian length is `2L + 2(Ro-Ri)`. All four wall/rim folds identify the same
physical ring with identity intrinsic component transport. Ambient meridian
vectors fold by 90 degrees; their equality in 3D is not asserted. Neither annulus
has a center. A point at its inner edge retains its angle and a distinct sample.

For angular count A, axial cells Z and half-rim cells P, the single private
Float32 authority has `A * (2Z + 4P)` words. Angular columns and meridian rows are
periodic. Walls own their four crease rings; rim interiors own their remaining
rows. Each rim's mid-radius row is stored once. Exterior/Interior are logical
editing scopes; the outer and inner wall regions have independent words, while
their common annuli have one authority. A whole gesture can cross those scopes
without splitting its history transaction or copying a seam.

Keys bind World, surface, terrain, both radii, length, resolution and provider
version. Foreign keys fail before access. Protected terrain validation, complete
patch validation, source revision checks, signed-zero words and atomic writes
use `indexed-float32.ts`, extracted from the accepted cylindrical authority.
The closed provider now uses that same implementation and unchanged hard caps.

## Certified metric cases

Every successful query returns a lower bound valid for **all** physical routes
and an upper bound from a feasible route. Unsupported precision, work or route
classes throw. A continuous feasible approximate shortest path is not called an
exact or unique geodesic.

**Same angle.** Projection onto the cyclic meridian cannot increase length.
The shorter meridian arc at constant angle attains that bound. Error-free TwoSum
residuals enclose sums of the original dimensional/chart terms, with outward
Float64 endpoints when rounding occurs. Exact binary sums remain exact. This
handles a zero-influence sample exactly one brush radius away without changing
the accepted falloff or pretending a padded distance interval is exact.

**Two points on the inner wall.** Since every physical radius is at least Ri,
any route has length at least `hypot(Ri * shortAngle, deltaZ)`. The inner-wall
helix attains it. Its feasible path never visits an end disk.

**Two points on one annulus.** Orthogonal XY projection preserves the circular
obstacle and cannot increase any boundary path's length. Its planar obstacle
distance is attained on that annulus: a contained chord, or two contained chords
joined by an inner-radius circular arc. Tangent angles use the checked path
trigonometry/inverse routines and conservative angle bounds. The feasible
construction uses lower tangent angles, including uncertain tangent transitions.

**Inner wall to a rim.** Write D for axial separation, delta for short angle,
and b for the rim endpoint radius. A feasible family joins an inner-wall helix
turning through phi to the annular obstacle route for `delta - phi`. Native
optimization locates a candidate phi only; it supplies no certificate.

For each `0 <= k <= Ri`, choose
`a <= sqrt(1-(k/Ri)^2)` and define on the angular cover:

```text
F(theta,Z,rho) = k*theta + a*Z + integral_Ri^rho sqrt(1-(k/r)^2) dr
```

On each wall the tangential gradient norm is at most one; on either rim it is
one. Signs of theta and Z can be chosen for the actual endpoint lift, whose
absolute angular separation is at least delta. Consequently every physical
route, including the other end or a winding route, has length at least
`k*delta + a*D + G(b)-G(Ri)`. The integral uses checked tangent norms and angle
enclosures. Only a sufficiently narrow gap between that independent global
lower bound and the contained feasible route permits success. A finite search
or a visually plausible path cannot authorize a brush by itself.

**Outer wall and supported outer/rim routes.** The accepted closed solver is
used explicitly as a relaxation. Every route that visits the inner wall pays
at least `(rhoA-Ri)+(rhoB-Ri)`. Every other physical route belongs to the closed
boundary. The minimum of that visit bound and the closed lower bound is thus
global. A side helix is physically valid on the outer wall, so its accepted
enclosure arithmetic is retained unchanged where the visit bound permits it.
For other successful routes, every reconstructed disk chord is checked to have
minimum radius at least Ri. The upper witness must meet the new global lower
bound within tolerance. An invalid chord or a competitive unresolved inner-wall
route causes an explicit unsupported result, never a shortcut through the void.

## Brush and gesture contract

Ordinary supported brush radius is strictly below
`min(0.24 * min(Ro-Ri,L), 0.2 * Ri)`. A footprint cannot meet two different
physical creases. Accepted local transitions are at most four radii, below a
complete rim thickness or axial length. Long unsupported jumps require
intermediate physical input and stop as an exact undoable prefix.

Projection onto the periodic meridian and the lower radial metric Ri supplies
conservative candidate windows. They are exclusions, not brush distances.
Candidates arrive in unique canonical-index order. The actual certified metric
then drives the existing cubic influence enclosure and finite-Float32 arithmetic.

`connected-brush.ts`, `connected-history.ts`, `connected-stroke.ts` and
`physical-path-spacing.ts` are incremental extractions of the accepted cylinder
implementation. Both providers call the same four-tool preparation, source
epochs, commit, carried spacing, ordered-input and whole-gesture history code.
Only canonical candidates, physical distance/path construction and local
finite-volume conductances come from geometry adapters. Closed wrappers retain
their public provider validation, worker interfaces and hard work/memory caps.

One necessary shared certification correction is explicit: the previous engine
required deciding the side of the brush radius even when the entire certified
influence interval was effectively zero. A 42/56/70 oblique triangle reproduces
the resulting precision failure on the accepted solid cylinder. Open Cylinder's
oblique gesture exposed the same issue. The shared core now accepts zero only
when the complete certified influence interval fits the existing absolute error
limit. The cubic polynomial, strength, radius, spacing and input scheduling are
unchanged. Boundary words, including signed zero, remain untouched; a genuinely
unresolved subprecision influence still fails atomically. The old test that
expected rejection at an exactly zero boundary now checks this bounded successful
result, and separate precision/budget/cancellation tests retain failure safety.

Annular control areas and conductances account for actual radial cell widths;
the accepted convex half-CFL Smooth arithmetic remains shared. No smoothing edge
crosses an empty end disk. No capacity increase, alternate painting engine or
unacknowledged terrain-owning worker is introduced.

## Numerical evidence and remaining work

The committed Decimal fixture independently evaluates 45 inner/rim cases and 48
fractional-dimension meridian cases at 85 digits, including large cancellation
and the supported dimensional ceiling. It uses its own trigonometric series,
Fermat bisection and exact dimensional sums. All production enclosures
contain those independent values. Regenerate and check it with:

```powershell
python scripts/check-open-cylinder-distance.py
node --test src/terrain/open-cylinder.test.ts src/terrain/open-cylinder-brush.test.ts src/terrain/open-cylinder-stroke.test.ts src/surfaces/open-cylinder-path.test.ts
npm.cmd test
npm.cmd run build
```

Tests also compare all four tools bit for bit with equivalent accepted ordinary
cylinder wall geography; check complete candidate coverage at creases and
periodic seams; traverse the complete meridian as one gesture; compare event
frequencies; and verify exact Undo/Redo after release, cancellation and failure.

This is a bounded certified query provider, not a claim that every possible far
pair on a toroidal boundary has an implemented global solver. Operational
presentation, ordinary browser responsiveness, strict persistence, reference-shell
connection protection, authoring and guided inspection remain delivery gates.

The [committed verification receipt](evidence/open-cylinder-foundation.json)
binds this milestone to its source fingerprint. The complete numerical suite
passed 1,312 tests, production build passed, matched solid/hollow pixel checks
passed 12 cases, existing cylinder browser workflows passed 18 desktop/mobile
cases, and all eight existing capped-cylinder sustained-painting cases passed
alone with their original thresholds. These browser checks verify the shared
extraction; they do not claim an Open Cylinder UI or its browser performance.
