import {test} from 'node:test';import assert from 'node:assert/strict';
import {createOctahedronGeometry} from './octahedron.ts';
import {polyhedronDistance,polyhedronDistanceReference,reconstructPolyhedronPath} from './polyhedron-path.ts';
import {polyhedronLocalDomain} from './polyhedron-local-domain.ts';
import {segmentPointDistance} from './passages.ts';
import {trianglePortalEndpoint} from './polyhedron-distance-prepared.ts';
const identity={worldId:'local-proof',surfaceId:'outside'},config={provider:'physical-regular-octahedron' as const,version:1 as const,identity,role:'exterior' as const,edgeLengthMeters:1e6},point=(patchId:string,u:number,v:number)=>({...identity,patchId,u,v});
test('triangle portal endpoint proof requires exact membership and handles initial edge/vertex dabs without grazing fallback',()=>{
 const g=createOctahedronGeometry(config),ids=g.vertexIds('ppp');assert.equal(trianglePortalEndpoint(g,point('ppp',0,.06),[ids[0]!,ids[2]!]),true);assert.equal(trianglePortalEndpoint(g,point('ppp',.25,.75),[ids[1]!,ids[2]!]),true);assert.equal(.1+.9,1);assert.equal(trianglePortalEndpoint(g,point('ppp',.1,.9),[ids[1]!,ids[2]!]),false);
 for(const a of[point('ppp',0,.06),point('ppp',.06,0),point('ppp',0,0)])for(const face of['pnn','ppn','pnp'])for(const[u,v]of[[.02,.04],[0,.04],[.04,0]]){const b=point(face,u!,v!),d=polyhedronDistance(g,a,b),r=polyhedronDistanceReference(g,a,b);assert.ok(d.lowerBoundMeters<=r.upperBoundMeters&&r.lowerBoundMeters<=d.upperBoundMeters);if(!g.aliases(a).some(x=>g.aliases(b).some(y=>y.patchId===x.patchId)))assert.ok('certifiedDomainFaces'in d);}
});
test('four-face domain excludes only routes longer than its interval-certified boundary escape',()=>{
 const g=createOctahedronGeometry(config),a=point('ppp',.04,.02),b=point('pnn',.02,.04),domain=polyhedronLocalDomain(g,a)!;
 assert.equal(domain.faces.length,4);assert.ok(domain.faces.every(f=>g.vertexIds(f).includes(0)));
 const boundary=g.edges.filter(e=>g.faces.filter(f=>domain.faces.includes(f)&&e.every(i=>g.vertexIds(f).includes(i))).length===1),p=g.referencePosition(a);
 const independent=Math.min(...boundary.map(e=>segmentPointDistance(p,g.vertices[e[0]]!,g.vertices[e[1]]!)));
 assert.ok(domain.escapeLowerBoundMeters<=independent+1e-8);assert.ok(domain.escapeLowerBoundMeters>1e5);
 const d=polyhedronDistance(g,a,b),r=polyhedronDistanceReference(g,a,b);assert.equal('certifiedDomainFaces'in d&&d.certifiedDomainFaces,4);assert.ok(d.evaluatedRoutes!==undefined&&d.evaluatedRoutes<r.evaluatedRoutes);assert.ok(d.upperBoundMeters<domain.escapeLowerBoundMeters);assert.ok(d.lowerBoundMeters<=r.upperBoundMeters&&r.lowerBoundMeters<=d.upperBoundMeters);
});
test('long or nonlocal queries retain the global certificate and original precision/work failures',()=>{
 const g=createOctahedronGeometry(config);for(const b of[point('pnn',.33,.33),point('nnn',.33,.33)]){const a=point('ppp',.32,.33),d=polyhedronDistance(g,a,b),r=polyhedronDistanceReference(g,a,b);assert.ok(!('certifiedDomainFaces'in d));assert.equal(d.evaluatedRoutes,r.evaluatedRoutes);assert.ok(d.lowerBoundMeters<=r.upperBoundMeters&&r.lowerBoundMeters<=d.upperBoundMeters);}
 assert.throws(()=>polyhedronDistance(g,point('ppp',.3,.3),point('nnn',.3,.3),{maxBoxes:1}),/budget/);
 assert.throws(()=>polyhedronDistance(g,point('ppp',.04,.02),point('pnn',.02,.04),{absoluteToleranceMeters:1e-12}),/precision/);
});
test('local and fallback distances match exhaustive reference across aliases, roles, physical scales and moving sources',()=>{
 let seed=1099;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};let certified=0;
 for(const edgeLengthMeters of[1,1e6,1e9])for(const role of['exterior','interior']as const){const g=createOctahedronGeometry({...config,edgeLengthMeters,role});
  for(let i=0;i<80;i++){const face=g.faces[i%8]!,other=g.faces[Math.floor(random()*8)]!,u=i%5===0?0:random()*.08,v=i%7===0?0:random()*.08,a=point(face,u,v),b=point(other,random()*.08,random()*.08),d=polyhedronDistance(g,a,b),r=polyhedronDistanceReference(g,a,b),reverse=polyhedronDistance(g,b,a);if('certifiedDomainFaces'in d)certified++;assert.ok(d.lowerBoundMeters<=r.upperBoundMeters&&r.lowerBoundMeters<=d.upperBoundMeters);assert.ok(reverse.lowerBoundMeters<=d.upperBoundMeters&&d.lowerBoundMeters<=reverse.upperBoundMeters);
   const path=reconstructPolyhedronPath(g,a,b);assert.ok(path.lengthMeters<=path.lengthUpperBoundMeters);assert.ok(path.lengthUpperBoundMeters-path.lengthMeters<=g.scaleMeters*1e-6);let previous=path.atDistance(0).referencePosition;
   for(let j=1;j<=8;j++){const q=path.atDistance(path.lengthMeters*j/8);g.normalize(q.position);assert.ok(Math.hypot(...q.referencePosition.map((x,k)=>x-previous[k]!))<=path.lengthMeters/8+g.scaleMeters*1e-6);previous=q.referencePosition;}
  }
 }assert.ok(certified>50);
});
