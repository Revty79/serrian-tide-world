import type {CylinderPhysicalPath} from './cylinder-path.ts';
import {physicalPathSpacings,type CylinderPathSpacingOptions} from './physical-path-spacing.ts';
export * from './physical-path-spacing.ts';
/** The accepted closed wrapper retains its provider validation. */
export function cylinderPathSpacings(path:CylinderPhysicalPath,options:CylinderPathSpacingOptions){
 if(path.provider!=='physical-cylinder-path'||path.version!==1)throw RangeError('Invalid cylinder path spacing or traversal range.');
 return physicalPathSpacings(path,options);
}
