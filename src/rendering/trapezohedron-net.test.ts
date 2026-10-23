import test from 'node:test';import assert from 'node:assert/strict';
import {createTrapezohedronGeometry} from '../surfaces/trapezohedron.ts';
import {trapezohedronNetPoint,trapezohedronNetRoutes,initialTrapezohedronView,projectTrapezohedron,unprojectTrapezohedron} from './trapezohedron-view.ts';
const g=createTrapezohedronGeometry({provider:'physical-pentagonal-trapezohedron',version:1,identity:{worldId:'net',surfaceId:'out'},role:'exterior',radiusMeters:1e6});
const triangle=(f:string)=>[[0,0],[1,0],[0,1]].map(([u,v])=>trapezohedronNetPoint(g,{...g.identity,patchId:f,u:u!,v:v!}));
test('Trapezohedron connected net keeps all ten whole kites, with 19 exact chart joins and no interior overlaps',()=>{
 const overlap=(a:readonly(readonly number[])[],b:readonly(readonly number[])[])=>{for(const p of[a,b])for(let i=0;i<3;i++){const q=p[i]!,r=p[(i+1)%3]!,axis=[r[1]!-q[1]!,q[0]!-r[0]!],project=(p:readonly(readonly number[])[])=>p.map(v=>v[0]!*axis[0]!+v[1]!*axis[1]!),x=project(a),y=project(b);if(Math.min(Math.max(...x),Math.max(...y))-Math.max(Math.min(...x),Math.min(...y))<1e-10)return false;}return true;};
 for(let i=0;i<20;i++)for(let j=0;j<i;j++)assert.equal(overlap(triangle(g.faces[i]!),triangle(g.faces[j]!)),false);
 const routes=trapezohedronNetRoutes(g);assert.equal(routes.length,20);const joins=new Set<string>();
 for(const path of routes)for(let i=1;i<path.length;i++){const a=path[i-1]!,b=path[i]!,common=g.vertexIds(a).filter(v=>g.vertexIds(b).includes(v));assert.equal(common.length,2);joins.add([a,b].sort().join(','));for(const v of common){const p=g.fromWeights(a,new Map([[v,1]]))!,q=g.fromWeights(b,new Map([[v,1]]))!,x=trapezohedronNetPoint(g,p),y=trapezohedronNetPoint(g,q);assert.ok(Math.hypot(x[0]-y[0],x[1]-y[1])<1e-11);}}
 assert.equal(joins.size,19);for(const face of g.physicalFaces)assert.ok(joins.has([`${face.id}:0`,`${face.id}:1`].sort().join(',')));
 for(const face of g.faces){const p={...g.identity,patchId:face,u:.25,v:.3},view=initialTrapezohedronView(g,'map'),size={width:1440,height:950},screen=projectTrapezohedron(g,p,view,size)!,q=unprojectTrapezohedron(g,view,size,screen)!;assert.equal(q.patchId,p.patchId);assert.ok(Math.abs(q.u-p.u)<1e-12&&Math.abs(q.v-p.v)<1e-12);}
});
