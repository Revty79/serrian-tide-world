import type {PolyhedronTerrain} from '../terrain/polyhedron-contract.ts';
/** Shape-qualified numerical capacity. Display density, history and work limits
 * remain independent and unchanged. Unknown profiles retain the accepted cap. */
export function polyhedronDisplayCapacity(t:PolyhedronTerrain){const g=t.geometry,m=g.metadata as unknown as{provider?:unknown;version?:unknown},n=t.subdivisions;
 if(m.provider==='physical-regular-octahedron'&&m.version===1&&[128,256].includes(n)&&g.faces.length===8&&g.vertices.length===6&&g.edges.length===12&&g.faces.every(f=>g.isTriangle(f))&&t.sampleCount===4*n*n+2)return 262146;
 return 196610;
}
