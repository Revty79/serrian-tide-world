import {SOLID_CUBE_FACES,SOLID_CUBE_FRAMES,cubeDot,type CubeVector,type SolidCubeFace} from '../surfaces/solid-cube.ts';
import {cross3,unitDirection} from '../surfaces/cube-sphere.ts';

export interface CubeCamera {right:CubeVector;up:CubeVector;forward:CubeVector;zoom:number;netZoom?:number;netX?:number;netY?:number}
export type CubeDisplayMode='physical'|'net';
export interface CubeViewport {width:number;height:number}
export const CUBE_NET=Object.freeze({
 pz:{x:0,y:0,u:[1,0],v:[0,1]},px:{x:1,y:0,u:[0,1],v:[-1,0]},
 nx:{x:-1,y:0,u:[0,-1],v:[1,0]},py:{x:0,y:1,u:[-1,0],v:[0,-1]},
 ny:{x:0,y:-1,u:[1,0],v:[0,1]},nz:{x:2,y:0,u:[-1,0],v:[0,-1]},
} as const);
export const CUBE_FACE_LABELS={px:'+X',nx:'−X',py:'+Y',ny:'−Y',pz:'+Z',nz:'−Z'};
export function cubeCamera(direction:CubeVector=[1.35,-1.8,1.25],zoom=1):CubeCamera{
 if(direction.length!==3||!direction.every(Number.isFinite)||Math.hypot(...direction)===0||!Number.isFinite(zoom)||zoom<.65||zoom>3)throw RangeError('Invalid cube camera');
 const forward=unitDirection(direction),reference:CubeVector=Math.abs(forward[2])>.98?[0,1,0]:[0,0,1],right=unitDirection(cross3(reference,forward));
 return {forward,right,up:unitDirection(cross3(forward,right)),zoom};
}
export function rotateCube(camera:CubeCamera,dx:number,dy:number):CubeCamera{
 if(![dx,dy].every(Number.isFinite))throw RangeError('Finite cube rotation required');
 const f=unitDirection(camera.forward.map((v,i)=>v*Math.cos(dx)+camera.right[i]!*Math.sin(dx)) as unknown as CubeVector);
 const r=unitDirection(cross3(camera.up,f)),next=unitDirection(f.map((v,i)=>v*Math.cos(dy)+camera.up[i]!*Math.sin(dy)) as unknown as CubeVector);
 return {forward:next,right:r,up:unitDirection(cross3(next,r)),zoom:camera.zoom};
}
export function cubeLayout(camera:CubeCamera,mode:CubeDisplayMode,size:CubeViewport){
 if(![size.width,size.height].every(v=>Number.isFinite(v)&&v>0))throw RangeError('Positive cube viewport required');
 const width=mode==='net'?4:2*camera.right.reduce((n,v)=>n+Math.abs(v),0),height=mode==='net'?3:2*camera.up.reduce((n,v)=>n+Math.abs(v),0);
 return {x:size.width/2+(mode==='net'?(camera.netX??0):0),y:size.height/2+(mode==='net'?(camera.netY??0):0),scale:Math.min(size.width*.86/width,size.height*.82/height)*(mode==='net'?(camera.netZoom??1):camera.zoom)};
}
export interface CubeDisplayHit {face:SolidCubeFace;u:number;v:number}
/** Orthographic ray against the six actual planes; reference half-side is one. */
export function cubeRayHit(x:number,y:number,camera:CubeCamera):CubeDisplayHit|undefined{
 const o=camera.right.map((v,i)=>v*x+camera.up[i]!*y);let depth=-Infinity,result:CubeDisplayHit|undefined;
 for(const face of SOLID_CUBE_FACES){const f=SOLID_CUBE_FRAMES[face],facing=cubeDot(f.normal,camera.forward);if(facing<=1e-12)continue;
  const t=(1-cubeDot(f.normal,o as unknown as CubeVector))/facing;if(t<=depth)continue;
  const p=o.map((v,i)=>v+camera.forward[i]!*t) as unknown as CubeVector;
  if(p.some(v=>Math.abs(v)>1+2e-12))continue;
  depth=t;result={face,u:Math.max(-1,Math.min(1,cubeDot(p,f.u))),v:Math.max(-1,Math.min(1,cubeDot(p,f.v)))};
 }return result;
}
export function cubeNetHit(x:number,y:number):CubeDisplayHit|undefined{
 for(const face of SOLID_CUBE_FACES){const p=CUBE_NET[face],a=x-p.x,b=y-p.y,u=2*(a*p.u[0]+b*p.u[1]),v=2*(a*p.v[0]+b*p.v[1]);if(Math.abs(u)<=1&&Math.abs(v)<=1)return{face,u,v};}return;
}
export function projectCube(face:SolidCubeFace,u:number,v:number,camera:CubeCamera,mode:CubeDisplayMode,size:CubeViewport){
 const l=cubeLayout(camera,mode,size);let x:number,y:number;
 if(mode==='net'){const p=CUBE_NET[face];x=p.x+(u*p.u[0]+v*p.v[0])/2-.5;y=p.y+(u*p.u[1]+v*p.v[1])/2;}
 else {const f=SOLID_CUBE_FRAMES[face],p=f.normal.map((a,i)=>a+u*f.u[i]!+v*f.v[i]!) as unknown as CubeVector;x=cubeDot(p,camera.right);y=cubeDot(p,camera.up);}
 return{x:l.x+x*l.scale,y:l.y-y*l.scale};
}
