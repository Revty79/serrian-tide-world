# Hollow-world development: authorized sequence and reuse inventory

Owner authorization, 2026-10-21: Hollow Sphere → capped Hollow Cylinder → Open
Cylinder. Cube-I is technically stable at `6d4b129`; owner acceptance remains
pending. Each verified milestone is committed and pushed to standalone `main`.
No website, database, Docker, Production, pyramids, excavation, collision or full
displaced-terrain implementation belongs to this assignment.

## Pass 1: architecture inspected before implementation

| Existing system | Reuse | Geometry-specific addition |
| --- | --- | --- |
| `surfaces/cube-sphere.ts`, `terrain/spherical.ts` | Equiangular spherical directions, true great-circle metric, canonical face/edge/corner ownership, poles, neighbor connectivity | Two radii and identities under one parent; inward orientation and safe radial height envelope |
| `spherical-brush.ts`, `SphericalSession`, `SphericalHistory`, spherical workers | Four tools, geodesic spacing, complete gesture history, cooperative/worker preparation, source leases, display epochs | Optional prepublication height validator; no new brush arithmetic or worker manager |
| `SphericalViewport`, spherical view/field/WebGL/Canvas | Navigation, Net joins, direct input, palette and elevation interpolation, graphics recovery | Perspective inspection from the cavity center, inward relief, shared brush choices and role selection |
| `surfaces/cylinder.ts`, cylinder distance/path/brush/session | Periodic wall, polar caps, rim aliases, global routes, exact history and worker lifecycle | Nested closed cylinders; inner normal/orientation and dimensions. Open rims need a separate topology assessment |
| `HollowCubeEditor` and parent document | One parent identity, two independent authorities/sessions, side switch after draining, one Atlas chrome | A spherical/cylindrical parent adapter; cube CSG and cube numerical brushes are not reused for round worlds |
| `App`, `NewWorldDialog`, `LocalMapStore` | One workspace, atomic candidate replacement, guarded Save/Open, unchanged browser-local catalog | New shape choices and strictly versioned parent records, preserving v1–v7 |

The accepted sphere display is reference-surface rendering with elevation colors
and gradient relief. Cavity inspection must have its own physical projection;
reversing a texture is insufficient. Full displaced topography remains deferred.
The existing cylinder representation is a closed surface with two disk caps;
removing cap pixels cannot implement open annular ends. Assess that topology only
after the preceding capped hollow editor is stable.

## Delivery progress

- Pass 1 inventory complete.
- Pass 2 hollow-sphere numerical foundation verified: two independent accepted
  canonical spherical banks, opposite physical normals, inward chart adapter,
  radius-specific geodesics and conservative radial elevation bounds.
- Interactive and cylindrical checkpoints are not yet delivered.

Foundation validation: **1,219 numerical tests**, typecheck/build and **28 existing
sphere browser cases** (24 initial passes plus four matching fresh-server passes).
The four initial failures reproduced only on the long-running HMR server: its
fixture HTML referenced a timestamped entry while tests dynamically imported the
same fixture without a timestamp, recreating its World. The unchanged Cube-I
baseline and fresh current server both passed all four cases. No assertions or
editor behavior were weakened to address this environment issue. Future browser
milestones use a fresh owned server. Historical evidence remains untouched.

The small shared numerical extension accepts an optional host elevation policy.
Both cooperative and worker paths validate the entire prepared dab against that
policy before the first authoritative write. Ordinary sphere metadata, samples,
brush mathematics, worker ownership and saved interpretations are unchanged.
Supported new shell dimensions: 1 m ≤ inner radius < outer radius ≤ 10¹² m;
thickness ≥ max(0.001 m, outer radius × 10⁻⁹). Lowering is limited to one quarter
of shell thickness per side, inner positive heights to half the inner radius and
outer positive heights to the outer radius. These are reserved radial envelopes,
not full displaced collision or excavation certificates. Banks begin at 0 m.

No owner acceptance is inferred. Final hands-on instructions and exact validation
receipts will be added at verified milestones. Stop expanding if an architectural
blocker cannot be handled by small compatible adapters.
