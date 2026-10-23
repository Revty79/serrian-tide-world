import {hollowTrapezohedronDimensions,type HollowTrapezohedronDimensions} from './hollow-trapezohedron.ts';
import {hollowOctahedronDimensions,type HollowOctahedronDimensions} from './hollow-octahedron.ts';
import {hollowTetrahedronDimensions,type HollowTetrahedronDimensions} from './hollow-tetrahedron.ts';
import { assertIdentity, type SurfaceIdentity, type SurfaceUnits } from './contracts.ts';
import {hollowCubeDimensions} from './hollow-cube.ts';
import {hollowCylinderDimensions} from './hollow-cylinder.ts';
import {openCylinderDimensions} from './open-cylinder.ts';
import {hollowPyramidDimensions,type HollowPyramidDimensions} from './hollow-pyramid.ts';

export interface VersionedProvider { readonly id: string; readonly version: number }
export type PlanarOutline = (
  | { readonly kind: 'rectangle'; readonly width: number; readonly height: number }
  | { readonly kind: 'circle'; readonly radius: number }
  | { readonly kind: 'triangle'; readonly vertices: readonly [readonly [number, number], readonly [number, number], readonly [number, number]] }
) & { readonly units: SurfaceUnits };
/** Shape descriptors do not imply an implemented terrain/topology/editor provider. */
export type WorldShape =
  | ({readonly kind:'hollow-trapezohedron'} & HollowTrapezohedronDimensions)
  | ({readonly kind:'hollow-octahedron'} & HollowOctahedronDimensions)
  | ({readonly kind:'hollow-tetrahedron'} & HollowTetrahedronDimensions)
  | ({readonly kind:'hollow-pyramid'} & HollowPyramidDimensions)
  | { readonly kind: 'flat'; readonly outline: PlanarOutline }
  | { readonly kind: 'sphere'; readonly radiusMeters: number }
  | { readonly kind: 'cylinder'; readonly radiusMeters: number; readonly lengthMeters: number }
  | { readonly kind: 'hollow-sphere'; readonly outerRadiusMeters: number; readonly innerRadiusMeters: number }
  | { readonly kind: 'hollow-cube'; readonly outerSideLengthMeters:number; readonly innerSideLengthMeters:number }
  | {readonly kind:'hollow-cylinder';readonly configuration:'capped';readonly outerRadiusMeters:number;readonly innerRadiusMeters:number;readonly outerLengthMeters:number;readonly innerLengthMeters:number}
  | {readonly kind:'open-cylinder';readonly configuration:'both-open';readonly outerRadiusMeters:number;readonly innerRadiusMeters:number;readonly lengthMeters:number}
  | { readonly kind: 'custom'; readonly geometry: VersionedProvider };
export type SurfaceRole = 'sheet' | 'exterior' | 'interior' | 'custom';
export interface SurfaceDefinition {
  readonly identity: SurfaceIdentity;
  readonly role: SurfaceRole;
  readonly terrainId: string;
  readonly topology: VersionedProvider;
  readonly representation: VersionedProvider;
}
export interface WorldDefinition {
  readonly id: string;
  readonly shape: WorldShape;
  readonly surfaces: readonly SurfaceDefinition[];
}

