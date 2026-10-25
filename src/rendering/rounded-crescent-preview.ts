import {dot3,type Vec3} from '../surfaces/cube-sphere.ts';
import {roundedLocalChart,roundedBrushRoutes} from '../surfaces/rounded-crescent-distance.ts';
import type {RoundedCrescentGeometry} from '../surfaces/rounded-crescent-globe.ts';
let previous:{g:RoundedCrescentGeometry;key:string;directions:Vec3[]}|undefined;
/** Bounded geometry-only physical circle, independent of camera and heights. */
export function roundedPreviewDirections(g:RoundedCrescentGeometry,center:Vec3,radius:number){
 const key=JSON.stringify([center,radius]);if(previous?.g===g&&previous.key===key)return previous.directions;
 const chart=roundedLocalChart(g,center),F=chart.frame(0,0),aa=dot3(F.Jx,F.Jx),ab=dot3(F.Jx,F.Jy),bb=dot3(F.Jy,F.Jy),det=aa*bb-ab*ab,L=Math.sqrt(aa),M=Math.sqrt(bb-ab*ab/aa),directions:Vec3[]=[],routes=roundedBrushRoutes(g,center);
 for(let i=0;i<=32;i++){const t=2*Math.PI*i/32,r=radius/g.scaleMeters,vx=r*(Math.cos(t)/L-Math.sin(t)*ab/(aa*M)),vy=r*Math.sin(t)/M,H=F.Hxx.map((v,k)=>v*vx*vx+2*F.Hxy[k]!*vx*vy+F.Hyy[k]!*vy*vy) as unknown as Vec3,rx=dot3(F.Jx,H),ry=dot3(F.Jy,H),x=vx+(ab*ry-bb*rx)/(2*det),y=vy+(ab*rx-aa*ry)/(2*det);let scale=1,p=chart.direction(x,y);for(let j=0;j<2;j++){const length=routes(p).lengthMeters;if(!length)break;scale*=radius/length;p=chart.direction(x*scale,y*scale);}directions.push(p);}
 previous={g,key,directions};return directions;
}
