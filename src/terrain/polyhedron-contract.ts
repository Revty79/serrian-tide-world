import type {IndexedTerrain} from './indexed-float32.ts';
import type {SurfaceIdentity,SurfacePosition} from '../surfaces/contracts.ts';
import type {PolyhedronGeometry,PolyhedronVector} from '../surfaces/polyhedron-contract.ts';
export interface PolyhedronAddress extends SurfaceIdentity{readonly patchId:string;readonly row:number;readonly column:number}
export interface PolyhedronTerrain extends IndexedTerrain<{readonly index:number}>{
 readonly geometry:PolyhedronGeometry;readonly subdivisions:number;readonly sampleCount:number;
 readonly metadata:{readonly identity:SurfaceIdentity};readonly minElevation:number;readonly maxElevation:number;
 resolve(p:PolyhedronAddress):ReturnType<this['keyAt']>;owner(key:ReturnType<this['keyAt']>):PolyhedronAddress;
 positionAt(p:PolyhedronAddress):SurfacePosition;aliases(key:ReturnType<this['keyAt']>):PolyhedronAddress[];
 neighbors(key:ReturnType<this['keyAt']>):ReturnType<this['keyAt']>[];
 referencePositionAt(key:ReturnType<this['keyAt']>):PolyhedronVector;
}
