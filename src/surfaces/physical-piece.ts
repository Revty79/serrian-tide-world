import {createFloatingIslandGeometry,type FloatingIslandConfiguration} from './floating-island.ts';
import {createFragmentGeometry,type FragmentConfiguration} from './fragment.ts';
export type PhysicalPieceConfiguration=FloatingIslandConfiguration|FragmentConfiguration;
export const createPhysicalPieceGeometry=(c:PhysicalPieceConfiguration)=>c.provider==='physical-tetrahedral-fragment'?createFragmentGeometry(c):createFloatingIslandGeometry(c);
export type PhysicalPieceGeometry=ReturnType<typeof createPhysicalPieceGeometry>;
