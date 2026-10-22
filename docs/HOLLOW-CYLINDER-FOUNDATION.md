# Capped Hollow Cylinder: numerical foundation

This checkpoint adds two independent accepted cylindrical terrain banks under
one immutable, coaxial parent World. It does not yet add a selectable hollow
cylinder editor, its viewing controls, local Save/Open or basic connections.
Those remain the next authorized work, followed by the safe open configuration.

## Geometry and authority

The parent has outer/inner radii and outer/inner axial lengths. Both are closed,
centered at the same origin, and share the representation Z axis. The accepted
closed-cylinder kernel retains its original axial coordinates `[0,L]`; the parent
adapter translates each kernel by `-L/2`. These coordinates define neither gravity
nor geographic north.

The inner adapter reflects U, giving inward physical normals and right-handed
side/cap charts. It conjugates the accepted rim-fold transport. Each bank uses
its own radius and length, periodic wall, two disk caps and shared canonical rim
samples. Inner sample addresses reflect integer columns, including odd angular
counts, rather than recovering ownership through floating point projection.
Intrinsic same-region/global distances remain the accepted cylinder kernel's
physical reference-surface results, including cap shortcuts and precision/work
limits. No box or spherical metric substitutes for cylindrical distance.

Both banks start at exactly 0 m and have distinct surface and terrain identities.
The accepted four-tool stroke, worker preparation, sparse history and display
cache remain in use. Generic terrain construction now accepts an initial height
and synchronous host height/sample policies. It validates direct writes and the
complete prepared patch before any write. Existing cylindrical history already
commits before moving its cursor; protected or out-of-range replay is atomic.
Policies are captured at construction, while the parent's support callback can
be replaced by its host when physical connections are added.

The display cache's revision-zero shortcut reads the actual initial height.
Legacy cylinders still initialize and display at -100 m.

## Supported initial envelope

- Each radius and length: 1?1,000,000,000 m.
- Each bank's length/radius ratio: 0.1?20.
- Inner radius and length strictly smaller than the outer values.
- Radial thickness: at least `max(0.001 m, outerRadius * 1e-9)`.
- Each end thickness: at least `max(0.001 m, outerLength * 1e-9)`.
- Shared accepted sample resolution; normal host detail remains 64/128/256.
- Both minimum heights: `-min(radialThickness,endThickness)/4`.
- Inside maximum: `min(innerRadius/2,innerLength/4)`.
- Outside maximum: `min(outerRadius,outerLength)`.

Bounds reject rather than clamp. They preserve a conservative reference shell and
cavity; complete displaced material/collision reconstruction remains deferred.
Open ends cannot be encoded by setting equal inner/outer lengths or hiding cap
pixels. Open walls and annular rims need their own topology/metric assessment.

## Existing cylinder lifecycle correction

The strengthened legacy detail tests exposed a disposal race: the host retired a
session before React unmounted its viewport, allowing a queued old Canvas frame
to request the disposed cache. A read-only `closed` lifecycle property now stops
that old frame. The cache's source-revision check remains unchanged. The same
signed-zero reopen case failed before the guard and passed after it. Repeated
Canvas replacement/reopen loops and all three legacy details now assert no page
errors and exact saved geography.

## Verification and next work

The compact [foundation receipt](evidence/hollow-cylinder-foundation.json) records
the numerical suite, typecheck/build, final 12 desktop/mobile compatibility cases,
and the failing/passing lifecycle evidence. Numerical checks cover every sample
at odd/even angular counts, both caps, centers, periodic aliases, rim joins,
physical normals/tangents, both metric scales, all four tools on both banks,
exact Undo/Redo, worker/host policy rejection, and immutable input snapshots.

A diagnostic test briefly wrote two historical evidence paths from the repository
root. Both files were restored byte-for-byte from the prior Git checkpoint; the
new diagnostic output is preserved separately. Final legacy campaigns run from
an isolated working directory. Historical receipts and screenshots are unchanged.

The next checkpoint integrates the capped hollow parent into the existing Atlas
host with fitted inside editing, explicit read-only cavity inspection, editable
Surface map and strict two-bank persistence. Basic direct holes, physical passage
graphs/guided travel and reciprocal map links follow before the open configuration.
Owner/Ember hands-on acceptance remains separate from technical verification.
