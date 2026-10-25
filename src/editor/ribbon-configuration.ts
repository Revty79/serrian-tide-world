import {createRibbonGeometry,type RibbonDimensions} from '../surfaces/ribbon.ts';
import {ribbonSubdivisions} from '../terrain/ribbon.ts';
import {ribbonBrushPolicy} from '../terrain/ribbon-brush.ts';
export function assertInteractiveRibbon(dimensions:RibbonDimensions,detail:128|256){
 const geometry=createRibbonGeometry({...dimensions,provider:'physical-faceted-ribbon',version:2,role:'exterior',identity:{worldId:'ribbon-configuration',surfaceId:'boundary'}}),policy=ribbonBrushPolicy({geometry,subdivisions:ribbonSubdivisions(detail)});
 if(!policy.wellSampled||policy.maximum<=policy.minimum)throw RangeError('Increase Ribbon length or thickness, reduce width/twist, or choose Higher detail for a useful three-cell brush.');return policy;
}
