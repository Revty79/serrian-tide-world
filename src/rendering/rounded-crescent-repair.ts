import {roundedRayTracer} from '../surfaces/rounded-crescent-ray.ts';
import {sphericalLayout,type SphericalView,type Viewport} from './spherical-view.ts';
/** Replace only geometry rays marked numerically uncertain by the GPU. The
 * payload is actual double-precision first-hit chart coordinates, never colors
 * or elevations. Both center and four quarter rays still use the shared field.
 * The accepted 131072 repair-pixel ceiling and backing cap remain bounded. */
export function roundedRepairCoordinates(view:SphericalView,size:Viewport,backing:Viewport,flags:Uint8Array){
 const g=view.roundedGlobe!,w=backing.width,h=backing.height;if(flags.length!==w*h*4)throw Error('Rounded geometry flag dimensions disagree.');const lookup=new Uint8Array(flags.length),records:number[]=new Array(20).fill(0),layout=sphericalLayout(view,size),E=g.bendRadius+g.bodyRadius,f=view.frame,trace=roundedRayTracer(g),hit=new Float64Array(4);let count=0;
 const coordinates=(px:number,py:number)=>{let x=0,y=0,z=0,face=0,u=0,v=0;
  if(view.mode==='globe'){const sx=((px-layout.x)/layout.radius+view.pan.x)*E,sy=((layout.y-py)/layout.radius+view.pan.y)*E;if(!trace(f.right[0]*sx+f.up[0]*sy+3*E*f.forward[0],f.right[1]*sx+f.up[1]*sy+3*E*f.forward[1],f.right[2]*sx+f.up[2]*sy+3*E*f.forward[2],-f.forward[0],-f.forward[1],-f.forward[2],hit))return[0,0,0,0];x=hit[0]!;y=hit[1]!;z=hit[2]!;const ax=Math.abs(x),ay=Math.abs(y),az=Math.abs(z);let n=0,du=0,dv=0;if(ax>=ay&&ax>=az){face=x>=0?0:1;n=ax;du=x>=0?y:-y;dv=z;}else if(ay>=az){face=y>=0?2:3;n=ay;du=y>=0?-x:x;dv=z;}else{face=z>=0?4:5;n=az;du=x;dv=z>=0?y:-y;}u=Math.atan(du/n);v=Math.atan(dv/n);
  }else{const xx=(px-layout.x)/layout.face+2-view.pan.x,yy=(py-layout.y)/layout.face+1.5-view.pan.y,c=Math.floor(xx),r=Math.floor(yy),s=xx-c,t=yy-r;if(r===1&&c>=0&&c<4)face=([3,0,2,1] as const)[c]!;else if(c===1&&(r===0||r===2))face=r===0?4:5;else return[0,0,0,0];u=face===4?(2*t-1)*Math.PI/4:face===5?(1-2*t)*Math.PI/4:(2*s-1)*Math.PI/4;v=face===4?(2*s-1)*Math.PI/4:face===5?(1-2*s)*Math.PI/4:(1-2*t)*Math.PI/4;}
  return[u,v,face+1,1];
 };
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(!flags[((h-y-1)*w+x)*4])continue;if(++count>131072)throw RangeError('Rounded geometry uncertainty exceeds its qualified repair budget.');const at=(y*w+x)*4;lookup[at]=count&255;lookup[at+1]=(count>>8)&255;lookup[at+2]=(count>>16)&255;for(const[dx,dy]of [[.5,.5],[.25,.25],[.75,.25],[.25,.75],[.75,.75]])records.push(...coordinates((x+dx!)*size.width/w,(y+dy!)*size.height/h));}
 const width=count?512:1,rows=Math.max(1,Math.ceil(records.length/4/width)),data=new Float32Array(width*rows*4);data.set(records.slice(0,data.length));return{lookup,data,width,rows,count};
}
