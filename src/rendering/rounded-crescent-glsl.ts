/** Smooth material intersection and physical differential only. The accepted
 * native Sphere texture reconstruction, palette and relief remain shared. */
export const ROUNDED_CRESCENT_GLSL=`
uniform sampler2D rcCoverage;
uniform highp sampler2D rcRepair;
uniform int rcProbeMode;
bool rcUncertain=false;
uniform highp sampler2DArray rcClasses;
uniform vec4 rcShape,rcProfile;
uniform float rcCurvature;
float rcAngle(vec2 q){float a=atan(q.y,q.x);return a+(q.y*cos(a)-q.x*sin(a))/length(q);}
float rcAtan(float x){float a=atan(x),c=cos(a);return a+(x*c-sin(a))*c;}
vec3 rcInverse(vec3 q){float r=length(q.xy),angle=rcAngle(q.xy),beta=rcShape.w,h=rcProfile.y,u=angle/beta;if(abs(angle)>beta)u=sign(angle)*(1.+(abs(angle)-beta)/(beta*(1.+2.*h)));else for(int j=0;j<4;j++)u-=(beta*(u+h*(u*u*u-u))-angle)/(beta*(1.+h*(3.*u*u-1.)));float f=1.-rcProfile.x*min(1.,u*u);return vec3(u,(r-rcShape.x)/(rcShape.y*f),q.z/(rcShape.z*f));}
vec3 rcCovector(vec3 p,vec3 cov){float u=p.x,f=1.-rcProfile.x*u*u,phi=rcShape.w*(u+rcProfile.y*(u*u*u-u)),c=cos(phi),s=sin(phi),A=rcShape.w*(1.+rcProfile.y*(3.*u*u-1.))*(rcShape.x+rcShape.y*f*p.y),shear=-2.*rcProfile.x*u/f,t=(cov.x-shear*dot(p.yz,cov.yz))/A,n=cov.y/(rcShape.y*f);return vec3(n*c-t*s,n*s+t*c,cov.z/(rcShape.z*f));}
float rcSlope(vec3 point,vec3 ray){vec3 p=rcInverse(point);float norm=length(p),r=length(point.xy),f=1.-rcProfile.x*min(1.,p.x*p.x),prime=abs(p.x)<1.?rcShape.w*(1.+rcProfile.y*(3.*p.x*p.x-1.)):rcShape.w*(1.+2.*rcProfile.y),fp=abs(p.x)<1.?-2.*rcProfile.x*p.x:0.,gt=(p.x-fp/f*dot(p.yz,p.yz))/(prime*r*norm),gn=p.y/(rcShape.y*f*norm),gz=p.z/(rcShape.z*f*norm);return dot(vec3((gn*point.x-gt*point.y)/r,(gn*point.y+gt*point.x)/r,gz),ray);}
bool rcTrace(vec3 origin,vec3 ray,out vec3 p,int coverage){
 float E=rcProfile.z;
 if(abs(ray.x)+abs(ray.y)<1.e-7){p=rcInverse(vec3(origin.xy,0.));float square=1.-dot(p.xy,p.xy);if(coverage==0||coverage<0&&square<0.)return false;p.z=sqrt(max(0.,square))*(ray.z<0.?1.:-1.);return true;}
 float along=dot(origin,ray),disc=along*along-dot(origin,origin)+E*E;if(disc<0.){if(disc> -2.e-5*E*E)rcUncertain=true;return false;}float t=-along-sqrt(disc),end=-along+sqrt(disc),aa=dot(ray.xy,ray.xy),bb=dot(origin.xy,ray.xy),cc=dot(origin.xy,origin.xy),holeLo=1.e20,holeHi=-1.e20,pad=2.e-7*E,outer=rcShape.x+rcShape.y+pad,inner=rcShape.x-rcShape.y-pad;
 if(aa>1.e-20){float outerDisc=bb*bb-aa*(cc-outer*outer);if(outerDisc<0.){if(outerDisc> -2.e-5*aa*E*E)rcUncertain=true;return false;}t=max(t,(-bb-sqrt(outerDisc))/aa);end=min(end,(-bb+sqrt(outerDisc))/aa);float innerDisc=bb*bb-aa*(cc-inner*inner);if(innerDisc>0.){holeLo=(-bb-sqrt(innerDisc))/aa;holeHi=(-bb+sqrt(innerDisc))/aa;}}else if(cc>outer*outer||cc<inner*inner)return false;
 if(abs(ray.z)>1.e-20){float a=(-rcShape.z-pad-origin.z)/ray.z,b=(rcShape.z+pad-origin.z)/ray.z;t=max(t,min(a,b));end=min(end,max(a,b));}else if(abs(origin.z)>rcShape.z+pad)return false;float previous=t;
 for(int iteration=0;iteration<512;iteration++){if(t>=holeLo&&t<holeHi){t=holeHi;previous=t;}if(t>end)return false;vec3 q=origin+ray*t;vec3 inverse=rcInverse(q);float value=length(inverse)-1.;if(value<2.e-5&&abs(rcSlope(q,ray))<.05)rcUncertain=true;
  if(value<=0.){float lo=previous,hi=t;for(int j=0;j<20;j++){float m=(lo+hi)*.5;if(length(rcInverse(origin+ray*m))>1.)lo=m;else hi=m;}p=normalize(rcInverse(origin+ray*((lo+hi)*.5)));return true;}
  float quadratic=0.;{float slope=rcSlope(q,ray),root=sqrt(slope*slope+2.*rcCurvature*value),step=slope>=0.?(slope+root)/rcCurvature:2.*value/(root-slope),r=length(q.xy),cb=cos(rcShape.w),sb=sin(rcShape.w),angular=min(q.x*cb+q.y*sb>=0.?abs(q.x*sb-q.y*cb):r,q.x*cb-q.y*sb>=0.?abs(q.x*sb+q.y*cb):r),clearance=min(min(r-(rcShape.x-rcShape.y),rcShape.x+rcShape.y-r),min(rcShape.z-abs(q.z),min(angular,q.x<0.?abs(q.y):r)));float newton=slope<0.?value/-slope:1.e20,newtonM=rcCurvature+1./(rcProfile.w*rcProfile.w);if(newton<clearance*.9&&newton<rcProfile.w*.5&&newtonM*newton< -slope*.9&&t+newton>t){previous=t;t+=newton;continue;}quadratic=.9*max(0.,min(step,clearance));}
  previous=t;t+=max(max(value*rcProfile.w,quadratic),1.e-7);
 }rcUncertain=true;return false;
}
bool rcCoordinates(vec2 pixel,out vec3 p,out int face,out vec2 uv,int coverage){
 if(rcProbeMode==0&&textureSize(rcCoverage,0).x>1){vec2 backingPixel=pixel*backingSize/viewport;vec4 packed=texelFetch(rcCoverage,ivec2(floor(backingPixel)),0);ivec3 code=ivec3(round(packed.rgb*255.));int id=code.r+256*code.g+65536*code.b;if(id>0){vec2 fraction=fract(backingPixel);int ray=abs(fraction.x-.5)<.1&&abs(fraction.y-.5)<.1?0:(fraction.x<.5?1:2)+(fraction.y<.5?0:2),at=id*5+ray,width=textureSize(rcRepair,0).x;vec4 exact=texelFetch(rcRepair,ivec2(at%width,at/width),0);if(exact.z<.5)return false;face=int(exact.z)-1;uv=exact.xy;p=foldDirection(face,uv);return true;}}

 if(mode==0){vec2 xy=(pixel-viewport*.5)/globeRadius;xy.y=-xy.y;xy+=pan;vec3 origin=(cameraRight*xy.x+cameraUp*xy.y)*rcProfile.z;if(!rcTrace(origin,-cameraForward,p,coverage))return false;vec3 a=abs(p);float n,u,v;if(a.x>=a.y&&a.x>=a.z){face=p.x>=0.?0:1;n=a.x;u=p.x>=0.?p.y:-p.y;v=p.z;}else if(a.y>=a.z){face=p.y>=0.?2:3;n=a.y;u=p.y>=0.?-p.x:p.x;v=p.z;}else{face=p.z>=0.?4:5;n=a.z;u=p.x;v=p.z>=0.?p.y:-p.y;}uv=vec2(rcAtan(u/n),rcAtan(v/n));
 }else{vec2 grid=(pixel-viewport*.5)/faceSize+vec2(2.,1.5)-pan;ivec2 slot=ivec2(floor(grid));vec2 st=fract(grid);if(min(min(st.x,1.-st.x),min(st.y,1.-st.y))<1.e-4)rcUncertain=true;face=-1;if(slot.y==1){if(slot.x==0)face=3;else if(slot.x==1)face=0;else if(slot.x==2)face=2;else if(slot.x==3)face=1;}else if(slot.x==1&&slot.y==0)face=4;else if(slot.x==1&&slot.y==2)face=5;if(face<0)return false;uv=face==4?(2.*st.yx-1.)*Q:face==5?(1.-2.*st.yx)*Q:vec2(2.*st.x-1.,1.-2.*st.y)*Q;p=foldDirection(face,uv);}
 return true;
}
bool rcHit(vec2 pixel,out vec4 value,out float depth,out int classification,int coverage){vec3 p;int face;vec2 uv;depth=1.;classification=0;value=vec4(0.);if(!rcCoordinates(pixel,p,face,uv,coverage))return false;value=field(face,uv);vec3 normal=normalize(rcCovector(p,p)),gradient=rcCovector(p,value.yzw);value.yzw=gradient-normal*dot(gradient,normal);depth=mode==0?max(0.,dot(normal,cameraForward)):1.;classification=2+(value.x>0.?1:0);return true;}
struct RcSample {vec3 p;vec2 uv;int face;int classification;vec4 value;bool loaded;};
RcSample rcSample(vec2 pixel,int coverage){RcSample s;s.loaded=false;s.value=vec4(0.);s.classification=0;if(!rcCoordinates(pixel,s.p,s.face,s.uv,coverage))return s;if(rcProbeMode==1){s.classification=1;return s;}float n=float(textureSize(elevations,0).x-1);ivec2 slot=ivec2(floor(clamp((s.uv/Q+1.)*n*.5,0.,n-1.)/8.));int flag=int(round(texelFetch(rcClasses,ivec3(slot,s.face),0).r*255.));if(flag==1)s.classification=2;else if(flag==2)s.classification=3;else{s.value=field(s.face,s.uv);s.loaded=true;s.classification=2+(s.value.x>0.?1:0);}return s;}
vec4 rcSampleColor(RcSample s){if(rcProbeMode==1)return vec4(0.);if(s.classification==0)return vec4(0.);vec4 value=s.loaded?s.value:field(s.face,s.uv);vec3 normal=normalize(rcCovector(s.p,s.p)),gradient=rcCovector(s.p,value.yzw);value.yzw=gradient-normal*dot(gradient,normal);float depth=mode==0?max(0.,dot(normal,cameraForward)):1.;return vec4(color(value,depth),1.);}
vec4 rcShade(vec2 pixel,out int classification,int coverage){vec4 value;float depth;if(!rcHit(pixel,value,depth,classification,coverage))return vec4(0.);return vec4(color(value,depth),1.);}
int rcCoverageValue(int bits,int bit){return (bits&64)==0?-1:((bits&bit)==0?0:1);}
vec4 rcPixel(vec2 pixel){int bits=rcProbeMode==0&&textureSize(rcCoverage,0).x>1?int(round(texelFetch(rcCoverage,ivec2(floor(pixel*backingSize/viewport)),0).a*255.)):0;vec2 step=viewport/backingSize*.25;RcSample center=rcSample(pixel,rcCoverageValue(bits,1)),a=rcSample(pixel+vec2(-step.x,-step.y),rcCoverageValue(bits,2)),b=rcSample(pixel+vec2(step.x,-step.y),rcCoverageValue(bits,8)),c=rcSample(pixel+vec2(-step.x,step.y),rcCoverageValue(bits,4)),d=rcSample(pixel+step,rcCoverageValue(bits,16));if(a.classification==center.classification&&b.classification==center.classification&&c.classification==center.classification&&d.classification==center.classification)return rcSampleColor(center);return(rcSampleColor(a)+rcSampleColor(b)+rcSampleColor(c)+rcSampleColor(d))*.25;}
`;
