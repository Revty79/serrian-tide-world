import {cross3,dot3,unitDirection,type Vec3} from './cube-sphere.ts';

export interface RoundedCrescentDimensions {
 readonly worldSizeMeters:number;readonly curvatureRatio:number;readonly spanDegrees:number;
 readonly bodyRadiusRatio:number;readonly depthRatio:number;readonly tipTaper:number;readonly tipRoundness:number;
}
export interface RoundedCrescentGeometry extends RoundedCrescentDimensions {
 readonly provider:'physical-rounded-crescent-globe';readonly version:1;
 readonly scaleMeters:number;readonly bendRadius:number;readonly bodyRadius:number;readonly bodyDepth:number;readonly halfSpan:number;
 readonly minimumStretch:number;readonly maximumStretch:number;readonly elevationLimitMeters:number;
}
export const ROUNDED_CRESCENT_DEFAULTS:RoundedCrescentDimensions=Object.freeze({worldSizeMeters:2000000,curvatureRatio:1,spanDegrees:260,bodyRadiusRatio:.45,depthRatio:1,tipTaper:.15,tipRoundness:0});
export const ROUNDED_CRESCENT_PRESETS=Object.freeze({
 'Rounded crescent':{},'Heavy crescent':{bodyRadiusRatio:.55,spanDegrees:230},'Slender crescent':{bodyRadiusRatio:.28,spanDegrees:270},
 'Gentle curve':{curvatureRatio:1.2,spanDegrees:190},'Strong curve':{curvatureRatio:.85,bodyRadiusRatio:.4,spanDegrees:290},
 'Long taper':{spanDegrees:290,tipTaper:.3,tipRoundness:.15},'Short and full':{spanDegrees:180,bodyRadiusRatio:.5,tipTaper:0,tipRoundness:-.15},
} satisfies Record<string,Partial<RoundedCrescentDimensions>>);
export function roundedCrescentGeometry(d:RoundedCrescentDimensions):RoundedCrescentGeometry {
 const {worldSizeMeters:S,curvatureRatio:c,spanDegrees:span,bodyRadiusRatio:a,depthRatio:b,tipTaper:k,tipRoundness:h}=d;
 if(![S,c,span,a,b,k,h].every(Number.isFinite)||S<100000||S>1e9||c<.75||c>1.25||span<160||span>300||a<.2||a>.6||a/c>.6||b<.65||b>1.25||k<0||k>.35||h<-.2||h>.2)throw RangeError('Rounded Crescent requires World Size 100,000-1,000,000,000 m, curvature 0.75-1.25, span 160-300 degrees, body radius 0.2-0.6 (at most 0.6 of bend radius), depth 0.65-1.25, taper 0-0.35 and roundness -0.2-0.2.');
 const R=c,A=a,B=a*b,beta=span*Math.PI/360,f=1-k,angleMin=beta*(1-Math.abs(h)*2),radialMin=R-A;
 // F maps the entire unit ball injectively to material: angle is strictly
 // monotone and spans <2pi, radial coordinates stay positive, and each normal
 // section is an ellipse. Its Jacobian in the (T,N,B) frame is triangular.
 // ||J^-1||_2 <= ||J^-1||_F supplies a global path-length lower bound.
 const minimumStretch=1/Math.sqrt((1+(2*k/f)**2)/(angleMin*radialMin)**2+1/(A*f)**2+1/(B*f)**2);
 const maximumStretch=Math.hypot(beta*(1+2*Math.abs(h))*(R+A),2*k*Math.hypot(A,B),A,B);
 return Object.freeze({provider:'physical-rounded-crescent-globe',version:1,worldSizeMeters:S,curvatureRatio:c,spanDegrees:span,bodyRadiusRatio:a,depthRatio:b,tipTaper:k,tipRoundness:h,scaleMeters:S/2,bendRadius:R,bodyRadius:A,bodyDepth:B,halfSpan:beta,minimumStretch,maximumStretch,elevationLimitMeters:S/2*Math.min(A,B)*f/8});
}
export function roundedAngle(g:RoundedCrescentGeometry,u:number){return g.halfSpan*(u+g.tipRoundness*(u*u*u-u));}
export function roundedProfile(g:RoundedCrescentGeometry,u:number){return 1-g.tipTaper*u*u;}
/** Ambient diffeomorphism, normalized by scaleMeters. Restrict the unit ball
 * to get the solid; restrict its sphere to get the complete smooth boundary.
 * The poles have ordinary regular cube charts, not collapsed editable cells. */
