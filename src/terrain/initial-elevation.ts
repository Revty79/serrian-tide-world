/** Shared blank-ocean source data. This is initialization, never a render offset. */
export const BLANK_OCEAN_ELEVATION=-100;
export type HollowTerrainStart='ocean'|'reference-shell';
export function hollowStartingElevation(start:HollowTerrainStart|undefined,minimumWallThicknessMeters:number){
 if(start!==undefined&&start!=='ocean'&&start!=='reference-shell')throw RangeError('Choose blank ocean or reference shell.');
 if(start==='reference-shell')return 0;
 if(!Number.isFinite(minimumWallThicknessMeters)||minimumWallThicknessMeters<400)throw RangeError('A -100 m blank ocean requires at least 400 m of shell clearance. Increase wall thickness or choose the 0 m reference-shell start. No elevations were clamped.');
 return BLANK_OCEAN_ELEVATION;
}
