import type {SurfacePosition} from './contracts.ts';
import type {DumbbellGeometry} from './dumbbell.ts';
import {dumbbellWindows} from './dumbbell-windows.ts';
import {polyhedronUnfoldings,reconstructPolyhedronPath} from './polyhedron-path.ts';
import {polyhedronPhysicalLength,polyhedronPositionBounds} from './polyhedron-physical-bounds.ts';
import {pyramidSub,pyramidUnit} from './pyramid.ts';
import type {ConnectedPathOptions,ConnectedPhysicalPath} from '../terrain/connected-stroke.ts';
import * as I from './pyramid-interval.ts';
/** Actual boundary curves for pointer interpolation. Influence independently
 * uses certified intrinsic distances. An exactly witnessed unfolded segment is
 * preferred. At an ambiguous vertex, real face/edge segments provide bounded
 * continuity; no chord through material is used as a fallback. */
export function dumbbellPointerPath(g:DumbbellGeometry,first:SurfacePosition,last:SurfacePosition,o:ConnectedPathOptions):ConnectedPhysicalPath{
 const a=g.canonicalPosition(first),b=g.canonicalPosition(last),chord=Math.hypot(...pyramidSub(g.referencePosition(b),g.referencePosition(a)));
 if(o.version!==1)throw RangeError('Unsupported Dumbbell pointer path version.');
 let routes:ReturnType<typeof polyhedronUnfoldings>|undefined;
 if(g.physicalFaceId(a.patchId)===g.physicalFaceId(b.patchId))routes=polyhedronUnfoldings(g,a.patchId,b.patchId,g.faces.filter(f=>g.physicalFaceId(f)===g.physicalFaceId(a.patchId)));
 else{const w=dumbbellWindows(g,a,Math.min(g.minimumDimensionMeters*.49,Math.max(g.scaleMeters*1e-8,chord*2)));routes=w.byFace.get(b.patchId);}
 if(routes?.length){try{return reconstructPolyhedronPath(g,a,b,o,routes);}catch(error){if(!(error instanceof RangeError))throw error;}
  for(const route of routes)try{return reconstructPolyhedronPath(g,a,b,o,[route]);}catch(error){if(!(error instanceof RangeError))throw error;}
 }
 const source=polyhedronPositionBounds(g,a),target=polyhedronPositionBounds(g,b),d=Array<number>(g.vertices.length).fill(Infinity),prior=Array<number>(g.vertices.length).fill(-1),seen=new Set<number>();
 for(const i of g.vertexIds(a.patchId))d[i]=polyhedronPhysicalLength(source,g.physicalVertexBounds(i))[1];
 for(let k=0;k<g.vertices.length;k++){let at=-1;for(let i=0;i<d.length;i++)if(!seen.has(i)&&(at<0||d[i]!<d[at]!))at=i;if(at<0)break;seen.add(at);for(const edge of g.edges){const other=edge[0]===at?edge[1]:edge[1]===at?edge[0]:-1;if(other<0)continue;const v=I.adjacentFloat(d[at]!+polyhedronPhysicalLength(g.physicalVertexBounds(at),g.physicalVertexBounds(other))[1],true);if(v<d[other]!){d[other]=v;prior[other]=at;}}}
 const endVertex=g.vertexIds(b.patchId).reduce((i,j)=>d[i]!+polyhedronPhysicalLength(g.physicalVertexBounds(i),target)[1]<=d[j]!+polyhedronPhysicalLength(g.physicalVertexBounds(j),target)[1]?i:j),ids=[endVertex];while(prior[ids[0]!]!==-1)ids.unshift(prior[ids[0]!]!);
 const segments:{start:SurfacePosition;end:SurfacePosition}[]=[],vertex=(face:string,i:number)=>g.fromWeights(face,new Map([[i,1]]))!;
 segments.push({start:a,end:vertex(a.patchId,ids[0]!)});for(let i=1;i<ids.length;i++){const face=g.faces.find(f=>g.vertexIds(f).includes(ids[i-1]!)&&g.vertexIds(f).includes(ids[i]!))!;segments.push({start:vertex(face,ids[i-1]!),end:vertex(face,ids[i]!)});}segments.push({start:vertex(b.patchId,ids.at(-1)!),end:b});
 const pieces=segments.map(s=>{const delta=pyramidSub(g.referencePosition(s.end),g.referencePosition(s.start)),length=Math.hypot(...delta),bounds=polyhedronPhysicalLength(polyhedronPositionBounds(g,s.start),polyhedronPositionBounds(g,s.end));return{...s,length,bounds,tangent:length?pyramidUnit(delta):null};}).filter(s=>s.length>0),length=pieces.reduce((s,p)=>s+p.length,0),bounds=pieces.reduce((s,p)=>I.add(s,p.bounds),I.exact(0));
 return{end:b,pieces,lengthMeters:length,lengthUpperBoundMeters:Math.max(length,bounds[1]),lengthErrorBoundMeters:Math.max(length-bounds[0],bounds[1]-length),distance:{evaluatedBoxes:0},atDistance(meters:number){if(!Number.isFinite(meters)||meters<0||meters>length)throw RangeError('Dumbbell pointer address outside its physical curve.');let offset=0,i=0;for(;i<pieces.length-1;i++){if(meters<=offset+pieces[i]!.length)break;offset+=pieces[i]!.length;}const p=pieces[i];if(!p)return{position:b,referencePosition:g.referencePosition(b),tangent:null,pieceIndex:0,distanceMeters:meters,atEnd:true,oneSidedPatchId:b.patchId};const t=Math.max(0,Math.min(1,(meters-offset)/p.length)),u=p.start.u+(p.end.u-p.start.u)*t;let v=p.start.v+(p.end.v-p.start.v)*t;if(p.start.u+p.start.v===1&&p.end.u+p.end.v===1)v=1-u;const q=meters===0?a:meters===length?b:g.normalize({...p.start,u,v});return{position:q,referencePosition:g.referencePosition(q),tangent:p.tangent,pieceIndex:i,distanceMeters:meters,atEnd:meters===length,oneSidedPatchId:q.patchId};}};
}