export function roundedPoint(g:RoundedCrescentGeometry,p:Vec3):Vec3 {
 const f=roundedProfile(g,p[0]),phi=roundedAngle(g,p[0]),r=g.bendRadius+g.bodyRadius*f*p[1];
 return[r*Math.cos(phi),r*Math.sin(phi),g.bodyDepth*f*p[2]];
}
export const roundedPosition=(g:RoundedCrescentGeometry,p:Vec3):Vec3=>roundedPoint(g,p).map(v=>v*g.scaleMeters) as unknown as Vec3;
export function roundedDifferential(g:RoundedCrescentGeometry,p:Vec3){
 const [u,v,w]=p,k=g.tipTaper,h=g.tipRoundness,f=1-k*u*u,fp=-2*k*u,fpp=-2*k,phi=roundedAngle(g,u),q=g.halfSpan*(1+h*(3*u*u-1)),qq=6*g.halfSpan*h*u,c=Math.cos(phi),s=Math.sin(phi),A=g.bodyRadius,B=g.bodyDepth,r=g.bendRadius+A*f*v;
 const x:Vec3=[A*fp*v*c-r*q*s,A*fp*v*s+r*q*c,B*fp*w],y:Vec3=[A*f*c,A*f*s,0],z:Vec3=[0,0,B*f];
 const xx:Vec3=[(A*fpp*v-r*q*q)*c-(2*A*fp*v*q+r*qq)*s,(A*fpp*v-r*q*q)*s+(2*A*fp*v*q+r*qq)*c,B*fpp*w],xy:Vec3=[A*fp*c-A*f*q*s,A*fp*s+A*f*q*c,0],xz:Vec3=[0,0,B*fp];
 const apply=(a:Vec3):Vec3=>[x[0]*a[0]+y[0]*a[1]+z[0]*a[2],x[1]*a[0]+y[1]*a[1]+z[1]*a[2],x[2]*a[0]+y[2]*a[1]+z[2]*a[2]];
 const second=(a:Vec3,b:Vec3):Vec3=>xx.map((v,i)=>v*a[0]*b[0]+xy[i]!*(a[0]*b[1]+a[1]*b[0])+xz[i]!*(a[0]*b[2]+a[2]*b[0])) as unknown as Vec3;
 const determinant=dot3(x,cross3(y,z));
 const covector=(a:Vec3):Vec3=>{const yz=cross3(y,z),zx=cross3(z,x),xy=cross3(x,y);return yz.map((v,i)=>(v*a[0]+zx[i]!*a[1]+xy[i]!*a[2])/determinant) as unknown as Vec3;};
 return{x,y,z,xx,xy,xz,apply,second,covector,determinant};
}
export function roundedNormal(g:RoundedCrescentGeometry,p:Vec3):Vec3{return unitDirection(roundedDifferential(g,p).covector(p));}
export function roundedGradient(g:RoundedCrescentGeometry,p:Vec3,intrinsicGradient:Vec3):Vec3 {
 const D=roundedDifferential(g,p),n=unitDirection(D.covector(p)),v=D.covector(intrinsicGradient),normal=dot3(v,n);return v.map((a,i)=>a-normal*n[i]!) as unknown as Vec3;
}
export function roundedMetric(g:RoundedCrescentGeometry,p:Vec3,tangent:Vec3){const v=roundedDifferential(g,p).apply(tangent);return dot3(v,v)*g.scaleMeters**2;}
export function roundedInverse(g:RoundedCrescentGeometry,q:Vec3):Vec3 {
 const angle=Math.atan2(q[1],q[0]);let u=angle/g.halfSpan;
 for(let i=0;i<6;i++)u-=(roundedAngle(g,u)-angle)/(g.halfSpan*(1+g.tipRoundness*(3*u*u-1)));
 const f=roundedProfile(g,u);return[u,(Math.hypot(q[0],q[1])-g.bendRadius)/(g.bodyRadius*f),q[2]/(g.bodyDepth*f)];
}
/** The solid's exact membership function, including its two smooth poles. */
export function roundedContains(g:RoundedCrescentGeometry,q:Vec3){const angle=Math.atan2(q[1],q[0]);if(Math.abs(angle)>g.halfSpan)return false;return Math.hypot(...roundedInverse(g,q))<=1;}
export function roundedSurfaceArea(g:RoundedCrescentGeometry,steps=128){
 // Equal-area sphere quadrature avoids polar parameter singularities.
 let area=0,volume=0;const m=steps*2;
 for(let i=0;i<steps;i++){const u=-1+2*(i+.5)/steps,r=Math.sqrt(1-u*u);for(let j=0;j<m;j++){const t=2*Math.PI*(j+.5)/m,p:Vec3=[u,r*Math.cos(t),r*Math.sin(t)],D=roundedDifferential(g,p),v=D.covector(p),jac=Math.abs(D.determinant)*Math.hypot(...v);area+=jac;volume+=dot3(roundedPoint(g,p),v)*Math.abs(D.determinant)/3;}}
 const weight=4*Math.PI/(steps*m);return{areaMeters2:area*weight*g.scaleMeters**2,volumeMeters3:volume*weight*g.scaleMeters**3};
}
/** Integrate the triangular ambient Jacobian over each elliptical material
 * section. The odd radial term vanishes; the remaining integrand is polynomial. */
export function roundedVolume(g:RoundedCrescentGeometry){
 const k=g.tipTaper,h=g.tipRoundness,profile=[1,-(1+2*k),2*k+k*k,-k*k],coefficients=new Array(5).fill(0);
 for(let i=0;i<profile.length;i++){coefficients[i]+=(1-h)*profile[i]!;coefficients[i+1]+=3*h*profile[i]!;}
 return Math.PI*g.bodyRadius*g.bodyDepth*g.bendRadius*g.halfSpan*g.scaleMeters**3*coefficients.reduce((sum,v,i)=>sum+2*v/(2*i+1),0);
}
