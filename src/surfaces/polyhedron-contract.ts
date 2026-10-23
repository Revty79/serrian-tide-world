import type {SurfaceIdentity,SurfacePosition} from './contracts.ts';
import type {Interval,IntervalPoint} from './pyramid-interval.ts';
export type PolyhedronVector=readonly[number,number,number];
export type PolyhedronPoint=readonly[number,number];
export type PolyhedronPhysicalBounds=readonly[Interval,Interval,Interval];
/** Do not expose mutable interval arrays that could invalidate a certificate. */
export function freezePolyhedronArrays<T>(value:T):T{if(Array.isArray(value)){for(const item of value)freezePolyhedronArrays(item);Object.freeze(value);}return value;}
export interface PolyhedronFrame {
 readonly origin:PolyhedronVector;readonly u:PolyhedronVector;readonly v:PolyhedronVector;
 readonly normal:PolyhedronVector;readonly e1:PolyhedronVector;readonly e2:PolyhedronVector;
 readonly chartVertices:readonly PolyhedronPoint[];
}
/** Geometry-only contract for the accepted convex planar-face mechanisms.
 * Interval coordinates describe the physical model, not rounded render pixels.
 * The authority, brush executor, history and workspace remain separate. */
export interface PolyhedronGeometry {
 readonly metadata:Readonly<{identity:SurfaceIdentity;role:'exterior'|'interior'}>;
 readonly identity:SurfaceIdentity;readonly faces:readonly string[];
 readonly edges:readonly(readonly[number,number])[];readonly vertices:readonly PolyhedronVector[];
 /** Optional polygon atlas provenance. `faces`/`edges` are numerical charts;
  * these retain the physical topology when a polygon has internal diagonals. */
 readonly physicalFaces?:readonly{readonly id:string;readonly vertices:readonly number[]}[];
 readonly physicalEdges?:readonly(readonly[number,number])[];
 physicalFaceId?(chart:string):string;
 /** Convex physical polygons may be visited only once by a shortest route:
  * replace any departure/reentry by the straight segment inside that polygon.
  * Numerical chart transitions within the same polygon remain unrestricted. */
 readonly simplePhysicalFaceRoutes?:true;
 readonly scaleMeters:number;readonly surfaceAreaMeters2:number;
 readonly minimumDimensionMeters:number;readonly maximumLatticeEdgeMeters:number;
 readonly centerMeters:PolyhedronVector;readonly inspectionEyeMeters:PolyhedronVector;
 frame(face:string):PolyhedronFrame;vertexIds(face:string):readonly number[];isTriangle(face:string):boolean;
 chartVertexBounds(face:string):readonly IntervalPoint[];physicalVertexBounds(index:number):PolyhedronPhysicalBounds;
 normalize(p:SurfacePosition):SurfacePosition;weights(p:SurfacePosition):readonly number[];
 aliases(p:SurfacePosition):SurfacePosition[];canonicalPosition(p:SurfacePosition):SurfacePosition;
 fromWeights(face:string,weights:ReadonlyMap<number,number>):SurfacePosition|undefined;
 referencePosition(p:SurfacePosition):PolyhedronVector;chartPoint(p:SurfacePosition):PolyhedronPoint;
 normal(p:SurfacePosition):PolyhedronVector;
}