function provider(value: VersionedProvider): VersionedProvider {
  if (typeof value.id !== 'string' || !value.id.trim() || !Number.isSafeInteger(value.version) || value.version < 1) throw new RangeError('Invalid provider identity or version.');
  return Object.freeze({ id: value.id, version: value.version });
}
function positive(value: number) { if (!Number.isFinite(value) || value <= 0) throw new RangeError('Shape dimensions must be positive and finite.'); }
function shapeSnapshot(shape: WorldShape): WorldShape {
  switch (shape.kind) {
    case 'flat': {
      const outline = shape.outline;
      if (!['map-units', 'meters'].includes(outline.units)) throw new RangeError('Invalid outline units.');
      switch (outline.kind) {
        case 'rectangle': positive(outline.width); positive(outline.height); return Object.freeze({ kind: 'flat', outline: Object.freeze({ ...outline }) });
        case 'circle': positive(outline.radius); return Object.freeze({ kind: 'flat', outline: Object.freeze({ ...outline }) });
        case 'triangle': {
          if (outline.vertices.length !== 3 || !outline.vertices.every((point) => point.length === 2 && point.every(Number.isFinite))) throw new RangeError('Triangle requires three finite vertices.');
          const [a, b, c] = outline.vertices;
          const areaTwice = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
          if (!Number.isFinite(areaTwice) || areaTwice === 0) throw new RangeError('Triangle must be nondegenerate.');
          const vertices = Object.freeze([
            Object.freeze([a[0], a[1]] as const), Object.freeze([b[0], b[1]] as const), Object.freeze([c[0], c[1]] as const),
          ] as const);
          return Object.freeze({ kind: 'flat', outline: Object.freeze({ kind: 'triangle', units: outline.units, vertices }) });
        }
        default: throw new RangeError('Unsupported planar outline.');
      }
    }
    case 'sphere': positive(shape.radiusMeters); return Object.freeze({ ...shape });
    case 'cylinder': positive(shape.radiusMeters); positive(shape.lengthMeters); return Object.freeze({ ...shape });
    case 'hollow-sphere':
      positive(shape.outerRadiusMeters); positive(shape.innerRadiusMeters);
      if (shape.innerRadiusMeters >= shape.outerRadiusMeters) throw new RangeError('Interior reference radius must be smaller than exterior reference radius.');
      return Object.freeze({ ...shape });
    case 'hollow-cube': hollowCubeDimensions(shape); return Object.freeze({...shape});
    case 'hollow-trapezohedron': hollowTrapezohedronDimensions(shape); return Object.freeze({...shape});
    case 'hollow-octahedron': hollowOctahedronDimensions(shape); return Object.freeze({...shape});
    case 'hollow-tetrahedron': hollowTetrahedronDimensions(shape); return Object.freeze({...shape});
    case 'hollow-pyramid': hollowPyramidDimensions(shape); return Object.freeze({...shape});
    case 'hollow-cylinder': if(shape.configuration!=='capped')throw RangeError('Unsupported hollow cylinder closure.');hollowCylinderDimensions(shape);return Object.freeze({...shape});
    case 'open-cylinder': if(shape.configuration!=='both-open')throw RangeError('Only both-open cylinders are supported.');openCylinderDimensions(shape);return Object.freeze({...shape});
    case 'custom': return Object.freeze({ kind: 'custom', geometry: provider(shape.geometry) });
    default: throw new RangeError('Unsupported world shape.');
  }
}

/** Immutable identity/catalog foundation only. It does not instantiate unsupported providers. */
export function defineWorld(input: WorldDefinition): WorldDefinition {
  if (typeof input.id !== 'string' || !input.id.trim() || !input.surfaces.length) throw new RangeError('A world needs an identity and at least one surface.');
  const shape = shapeSnapshot(input.shape), ids = new Set<string>(), terrainIds = new Set<string>();
  const hollowRoles = new Set<SurfaceRole>();
  const surfaces = input.surfaces.map((surface): SurfaceDefinition => {
    assertIdentity(surface.identity);
    if (surface.identity.worldId !== input.id || ids.has(surface.identity.surfaceId)) throw new RangeError('Foreign or duplicate surface identity.');
    if (typeof surface.terrainId !== 'string' || !surface.terrainId.trim() || terrainIds.has(surface.terrainId)) throw new RangeError('Each surface needs an independent terrain identity.');
    if (!['sheet', 'exterior', 'interior', 'custom'].includes(surface.role)) throw new RangeError('Invalid surface role.');
    if (shape.kind === 'hollow-sphere'||shape.kind==='hollow-trapezohedron'||shape.kind==='hollow-cube'||shape.kind==='hollow-cylinder'||shape.kind==='hollow-pyramid'||shape.kind==='hollow-tetrahedron'||shape.kind==='hollow-octahedron') {
      if (!['exterior', 'interior'].includes(surface.role) || hollowRoles.has(surface.role)) throw new RangeError('A hollow World accepts unique interior/exterior surfaces.');
      hollowRoles.add(surface.role);
    }
    if(shape.kind==='open-cylinder'&&(input.surfaces.length!==1||surface.role!=='custom'))throw RangeError('An Open Cylinder has one connected material-boundary surface and authority.');
    ids.add(surface.identity.surfaceId); terrainIds.add(surface.terrainId);
    return Object.freeze({ identity: Object.freeze({ ...surface.identity }), role: surface.role, terrainId: surface.terrainId, topology: provider(surface.topology), representation: provider(surface.representation) });
  });
  if(shape.kind==='hollow-cube'&&hollowRoles.size!==2)throw RangeError('A hollow cube requires both independent surfaces.');
  if(shape.kind==='hollow-trapezohedron'&&hollowRoles.size!==2)throw RangeError('A hollow decahedron requires both independent surfaces.');
  if(shape.kind==='hollow-octahedron'&&hollowRoles.size!==2)throw RangeError('A hollow octahedron requires both independent surfaces.');
  if(shape.kind==='hollow-tetrahedron'&&hollowRoles.size!==2)throw RangeError('A hollow tetrahedron requires both independent surfaces.');
  if(shape.kind==='hollow-pyramid'&&hollowRoles.size!==2)throw RangeError('A hollow pyramid requires both independent surfaces.');
  if(shape.kind==='hollow-cylinder'&&hollowRoles.size!==2)throw RangeError('A capped hollow cylinder requires both independent surfaces.');
  return Object.freeze({ id: input.id, shape, surfaces: Object.freeze(surfaces) });
}
