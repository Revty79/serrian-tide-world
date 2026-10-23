import type {PolyhedronExcavation} from '../surfaces/polyhedron-excavation.ts';
import type {PolyhedronRole} from '../surfaces/polyhedron-material.ts';
import type {PolyhedronTerrain} from '../terrain/polyhedron-contract.ts';
import type {PyramidDisplayCache} from './pyramid-field.ts';
import type {CylinderView} from './cylindrical-view.ts';
export interface PolyhedronExcavationScene extends PolyhedronExcavation{readonly banks:Partial<Record<PolyhedronRole,PyramidDisplayCache<PolyhedronTerrain>>>;readonly revision:number;readonly role:PolyhedronRole}
export function polyhedronCutView(view:CylinderView,scene?:PolyhedronExcavationScene){return !!scene?.primitives.length&&view.mode==='physical'&&(view.interiorView==='center'||scene.role==='exterior');}
