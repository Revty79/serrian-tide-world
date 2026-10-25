import {roundedImplicit} from '../surfaces/rounded-crescent-ray.ts';
import {roundedAngle} from '../surfaces/rounded-crescent-globe.ts';
import {sphericalLayout,type SphericalView,type Viewport} from './spherical-view.ts';
/** Actual subpixel material coverage at the analytically projected smooth
 * silhouette. This geometry-only adapter uses the same 131,072 repair-pixel
 * ceiling as accepted curved/faceted presenters. No heights or colors enter. */
export function roundedFrontCoverage(view:SphericalView,size:Viewport,backing:Viewport){
 const g=view.roundedGlobe,key=JSON.stringify([view,size,backing]);
 if(!g||view.mode!=='globe'||Math.hypot(view.frame.forward[0],view.frame.forward[1])>1e-12)return{key,width:1,height:1,data:new Uint8Array(1),repairPixels:0};
 const width=backing.width,height=backing.height,l=sphericalLayout(view,size),E=g.bendRadius+g.bodyRadius,sx=width/size.width,sy=height/size.height,candidates=new Set<number>();
 const add=(x:number,y:number)=>{if(x>=0&&y>=0&&x<width&&y<height)candidates.add(y*width+x);};
 for(const side of [-1,1]){let previous:{x:number;y:number}|undefined;
  for(let i=0;i<=1024;i++){const psi=-Math.PI/2+Math.PI*i/1024,u=Math.sin(psi),f=1-g.tipTaper*u*u,phi=roundedAngle(g,u),r=g.bendRadius+side*g.bodyRadius*f*Math.cos(psi),x=r*Math.cos(phi),y=r*Math.sin(phi),p={x:(l.x+l.radius*((x*view.frame.right[0]+y*view.frame.right[1])/E-view.pan.x))*sx,y:(l.y-l.radius*((x*view.frame.up[0]+y*view.frame.up[1])/E-view.pan.y))*sy};
   if(previous){const steps=Math.max(1,Math.ceil(Math.max(Math.abs(p.x-previous.x),Math.abs(p.y-previous.y))));for(let j=0;j<=steps;j++){const x=Math.floor(previous.x+(p.x-previous.x)*j/steps),y=Math.floor(previous.y+(p.y-previous.y)*j/steps);for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)add(x+dx,y+dy);}}previous=p;
  }
 }
 if(candidates.size>131072)throw RangeError('Rounded Crescent projected coverage exceeds its existing repair budget.');
 const data=new Uint8Array(width*height);
 const hit=(x:number,y:number)=>{const a=((x/sx-l.x)/l.radius+view.pan.x)*E,b=((l.y-y/sy)/l.radius+view.pan.y)*E,q:[number,number,number]=[view.frame.right[0]*a+view.frame.up[0]*b,view.frame.right[1]*a+view.frame.up[1]*b,0],p=roundedImplicit(g,q).direction;return p[0]*p[0]+p[1]*p[1]<=1;};
 for(const index of candidates){const x=index%width,y=Math.floor(index/width);let bits=64|(hit(x+.5,y+.5)?1:0),bit=2;for(const dx of [.25,.75])for(const dy of [.25,.75]){if(hit(x+dx,y+dy))bits|=bit;bit*=2;}data[index]=bits;}
 return{key,width,height,data,repairPixels:candidates.size};
}
