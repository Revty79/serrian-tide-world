import { CUBE_FACES, FACE_BASES, QUARTER_PI, dot3, unitDirection, type CubeFace, type Vec3 } from '../surfaces/cube-sphere.ts';
import type { SphericalTerrain,SphericalSampleKey } from './spherical.ts';

export interface CapRegion { readonly face: CubeFace; readonly left: number; readonly right: number; readonly top: number; readonly bottom: number }
export interface SphericalDirectionBounds {readonly x?:readonly[number,number];readonly y?:readonly[number,number];readonly z?:readonly[number,number]}
const ROUNDING_PAD = 128 * Number.EPSILON;
/** Conservative range of dot(point, axis) over an angular spherical cap. */
function componentBounds(component: number, cosine: number, sine: number): readonly [number, number] {
  const c = Math.max(-1, Math.min(1, component)), transverse = Math.sqrt(Math.max(0, 1 - c * c));
  return [Math.max(-1, (-c >= cosine ? -1 : c * cosine - transverse * sine) - ROUNDING_PAD), Math.min(1, (c >= cosine ? 1 : c * cosine + transverse * sine) + ROUNDING_PAD)];
}
/** Bounds only, never a footprint approximation. Exact reference-sphere distance is checked by the brush. */
export function sphericalCapCandidates(terrain: SphericalTerrain, center: Vec3, angularRadius: number,limits?:SphericalDirectionBounds) {
  if (!Number.isFinite(angularRadius) || angularRadius < 0 || angularRadius > Math.PI) throw new RangeError('Angular cap radius must be in [0,pi].');
  const direction = unitDirection(center), cosine = Math.cos(angularRadius), sine = Math.sin(angularRadius), cells = terrain.metadata.representation.cellsPerEdge;
  const regions: CapRegion[] = [];
  const clip=(axis:Vec3,range:readonly[number,number]):readonly[number,number]=>{if(!limits)return range;const i=axis.findIndex(v=>v!==0),bound=limits[(['x','y','z'] as const)[i]!];if(!bound)return range;if(!bound.every(Number.isFinite)||bound[0]>bound[1])throw RangeError('Invalid physical coordinate bounds.');const lo=axis[i]!>0?bound[0]:-bound[1],hi=axis[i]!>0?bound[1]:-bound[0];return[Math.max(range[0],lo-ROUNDING_PAD),Math.min(range[1],hi+ROUNDING_PAD)];};
  for (const face of CUBE_FACES) {
    const basis = FACE_BASES[face], normal = clip(basis.normal,componentBounds(dot3(direction, basis.normal), cosine, sine));
    const low = Math.max(1 / Math.sqrt(3) - ROUNDING_PAD, normal[0]), high = normal[1];
    if (high < low) continue;
    const indices = (axis: Vec3) => {
      const [minimum, maximum] = clip(axis,componentBounds(dot3(direction, axis), cosine, sine));if(minimum>maximum)return;
      const ratios = [minimum / low, minimum / high, maximum / low, maximum / high];
      const first = (Math.atan(Math.max(-1, Math.min(...ratios))) / QUARTER_PI + 1) * cells / 2;
      const last = (Math.atan(Math.min(1, Math.max(...ratios))) / QUARTER_PI + 1) * cells / 2;
      return [Math.max(0, Math.floor(first) - 1), Math.min(cells, Math.ceil(last) + 1)] as const;
    };
    const horizontal=indices(basis.u),vertical=indices(basis.v);if(!horizontal||!vertical)continue;const [left,right]=horizontal,[top,bottom]=vertical;
    if (right >= left && bottom >= top) regions.push({ face, left, right, top, bottom });
  }
  return {
    regions: regions as readonly CapRegion[],
    *samples(directionAt?:(key:SphericalSampleKey)=>Vec3) {
      for (const region of regions) for (let row = region.top; row <= region.bottom; row++) for (let column = region.left; column <= region.right; column++) {
        const address = { ...terrain.metadata.identity, patchId: region.face, column, row }, key = terrain.resolve(address);
        // A true cap sample lies in every incident chart's conservative rectangle.
        // Only its canonical owner emits it: constant auxiliary memory, no giant dedup Set.
        if ((row === 0 || row === cells || column === 0 || column === cells) && terrain.aliases(key)[0]!.patchId !== region.face) continue;
        yield { key, direction: directionAt?directionAt(key):terrain.geometry.direction(terrain.positionAt(address)) };
      }
    },
  };
}
