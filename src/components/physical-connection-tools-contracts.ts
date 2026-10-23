import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {Vec3} from '../surfaces/cube-sphere.ts';
import type {ThroughHole} from '../surfaces/through-hole.ts';
import type {PhysicalPassage,LinkedEntrance,PassageLocation} from '../surfaces/passages.ts';
export type PhysicalBranchDirection='tangent'|'deeper'|'shallower'|'axial-positive'|'axial-negative';
export type PhysicalDiagramPlane='xy'|'xz'|'yz';
export type PhysicalDiagramBoundary={readonly kind:'circle';readonly x:number;readonly y:number;readonly radius:number;readonly interior:boolean}|{readonly kind:'rect';readonly x:number;readonly y:number;readonly width:number;readonly height:number;readonly interior:boolean}|{readonly kind:'path';readonly points:readonly(readonly[number,number])[];readonly interior:boolean};
export type PhysicalHole=Omit<ThroughHole,'geometry'>&{readonly geometry:string};
export interface PhysicalConnections<H extends PhysicalHole>{readonly holes:readonly H[];readonly passages:readonly PhysicalPassage[];readonly links:readonly LinkedEntrance[]}
export interface PhysicalConnectionEditor<H extends PhysicalHole>{readonly locked:boolean;connections:PhysicalConnections<H>;error:string;changed():void;checkConnections(input:PhysicalConnections<H>):Promise<unknown>;changeConnections(input:PhysicalConnections<H>):Promise<unknown>;drainForSave():Promise<void>}
export interface PhysicalConnectionToolsGeometry<H extends PhysicalHole>{
 readonly worldId:string;readonly surfaceWord:string;readonly holeLabel:string;readonly materialWord:string;readonly supported:boolean;
 readonly defaultHoleWidth:number;readonly defaultTunnelWidth:number;readonly defaultBranchLength:number;
 readonly diagramLabel:string;readonly diagramDescription:string;diagram(plane:PhysicalDiagramPlane):{readonly bounds:readonly[readonly[number,number],readonly[number,number]];readonly boundaries:readonly PhysicalDiagramBoundary[]};
 readonly branchDirections:readonly{readonly value:PhysicalBranchDirection;readonly label:string}[];readonly branchDescription:string;
 readonly holeDescription:string;mouthLabel(h:H,index:number):string;
 role(p:SurfacePosition):'exterior'|'interior';normal(p:SurfacePosition):Vec3;
 holeBounds():{min:number;max:number};hole(p:SurfacePosition,r:number):H;resizeHole(h:H,r:number):H;moveHole(h:H,p:SurfacePosition):H;
 passageBounds():{min:number;max:number};passage(a:SurfacePosition,b:SurfacePosition,r:number):PhysicalPassage;branch(p:PhysicalPassage,id:string,length:number,r:number,direction:PhysicalBranchDirection):PhysicalPassage;chamber(p:PhysicalPassage,id:string,r:number):PhysicalPassage;junction(p:PhysicalPassage,id:string,position:Vec3):PhysicalPassage;opening(p:PhysicalPassage,id:string,anchor:SurfacePosition,r:number):PhysicalPassage;relocateOpening(p:PhysicalPassage,id:string,anchor:SurfacePosition):PhysicalPassage;
 link(p:SurfacePosition,to:PassageLocation):LinkedEntrance;relocateLink(l:LinkedEntrance,id:string,to:PassageLocation):LinkedEntrance;
}
