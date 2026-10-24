import {createHourglassGeometry,type HourglassDimensions} from '../surfaces/hourglass.ts';
import {hourglassGeometryBrushPolicy} from '../terrain/hourglass-brush.ts';
/** Creator capacity qualification is separate from the underlying closed-solid
 * mathematics. Keep a three-cell default footprint inside the preview/work
 * envelope without raising common limits or changing numerical geography. */
export function assertInteractiveHourglass(dimensions:HourglassDimensions,detail:128|256){if(![128,256].includes(detail))throw RangeError('Choose supported Hourglass numerical detail.');const geometry=createHourglassGeometry({...dimensions,provider:'physical-faceted-hourglass',version:1,role:'exterior',identity:{worldId:'hourglass-configuration',surfaceId:'exterior'}}),policy=hourglassGeometryBrushPolicy(geometry,detail/4);if(!policy.wellSampled||policy.maximum<=policy.minimum)throw RangeError('Change World height, waist width or numerical detail to fit a three-cell brush within the interactive footprint budget.');return policy;}
