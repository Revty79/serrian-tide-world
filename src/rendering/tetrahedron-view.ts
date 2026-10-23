import type {TetrahedronGeometry} from '../surfaces/tetrahedron.ts';
import type {TetrahedronTerrain} from '../terrain/tetrahedron.ts';
import {createTriangularPolyhedronView} from './triangular-polyhedron-view.ts';
const view=createTriangularPolyhedronView<TetrahedronGeometry,TetrahedronTerrain>(g=>g.faces.map(f=>f==='base'?['base']:['base',f]));
export const initialTetrahedronView=view.initial,tetrahedronNetPoint=view.netPoint,tetrahedronLayout=view.layout,unprojectTetrahedron=view.unproject,projectTetrahedron=view.project,navigateTetrahedron=view.navigate,tetrahedronVisibility=view.visibility,tetrahedronIndexVisible=view.indexVisible,TETRAHEDRON_PROJECTION=view.projection;
