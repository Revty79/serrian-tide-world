import {createDumbbellGeometry,type DumbbellDimensions} from '../surfaces/dumbbell.ts';
import {dumbbellGeometryBrushPolicy} from '../terrain/dumbbell-brush.ts';
/** Creator capacity qualification is separate from the underlying closed-solid
 * mathematics. Keep a three-cell default footprint inside the preview/work
 * envelope without raising common limits or changing numerical geography. */
export function assertInteractiveDumbbell(dimensions:DumbbellDimensions,detail:128|256){if(![128,256].includes(detail))throw RangeError('Choose supported Dumbbell numerical detail.');const geometry=createDumbbellGeometry({...dimensions,provider:'physical-faceted-dumbbell',version:1,role:'exterior',identity:{worldId:'dumbbell-configuration',surfaceId:'exterior'}}),policy=dumbbellGeometryBrushPolicy(geometry,detail/4);if(!policy.wellSampled||policy.maximum<=policy.minimum)throw RangeError('Change neck length, neck width or numerical detail to fit a three-cell brush within the interactive footprint budget.');return policy;}
