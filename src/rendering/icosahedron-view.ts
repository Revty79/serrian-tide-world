import type {IcosahedronGeometry} from '../surfaces/icosahedron.ts';
import type {IcosahedronTerrain} from '../terrain/icosahedron.ts';
import {createTriangularPolyhedronView} from './triangular-polyhedron-view.ts';
/** Nineteen real joins; fixed connected net with pairwise separated interiors. */
export const ICOSAHEDRON_NET_ROUTES=Object.freeze([["f0"], ["f0", "f1"], ["f0", "f3"], ["f0", "f11"], ["f0", "f1", "f4"], ["f0", "f1", "f12"], ["f0", "f3", "f2"], ["f0", "f3", "f16"], ["f0", "f11", "f10"], ["f0", "f11", "f17"], ["f0", "f1", "f4", "f18"], ["f0", "f1", "f12", "f19"], ["f0", "f3", "f2", "f7"], ["f0", "f3", "f16", "f8"], ["f0", "f11", "f10", "f13"], ["f0", "f11", "f17", "f14"], ["f0", "f1", "f4", "f18", "f9"], ["f0", "f1", "f12", "f19", "f15"], ["f0", "f3", "f16", "f8", "f5"], ["f0", "f1", "f4", "f18", "f9", "f6"]].map(r=>Object.freeze(r)));
const view=createTriangularPolyhedronView<IcosahedronGeometry,IcosahedronTerrain>(()=>ICOSAHEDRON_NET_ROUTES);
export const initialIcosahedronView=view.initial,icosahedronNetPoint=view.netPoint,icosahedronLayout=view.layout,unprojectIcosahedron=view.unproject,projectIcosahedron=view.project,navigateIcosahedron=view.navigate,icosahedronVisibility=view.visibility,icosahedronIndexVisible=view.indexVisible,ICOSAHEDRON_PROJECTION=view.projection;
