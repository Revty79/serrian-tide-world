import {CUBE_FACES} from '../surfaces/cube-sphere.ts';
import type {SphericalElevationField,SphereFieldSnapshot} from './spherical-elevation.ts';
/** Reuse only a completed/cancelled Canvas job's private display snapshot.
 * The caller must have closed its old raster generator before updating these
 * arrays. Workers receive structured clones, never these live buffers. */
export function roundedFieldSnapshot(field:SphericalElevationField,previous?:SphereFieldSnapshot):SphereFieldSnapshot{
 if(!previous||previous.n!==field.n)return field.snapshot();if(previous.sourceRevision===field.sourceRevision)return previous;
 const regions=field.regionsSince(previous.sourceRevision),side=field.n+1;
 if(!regions)for(const f of CUBE_FACES)previous.data[f].set(field.data[f]);
 else for(const r of regions)for(let row=r.top;row<=r.bottom;row++){const start=(row*side+r.left)*4,end=(row*side+r.right+1)*4;previous.data[r.face].set(field.data[r.face].subarray(start,end),start);}
 return{n:field.n,data:previous.data,sourceRevision:field.sourceRevision,heightScale:field.heightScale};
}
