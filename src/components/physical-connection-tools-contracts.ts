import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {Vec3} from '../surfaces/cube-sphere.ts';
import type {ThroughHole} from '../surfaces/through-hole.ts';
import type {PhysicalPassage,LinkedEntrance,PassageLocation} from '../surfaces/passages.ts';
import type {CylinderBranchDirection} from '../surfaces/hollow-cylinder-passages.ts';
export type PhysicalHole=Omit<ThroughHole,'geometry'>&{readonly geometry:string};
export interface PhysicalConnections<H extends PhysicalHole>{readonly holes:readonly H[];readonly passages:readonly PhysicalPassage[];readonly links:readonly LinkedEntrance[]}
export interface PhysicalConnectionEditor<H extends PhysicalHole>{readonly locked:boolean;connections:PhysicalConnections<H>;error:string;changed():void;checkConnections(input:PhysicalConnections<H>):Promise<unknown>;changeConnections(input:PhysicalConnections<H>):Promise<unknown>;drainForSave():Promise<void>}
export interface PhysicalConnectionToolsGeometry<H extends PhysicalHole>{
 readonly worldId:string;readonly surfaceWord:string;readonly holeLabel:string;readonly dimensions:{readonly outerRadiusMeters:number;readonly innerRadiusMeters:number;readonly outerLengthMeters:number;readonly innerLengthMeters:number;readonly minimumThicknessMeters:number};
 role(p:SurfacePosition):'exterior'|'interior';normal(p:SurfacePosition):Vec3;
 holeBounds():{min:number;max:number};hole(p:SurfacePosition,r:number):H;resizeHole(h:H,r:number):H;moveHole(h:H,p:SurfacePosition):H;
 passageBounds():{min:number;max:number};passage(a:SurfacePosition,b:SurfacePosition,r:number):PhysicalPassage;branch(p:PhysicalPassage,id:string,length:number,r:number,direction:CylinderBranchDirection):PhysicalPassage;chamber(p:PhysicalPassage,id:string,r:number):PhysicalPassage;junction(p:PhysicalPassage,id:string,position:Vec3):PhysicalPassage;opening(p:PhysicalPassage,id:string,anchor:SurfacePosition,r:number):PhysicalPassage;relocateOpening(p:PhysicalPassage,id:string,anchor:SurfacePosition):PhysicalPassage;
 link(p:SurfacePosition,to:PassageLocation):LinkedEntrance;relocateLink(l:LinkedEntrance,id:string,to:PassageLocation):LinkedEntrance;
}
