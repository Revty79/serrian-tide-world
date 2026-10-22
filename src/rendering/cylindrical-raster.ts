import {PHYSICAL_PREVIEW_DAB_LIMITS} from '../editor/physical-brush-policy.ts';
import {IndexedDisplayCache,terrainPackedColor} from './indexed-display-cache.ts';
import {cylinderCutView,cylinderCutHit,cylinderCutSurfaceHit,type CylinderExcavationDisplay} from './hollow-cylinder-display.ts';
import {coherentTerrainRasterSteps} from './coherent-terrain-raster.ts';
import type { CylindricalTerrain } from '../terrain/cylindrical.ts';
import type { CylindricalBrushSettings } from '../terrain/cylindrical-brush.ts';
import { prepareCylindricalDab } from '../terrain/cylindrical-brush.ts';
import type { SurfacePosition } from '../surfaces/contracts.ts';
import { cylinderLayout, cylinderCenterInspection, cylinderInsideRayHit, cylinderMapHit, cylinderPositionVisible, cylinderRayHit, type CylinderRayHit, type CylinderView, type CylinderViewport } from './cylindrical-view.ts';
import { dot3 } from '../surfaces/cube-sphere.ts';
import { cylinderElevationSampler, cylinderElevationColor, cylinderRelief, type CylinderAppearance } from './cylindrical-elevation.ts';

