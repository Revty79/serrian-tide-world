import type {OctahedronGeometry} from '../surfaces/octahedron.ts';
import type {OctahedronTerrain} from '../terrain/octahedron.ts';
import {createTriangularPolyhedronView} from './triangular-polyhedron-view.ts';
/** Verified non-overlapping seven-edge spanning strip in the actual dual graph. */
export const OCTAHEDRON_NET_CHAIN=Object.freeze(['ppp','ppn','pnn','pnp','nnp','npp','npn','nnn']);
const view=createTriangularPolyhedronView<OctahedronGeometry,OctahedronTerrain>(()=>OCTAHEDRON_NET_CHAIN.map((_,i)=>OCTAHEDRON_NET_CHAIN.slice(0,i+1)));
export const initialOctahedronView=view.initial,octahedronNetPoint=view.netPoint,octahedronLayout=view.layout,unprojectOctahedron=view.unproject,projectOctahedron=view.project,navigateOctahedron=view.navigate,octahedronVisibility=view.visibility,octahedronIndexVisible=view.indexVisible,OCTAHEDRON_PROJECTION=view.projection;
