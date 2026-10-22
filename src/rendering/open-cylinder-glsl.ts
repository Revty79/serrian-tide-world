import {CYLINDRICAL_TERRAIN_FIELD_GLSL,ANNULAR_CYLINDRICAL_FIELD_GLSL,ELEVATION_COLOR_GLSL,CYLINDRICAL_TERRAIN_COLOR_GLSL} from './cylindrical-terrain-glsl.ts';
import {cylindricalExcavationGLSL} from './hollow-cylinder-glsl.ts';

export const OPEN_CYLINDER_VERTEX_SHADER=`#version 300 es
precision highp float;precision highp int;
layout(location=0) in vec4 point;
uniform vec3 cameraRight,cameraUp,cameraForward,inspectionEye;
uniform vec2 viewport,translation;
uniform float scale,depthExtent,innerRatio,ownRatio;
uniform int mode,invertedProjection;
flat out int region;
void main(){
 region=int(point.w);if(mode==3){gl_Position=vec4(point.xy,0.,1.);return;}
 if(mode==1){gl_Position=vec4((point.xy+translation)*scale*2./viewport,0.,1.);return;}
 vec3 p=point.xyz;if(invertedProjection==1)p.xy*=innerRatio*innerRatio/max(dot(p.xy,p.xy),1.e-20);p/=ownRatio;
 if(mode==2){vec3 q=p-inspectionEye;float z=dot(q,cameraForward),near=.00001,far=depthExtent;gl_Position=vec4(vec2(-dot(q,cameraRight),dot(q,cameraUp))*scale*2./viewport,(far+near)/(far-near)*z-2.*far*near/(far-near),z);return;}
 vec2 p2=vec2(dot(p,cameraRight),dot(p,cameraUp))-translation;gl_Position=vec4(p2*scale*2./viewport,-dot(p,cameraForward)/depthExtent,1.);
}`;