export const CYLINDER_PREVIEW_DAB_LIMITS = PHYSICAL_PREVIEW_DAB_LIMITS;
export const MAX_CYLINDER_PREVIEW_SAMPLES = 65282;
export const cylinderPackedColor=terrainPackedColor;
/** Accepted closed capacity over the common coherent display epoch. */
export class CylinderDisplayCache extends IndexedDisplayCache<CylindricalTerrain>{
  constructor(terrain:CylindricalTerrain){super(terrain,MAX_CYLINDER_PREVIEW_SAMPLES,'Cylinder development preview supports at most 256/128/64. Numerical higher resolutions remain separate.');}
}
/** Palette interpolation is display-only. Caps retain their real disk/center/rim samples. */
export function cylinderInterpolatedColor(colors: Uint32Array, terrain: CylindricalTerrain, hit: CylinderRayHit): number {
  const { angularSamples: a, axialCells: z, radialCells: p } = terrain.metadata.representation.resolution, h = terrain.metadata.geometry.lengthMeters / terrain.metadata.geometry.radiusMeters / 2;
  const wrap = (c: number) => (c % a + a) % a, end = hit.region === 'cap-end';
  const column = wrap((end ? -hit.theta : hit.theta) / (2 * Math.PI) * a), left = Math.floor(column), fx = column - left;
  const row = Math.max(0, Math.min(hit.region === 'side' ? z : p, hit.region === 'side' ? (hit.z + h) / (2 * h) * z : hit.radial * p)), top = Math.floor(row), fy = row - top;
  const index = (r: number, c: number) => {
    c = wrap(c);
    if (hit.region === 'side') return Math.min(z, r) * a + c;
    if (r >= p) return (end ? z * a : 0) + (end ? wrap(-c) : c);
    return a * (z + 1) + (end ? 1 + a * (p - 1) : 0) + (r === 0 ? 0 : 1 + (r - 1) * a + c);
  };
  const q = [colors[index(top, left)]!, colors[index(top, left + 1)]!, colors[index(top + 1, left)]!, colors[index(top + 1, left + 1)]!];
  let color = 255 << 24;
  for (const shift of [0, 8, 16]) color |= Math.round((((q[0]! >>> shift & 255) * (1 - fx) + (q[1]! >>> shift & 255) * fx) * (1 - fy) + ((q[2]! >>> shift & 255) * (1 - fx) + (q[3]! >>> shift & 255) * fx) * fy)) << shift;
  return color >>> 0;
}
export interface CylinderRaster { readonly pixels: Uint8ClampedArray; readonly columns: number; readonly rows: number; readonly revision: number; readonly snapshotBytes: number }
/** One coherent color epoch. Each next() covers at most 2,048 pixels / 10,240 subpixel rays. */
export function* cylinderRasterSteps(cache: CylinderDisplayCache, view: CylinderView, size: CylinderViewport, pixelBudget: number, reusable?: Uint8ClampedArray, appearance: CylinderAppearance = 'elevation',excavation?:CylinderExcavationDisplay): Generator<void, CylinderRaster> {
  if (!Number.isInteger(pixelBudget) || pixelBudget < 1 || pixelBudget > 1500000) throw new RangeError('Cylinder raster budget exceeded.');
  const cut=cylinderCutView(view,excavation)?excavation:undefined;
  const l = cylinderLayout(cache.terrain.geometry, view, size), factor = Math.min(1.5, Math.sqrt(pixelBudget / (size.width * size.height))), columns = Math.max(1, Math.floor(size.width * factor)), rows = Math.max(1, Math.floor(size.height * factor));
  const pixels = reusable?.length === columns * rows * 4 ? reusable : new Uint8ClampedArray(columns * rows * 4), revision = cache.sourceRevision;
  let elevations = cache.elevationSnapshot();
  const fieldAt = cylinderElevationSampler(elevations, cache.terrain, appearance === 'relief' ? 'land' : 'none');
  const opposite=cut?.opposite.elevationSnapshot(),oppositeField=cut&&opposite?cylinderElevationSampler(opposite,cut.opposite.terrain,appearance==='relief'?'land':'none'):undefined,labels=cut?new Uint8Array(columns*rows):undefined;
  const snapshotBytes=elevations.byteLength+(opposite?.byteLength??0)+(labels?.byteLength??0);
  const tx = dot3(view.target, view.frame.right), ty = dot3(view.target, view.frame.up);
  const halfWidth = Math.hypot(view.frame.right[0], view.frame.right[1]) + l.h * Math.abs(view.frame.right[2]), halfHeight = Math.hypot(view.frame.up[0], view.frame.up[1]) + l.h * Math.abs(view.frame.up[2]);
  const hitAt = (x: number, y: number) => cylinderCenterInspection(view)?cylinderInsideRayHit(x,y,view.frame,l.h,view.eyeMeters?.map(v=>v/cache.terrain.metadata.geometry.radiusMeters)as unknown as readonly[number,number,number]):view.mode === 'physical' ? cylinderRayHit(x + tx, y + ty, view.frame, l.h) : cylinderMapHit(x - view.pan.x, y - view.pan.y, l.h, view.phase);
  const displayColor = (hit: CylinderRayHit,source=cache,sample=fieldAt,normalFacing?:number,inside=false) => {
    const field = sample(hit),sea=source.terrain.metadata.seaLevel;
    const c = cylinderElevationColor(field.height, sea);
    const facing = normalFacing??(hit.region === 'side' ? Math.cos(hit.theta) * view.frame.forward[0] + Math.sin(hit.theta) * view.frame.forward[1] : (hit.region === 'cap-end' ? 1 : -1) * view.frame.forward[2]);
    const shade = (view.mode === 'map'||cylinderCenterInspection(view) ? 1 : .74 + .26 * Math.max(0, facing)) * (appearance === 'relief' && field.height > sea ? cylinderRelief(field.dx, field.dy) : 1);
    return { c, shade, field, facing,hit,label:(inside?4:2)+(field.height>sea?1:0) };
  };
  // Excavation supplies intersections and physical normals. Terrain then uses
  // this same accepted sampler, palette, relief and coastline coverage pass.
  const sampleAt=(x:number,y:number)=>{
    if(!cut){const hit=hitAt(x,y);return hit?displayColor(hit):undefined;}
    const hit=cylinderCutHit(cut,view,size,{x:l.x+x*l.scale,y:l.y-y*l.scale},cache);if(!hit)return;
    if(hit.kind==='rock')return{c:[164,145,114]as const,shade:Math.max(.28,Math.min(1.1,.64+.36*dot3(hit.normal,[-.38,-.48,.78]))),field:{height:0,dx:0,dy:0,crossesSea:false},facing:1,hit:undefined,label:6};
    const own=hit.kind===cut.role,source=own?cache:cut.opposite;
    return displayColor(cylinderCutSurfaceHit(hit,cut,source),source,own?fieldAt:oppositeField!,dot3(hit.normal,view.frame.forward),hit.kind==='interior');
  };
  try { return yield* coherentTerrainRasterSteps<CylinderRayHit>({pixels,columns,rows,revision,snapshotBytes,size,grid:l,labels,quantum:cut?256:2048,sampleAt,
    nearBoundary:(center,x,y,dx,dy)=>{
      const hit=center?.hit,insideBounds=view.mode==='physical'?Math.abs(x+tx)<=halfWidth+dx&&Math.abs(y+ty)<=halfHeight+dy:Math.abs(x-view.pan.x)<=Math.PI+dx&&Math.abs(y-view.pan.y)<=l.h+2+dy;
      return center?.label!==6&&!cylinderCenterInspection(view)&&(hit?hit.region==='side'?view.mode==='physical'?Math.abs(Math.cos(hit.theta)*view.frame.forward[0]+Math.sin(hit.theta)*view.frame.forward[1])<.15:Math.PI-Math.abs(x-view.pan.x)<dx||l.h-Math.abs(hit.z)<dy:1-hit.radial<2*Math.max(dx,dy):insideBounds);
    },
  });
  } finally { elevations = new Float32Array(0); }
}
export function cylinderVisibilityGuard(terrain: CylindricalTerrain, view: CylinderView) {
  return (center: SurfacePosition, indices: Iterable<number>) => {
    if (view.mode !== 'physical') return;
    if (!cylinderPositionVisible(terrain.geometry, center, view.frame)) throw new Error('Cylinder stroke reached an occluded center. Rotate the surface or use Surface map.');
    for (const index of indices) if (!cylinderPositionVisible(terrain.geometry, terrain.positionAt(terrain.owner(terrain.keyAt(index))), view.frame)) throw new Error('Brush reaches hidden cylinder samples. Reduce radius, rotate, or use Surface map; the pending dab was not applied.');
  };
}
export interface CylinderStencil { readonly center: SurfacePosition; readonly indices: Uint32Array; readonly revision: number; readonly settings: CylindricalBrushSettings; readonly affectedSamples: number }
/** A real dry B2A preparation: stencil means exact canonical word changes, including Smooth no-ops. */
export function prepareCylinderStencil(terrain: CylindricalTerrain, center: SurfacePosition, settings: CylindricalBrushSettings, view: CylinderView) {
  const job = prepareCylindricalDab(terrain, center, settings, CYLINDER_PREVIEW_DAB_LIMITS), guard = cylinderVisibilityGuard(terrain, view);
  return {
    job,
    finish(): CylinderStencil {
      const changes = [...job.preparedChanges(terrain)], indices = Uint32Array.from(changes, c => c.index);
      guard(job.center, indices);
      const result = { center: job.center, indices, revision: job.sourceRevision, settings: job.settings, affectedSamples: job.statistics.affectedSamples }; job.cancel(); return result;
    },
  };
}
