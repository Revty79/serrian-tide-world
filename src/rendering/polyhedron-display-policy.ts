import type {PolyhedronTerrain} from '../terrain/polyhedron-contract.ts';
/** Shape-qualified numerical capacity. Display density, history and work limits
 * remain independent and unchanged. Unknown profiles retain the accepted cap. */
export function polyhedronDisplayCapacity(t:PolyhedronTerrain){const g=t.geometry,m=g.metadata as unknown as{provider?:unknown;version?:unknown},n=t.subdivisions;
 if(m.provider==='physical-regular-icosahedron'&&m.version===1&&[128,256].includes(n)&&g.faces.length===20&&g.vertices.length===12&&g.edges.length===30&&g.faces.every(f=>g.isTriangle(f))&&t.sampleCount===10*n*n+2)return 655362;
 if(m.provider==='physical-regular-dodecahedron'&&m.version===1&&[128,256].includes(n)&&g.physicalFaces?.length===12&&g.physicalEdges?.length===30&&g.faces.length===36&&g.vertices.length===20&&g.edges.length===54&&g.faces.every(f=>g.isTriangle(f))&&t.sampleCount===18*n*n+2)return 1179650;
 if(m.provider==='physical-pentagonal-trapezohedron'&&m.version===1&&[128,256].includes(n)&&g.physicalFaces?.length===10&&g.physicalEdges?.length===20&&g.faces.length===20&&g.vertices.length===12&&g.edges.length===30&&g.faces.every(f=>g.isTriangle(f))&&t.sampleCount===10*n*n+2)return 655362;
 if(m.provider==='physical-regular-octahedron'&&m.version===1&&[128,256].includes(n)&&g.faces.length===8&&g.vertices.length===6&&g.edges.length===12&&g.faces.every(f=>g.isTriangle(f))&&t.sampleCount===4*n*n+2)return 262146;
 return 196610;
}
