import type {SolidCubeConfiguration, SolidCubePosition} from '../surfaces/solid-cube.ts';
import type {CubeStrokePathEvent, CubeStrokePathLimits, SolidCubeStrokePath} from '../surfaces/solid-cube-stroke-path.ts';
export type CubePathRole='primary'|'verifier';
export const CUBE_PATH_WORK_LIMITS=Object.freeze({workers:2,maxReplayActions:4096,maxReplayEvents:128,maxReplayBytes:2*1024*1024,maxResponseBytes:512*1024,comparisonSteps:128,startupTimeoutMs:10_000,workTimeoutMs:10_000});
export type CubeReplayAction={kind:'accept';point:SolidCubePosition}|{kind:'pump'}|{kind:'release'}|{kind:'take';event:CubeStrokePathEvent};
export interface CubePathHeader {task:number;generation:number;binding:string;role:CubePathRole}
export interface CubePathAck {revision:number;committedDabs:number;writes:number}
export type CubePathWorkInput=(CubePathHeader & {type:'start';configuration:SolidCubeConfiguration;radius:number;limits:CubeStrokePathLimits;actions:readonly CubeReplayAction[];expectedStatus:SolidCubeStrokePath['status'];expectedStatistics:SolidCubeStrokePath['statistics'];ack:CubePathAck})|
 (CubePathHeader & {type:'step';sequence:number;inputs:readonly {ordinal:number;point:SolidCubePosition}[];released:boolean;ack:CubePathAck});
export interface CubePathBody {status:SolidCubeStrokePath['status'];statistics:SolidCubeStrokePath['statistics'];event:CubeStrokePathEvent|undefined;error?:{name:string;message:string}}
export type CubePathWorkOutput=(CubePathHeader & {type:'ready';statistics:SolidCubeStrokePath['statistics'];status:SolidCubeStrokePath['status'];replayedActions:number;replayWorkUnits:number;replayMs:number})|
 (CubePathHeader & {type:'accepted';sequence:number;revision:number})|
 (CubePathHeader & {type:'step';sequence:number;revision:number;body:CubePathBody;workMs:number;stages:Record<string,{count:number;totalMs:number;maxMs:number;samples:number[]}>})|
 (CubePathHeader & {type:'error';message:string});
