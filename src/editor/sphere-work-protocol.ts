import type {CrescentCutGlobeGeometry} from '../surfaces/crescent-cut-globe.ts';
import type {RoundedCrescentGeometry} from '../surfaces/rounded-crescent-globe.ts';
import type { Vec3 } from '../surfaces/cube-sphere.ts';
import type { SphericalTerrain } from '../terrain/spherical.ts';
import type { SphericalBrushSettings,SphericalBrushVisibility } from '../terrain/spherical-brush.ts';
export interface SphereAcceptedPoint { readonly ordinal:number; readonly direction:Vec3; readonly visibility?:SphericalBrushVisibility }
export interface SphereWorkStats { dabs:number; candidateChecks:number; affectedSamples:number; writes:number; peakPreparedBytes:number }
export type SphereWorkInput=
 |{type:'warm';roundedGeometry:RoundedCrescentGeometry}
 |{type:'start';task:number;metadata:SphericalTerrain['metadata'];sourceRevision:number;values:Float32Array;direction:Vec3;settings:SphericalBrushSettings;hemisphere?:Vec3;physicalGeometry?:CrescentCutGlobeGeometry;roundedGeometry?:RoundedCrescentGeometry}
 |{type:'move';task:number;point:SphereAcceptedPoint}
 |{type:'release';task:number}
 |{type:'ack';task:number;sequence:number;revision:number};
export type SphereWorkOutput=
 |{type:'started';task:number;snapshotMs:number;geometryPreparationMs?:number}
 |{type:'prepared';task:number;sequence:number;sourceRevision:number;ordinal:number;fraction:number;center:Vec3;visible?:Vec3;indices:Uint32Array;before:Uint32Array;after:Float32Array;statistics:SphereWorkStats;processed:number}
 |{type:'progress';task:number;processed:number;statistics:SphereWorkStats}
 |{type:'done';task:number;processed:number;statistics:SphereWorkStats;computeMs:number;snapshotMs:number;ackWait:{count:number;totalMs:number;maxMs:number;samples:number[]}}
 |{type:'error';task:number;message:string;processed:number;statistics?:SphereWorkStats};
