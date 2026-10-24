import type {SurfacePosition} from './contracts.ts';
import type {DumbbellGeometry} from './dumbbell.ts';
import {axialWaistDistance} from './axial-waist-distance.ts';
export function dumbbellNeckDistance(g:DumbbellGeometry,a:SurfacePosition,b:SurfacePosition){return axialWaistDistance(g,a,b,g.metadata.firstCenterMeters-g.metadata.firstLobeRadiusMeters+g.metadata.neckRadiusMeters/4,g.metadata.secondCenterMeters+g.metadata.secondLobeRadiusMeters-g.metadata.neckRadiusMeters/4);}