const openCuts=cylindricalExcavationGLSL({declarations:'',endTheta:'theta',unchangedHit:`if(inspection==0&&hit<0){float original=max(0.,shell.x);vec2 cavity=free[0];if(cavity.x<=original+1.e-7&&cavity.y>original)original=cavity.y;if(abs(cursor-original)<=1.e-7)discard;} // Preserve every unchanged actual tube surface.`});
function fragment(cut:boolean){return`#version 300 es
precision highp float;precision highp int;
uniform sampler2D sideElevations,startElevations,endElevations,oppositeSide,oppositeStart,oppositeEnd;
uniform vec3 cameraRight,cameraUp,cameraForward,inspectionEye,eyePosition;
uniform vec2 viewport,translation,backingSize;
uniform float scale,h,phase,outerRadiusMeters,innerRadiusMeters,lengthMeters,seaLevel,heightScale;
uniform float radiusMeters,oppositeRadius,oppositeLength,innerRatio,outerHalf,innerHalf,ownRatio;
uniform int mode,relief,invertedProjection,selectedInside,excavationEnabled,cutterCount,inspection;
uniform vec4 primitiveA[48],primitiveB[48];
flat in int region;out vec4 outColor;
const float PI=3.141592653589793;
${CYLINDRICAL_TERRAIN_FIELD_GLSL.replace('vec3 field(','vec3 closedCylinderField(')}
${ANNULAR_CYLINDRICAL_FIELD_GLSL}
${ELEVATION_COLOR_GLSL}
${CYLINDRICAL_TERRAIN_COLOR_GLSL}
// Keep the accepted wall field. An actual annular chart has a nonzero origin
// and a finite radial span; it never invokes the disk-center reconstruction.
vec3 field(sampler2D data,float theta,float radial,float z,bool side,float bankH,float bankRadius,float bankLength){
 if(side)return closedCylinderField(data,theta,radial,z,true,bankH,bankRadius,bankLength);
 return annularField(data,theta,radial*bankRadius,outerRadiusMeters,innerRadiusMeters,outerRadiusMeters-innerRadiusMeters);
}
vec3 wallField(bool outer,float theta,float z){
 float r=outer?outerRadiusMeters:innerRadiusMeters,bankH=lengthMeters/(2.*r);
 if(outer)return selectedInside==1?field(oppositeSide,theta,1.,z/r,true,bankH,r,lengthMeters):field(sideElevations,theta,1.,z/r,true,bankH,r,lengthMeters);
 return selectedInside==1?field(sideElevations,theta,1.,z/r,true,bankH,r,lengthMeters):field(oppositeSide,theta,1.,z/r,true,bankH,r,lengthMeters);
}
vec3 surfaceField(vec3 p){
 float theta,radial,z;
 if(mode==1){float T=outerRadiusMeters-innerRadiusMeters,S=2.*(lengthMeters+T),m=S*.5+p.y*outerRadiusMeters;theta=phase+p.x;
  if(region==0){radial=outerRadiusMeters;z=m-lengthMeters*.5;}
  else if(region==3){radial=innerRadiusMeters;z=lengthMeters-(m-lengthMeters-T)-lengthMeters*.5;}
  else if(region==2){radial=outerRadiusMeters-(m-lengthMeters);z=lengthMeters*.5;}
  else{radial=innerRadiusMeters+(m-2.*lengthMeters-T);z=-lengthMeters*.5;}
 }else{float viewRadius=outerRadiusMeters*ownRatio;theta=atan(p.y,p.x);radial=length(p.xy)*viewRadius;if(invertedProjection==1)radial=innerRadiusMeters*innerRadiusMeters/max(radial,1.e-20);z=p.z*viewRadius;}
 if(region==0||region==3)return wallField(region==0,theta,z);
 float bankH=lengthMeters/(2.*outerRadiusMeters);return region==1?field(startElevations,theta,radial/outerRadiusMeters,z/outerRadiusMeters,false,bankH,outerRadiusMeters,lengthMeters):field(endElevations,theta,radial/outerRadiusMeters,z/outerRadiusMeters,false,bankH,outerRadiusMeters,lengthMeters);
}
float displayRadius(){float r=region==0?1.:innerRatio;if(invertedProjection==1)r=innerRatio*innerRatio/r;return r/ownRatio;}
float radialNormalSign(){float sign=region==0?1.:-1.;return invertedProjection==1?-sign:sign;}
vec3 referenceAt(vec2 fragment){
 vec2 screen=(fragment/backingSize*viewport-.5*viewport)/scale;if(mode==1)return vec3(screen-translation,0.);
 if(mode==2){vec3 ray=normalize(-cameraRight*screen.x+cameraUp*screen.y+cameraForward);if(region!=0&&region!=3){float z=region==1?-h:h;return inspectionEye+ray*((z-inspectionEye.z)/ray.z);}float r=displayRadius(),a=dot(ray.xy,ray.xy),b=dot(inspectionEye.xy,ray.xy),c=dot(inspectionEye.xy,inspectionEye.xy)-r*r,root=sqrt(max(0.,b*b-a*c));float distance=b>=0.?-c/max(b+root,1.e-20):(-b+root)/max(a,1.e-20);return inspectionEye+ray*distance;}
 vec3 origin=cameraRight*(screen.x+translation.x)+cameraUp*(screen.y+translation.y);if(region!=0&&region!=3){float z=region==1?-h:h;return origin+cameraForward*((z-origin.z)/cameraForward.z);}
 float radius=displayRadius(),a=dot(cameraForward.xy,cameraForward.xy),b=dot(origin.xy,cameraForward.xy),c=dot(origin.xy,origin.xy)-radius*radius;return origin+cameraForward*((-b+radialNormalSign()*sqrt(max(0.,b*b-a*c)))/max(a,1.e-20));
}
vec3 displayNormal(vec3 p){return region==0||region==3?vec3(p.xy/max(length(p.xy),1.e-20)*radialNormalSign(),0.):vec3(0,0,region==1?-1.:1.);}
${cut?openCuts:''}
void main(){
 ${cut?'if(excavationEnabled==1){outColor=cylinderCutRay(gl_FragCoord.xy);return;}':''}
 vec3 p=referenceAt(gl_FragCoord.xy),value=surfaceField(p),rgb=colorAt(value);
 // Same accepted geographical quadrature; the large CSG kernel is evaluated
 // once only, never expanded into four terrain-antialiasing ray programs.
 if(abs(value.x-seaLevel/heightScale)<fwidth(value.x)){
  vec3 a=surfaceField(referenceAt(gl_FragCoord.xy+vec2(-.25,-.25))),b=surfaceField(referenceAt(gl_FragCoord.xy+vec2(.25,-.25))),c=surfaceField(referenceAt(gl_FragCoord.xy+vec2(-.25,.25))),d=surfaceField(referenceAt(gl_FragCoord.xy+vec2(.25,.25)));
  if(any(notEqual(greaterThan(vec4(a.x,b.x,c.x,d.x),vec4(seaLevel/heightScale)),bvec4(value.x>seaLevel/heightScale))))rgb=(colorAt(a)+colorAt(b)+colorAt(c)+colorAt(d))*.25;
 }
 float shade=mode==1||mode==2?1.:.74+.26*max(0.,dot(displayNormal(p),cameraForward));outColor=vec4(rgb*shade,1.);
}`;}
export const OPEN_CYLINDER_BASE_FRAGMENT_SHADER=fragment(false);
export const OPEN_CYLINDER_CUT_FRAGMENT_SHADER=fragment(true);
