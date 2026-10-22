import {cylinderCutView,cylinderCutHit,cylinderCutSurfaceHit,type CylinderExcavationDisplay} from './hollow-cylinder-display.ts';
import {rasterEdgeCoverage} from './raster-quality.ts';
import type { CylindricalTerrain } from '../terrain/cylindrical.ts';
import type { CylindricalBrushSettings } from '../terrain/cylindrical-brush.ts';
import { prepareCylindricalDab } from '../terrain/cylindrical-brush.ts';
import type { SurfacePosition } from '../surfaces/contracts.ts';
import { elevationToColor } from './elevation-colors.ts';
import { cylinderLayout, cylinderCenterInspection, cylinderInsideRayHit, cylinderMapHit, cylinderPositionVisible, cylinderRayHit, type CylinderRayHit, type CylinderView, type CylinderViewport } from './cylindrical-view.ts';
import { dot3 } from '../surfaces/cube-sphere.ts';
import { cylinderElevationSampler, cylinderElevationColor, cylinderRelief, type CylinderAppearance } from './cylindrical-elevation.ts';

export const CYLINDER_PREVIEW_DAB_LIMITS = Object.freeze({ maxCandidates: 8192, maxDistanceQueries: 4096, maxDistanceBoxes: 65536, maxPreparedBytes: 65536 });
export const MAX_CYLINDER_PREVIEW_SAMPLES = 65282;
export function cylinderPackedColor(elevation: number, seaLevel: number) { const c = elevationToColor(elevation, seaLevel); return (c[0] | c[1] << 8 | c[2] << 16 | 255 << 24) >>> 0; }
/** Derived palette colors only. No elevation snapshot, second authority or per-view terrain. */
export class CylinderDisplayCache {
  readonly terrain: CylindricalTerrain;
  private colors: Uint32Array;
  sourceRevision: number;
  constructor(terrain: CylindricalTerrain) {
    this.terrain = terrain;
    if (terrain.sampleCount > MAX_CYLINDER_PREVIEW_SAMPLES) throw new RangeError('Cylinder development preview supports at most 256/128/64. Numerical higher resolutions remain separate.');
    this.colors = new Uint32Array(terrain.sampleCount); this.sourceRevision = terrain.revision;
  }
  get byteLength() { return this.colors.byteLength; }
  *prepare() { const revision = this.terrain.revision; if (revision === 0) { this.colors.fill(cylinderPackedColor(this.terrain.read(this.terrain.keyAt(0)), this.terrain.metadata.seaLevel)); return; } for (const key of this.terrain.samples()) { if (this.terrain.revision !== revision) throw new Error('Cylinder changed during display preparation.'); this.colors[key.index] = cylinderPackedColor(this.terrain.read(key), this.terrain.metadata.seaLevel); if (key.index % 512 === 511) yield; } this.sourceRevision = revision; }
  snapshot() { return this.colors.slice(); }
  /** Coherent read-only elevation epoch; the terrain remains the only authority. */
  elevationSnapshot() {
    if (this.sourceRevision !== this.terrain.revision) throw new Error('Cylinder display epoch is not prepared.');
    return this.terrain.copyElevations();
  }
  /** Color data is staged before the numerical commit; this write loop allocates nothing. */
  apply(indices: Uint32Array, packed: Uint32Array, revision: number) { for (let i = 0; i < indices.length; i++) this.colors[indices[i]!] = packed[i]!; this.sourceRevision = revision; }
  refresh(indices: Iterable<number>) { for (const index of indices) this.colors[index] = cylinderPackedColor(this.terrain.read(this.terrain.keyAt(index)), this.terrain.metadata.seaLevel); this.sourceRevision = this.terrain.revision; }
  dispose() { this.colors = new Uint32Array(0); this.sourceRevision = -1; }
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
  const dx = size.width / columns / l.scale, dy = size.height / rows / l.scale;
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
  try { for (let i = 0; i < columns * rows; i++) {
    const x = ((i % columns + .5) * size.width / columns - l.x) / l.scale, y = (l.y - (Math.floor(i / columns) + .5) * size.height / rows) / l.scale;
    const center=sampleAt(x,y),hit=center?.hit,offset=i*4;if(labels)labels[i]=center?Math.floor(center.label/2):0;
    const insideBounds = view.mode === 'physical' ? Math.abs(x + tx) <= halfWidth + dx && Math.abs(y + ty) <= halfHeight + dy : Math.abs(x - view.pan.x) <= Math.PI + dx && Math.abs(y - view.pan.y) <= l.h + 2 + dy;
    const nearBoundary = center?.label!==6&&!cylinderCenterInspection(view)&&(hit ? hit.region === 'side' ? view.mode === 'physical' ? Math.abs(Math.cos(hit.theta) * view.frame.forward[0] + Math.sin(hit.theta) * view.frame.forward[1]) < .15 : Math.PI - Math.abs(x - view.pan.x) < dx || l.h - Math.abs(hit.z) < dy : 1 - hit.radial < 2 * Math.max(dx, dy) : insideBounds);
    const nearCoast = center && center.field.crossesSea;
    if (nearBoundary || nearCoast) {
      // Four actual subpixel rays cover the silhouette AND interpolated sea contour.
      // Coverage never enters inverse projection or numerical brush membership.
      let red=0,green=0,blue=0,covered=0,sameClass=true;
      for(const ox of[-.25,.25])for(const oy of[-.25,.25]){const sub=sampleAt(x+ox*dx,y+oy*dy);if(!sub){sameClass=false;continue;}const{c,shade}=sub;red+=c[0]*shade;green+=c[1]*shade;blue+=c[2]*shade;covered++;sameClass&&=sub.label===center?.label;}
      const uniformClass=!nearBoundary&&covered===4&&center&&sameClass;
      pixels[offset] = uniformClass ? center.c[0] * center.shade : covered ? red / covered : 0; pixels[offset + 1] = uniformClass ? center.c[1] * center.shade : covered ? green / covered : 0; pixels[offset + 2] = uniformClass ? center.c[2] * center.shade : covered ? blue / covered : 0; pixels[offset + 3] = covered / 4 * 255;
    } else if (!center) { pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = pixels[offset + 3] = 0; }
    else { const { c, shade } = center!; pixels[offset] = c[0] * shade; pixels[offset + 1] = c[1] * shade; pixels[offset + 2] = c[2] * shade; pixels[offset + 3] = 255; }
    if(i%(cut?256:2048)===(cut?255:2047))yield;
  }
  if(labels)yield* rasterEdgeCoverage(pixels,labels,columns,rows,(x,y,out)=>{const value=sampleAt((x*size.width/columns-l.x)/l.scale,(l.y-y*size.height/rows)/l.scale);if(!value){out.fill(0);return 0;}for(let k=0;k<3;k++)out[k]=Math.min(255,value.c[k]!*value.shade);out[3]=1;return Math.floor(value.label/2);});
  return { pixels, columns, rows, revision, snapshotBytes };
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
