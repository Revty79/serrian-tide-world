import type {prepareCylindricalDab} from '../terrain/cylindrical-brush.ts';
import type {CylindricalTerrain} from '../terrain/cylindrical.ts';
import {createConnectedHistory,type CylinderHistoryLimits} from './connected-history.ts';
export * from './connected-history.ts';
type Dab=ReturnType<typeof prepareCylindricalDab>;
export type CylindricalCommitJob=Pick<Dab,'preparedChanges'|'commit'|'center'|'settings'|'sourceRevision'>&{readonly statistics:Pick<Dab['statistics'],'affectedSamples'>};
/** Closed wrapper: same exact word history and hard budgets for both providers. */
export function createCylindricalHistory(terrain:CylindricalTerrain,input:CylinderHistoryLimits={}){return createConnectedHistory(terrain,input);}
export type CylindricalHistory=ReturnType<typeof createCylindricalHistory>;
