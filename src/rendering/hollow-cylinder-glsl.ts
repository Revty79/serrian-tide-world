import {NO_HIT_GLSL,SPHERE_INTERVAL_GLSL,CAPSULE_INTERVAL_GLSL,CYLINDER_INTERVAL_GLSL} from './excavation-interval-glsl.ts';
export function cylindricalExcavationGLSL(options:{readonly declarations?:string;readonly endTheta?:'theta'|'-theta';readonly unchangedHit?:string}={}){return`
${options.declarations??`uniform sampler2D oppositeSide,oppositeStart,oppositeEnd;
uniform int excavationEnabled,cutterCount,selectedInside,inspection;
uniform float innerRatio,outerHalf,innerHalf,ownRatio,oppositeRadius,oppositeLength;
uniform vec3 eyePosition;
uniform vec4 primitiveA[48],primitiveB[48];
`}${NO_HIT_GLSL}
${SPHERE_INTERVAL_GLSL}
${CAPSULE_INTERVAL_GLSL}
${CYLINDER_INTERVAL_GLSL}
vec4 cylinderCutRay(vec2 fragment){
 vec2 xy=(fragment/backingSize*viewport-.5*viewport)/scale;vec3 o,d;
 if(inspection==1){o=eyePosition;d=normalize(-cameraRight*xy.x+cameraUp*xy.y+cameraForward);}
 else{o=(cameraRight*(xy.x+translation.x)+cameraUp*(xy.y+translation.y))*ownRatio+cameraForward*(length(cameraForward.xy)+outerHalf*abs(cameraForward.z)+2.);d=-cameraForward;}
 vec2 shell=cylinderInterval(o,d,1.,outerHalf);if(shell.x>shell.y||shell.y<=0.)return vec4(0);vec2 free[49];free[0]=cylinderInterval(o,d,innerRatio,innerHalf);for(int i=0;i<48;i++){if(i>=cutterCount)break;free[i+1]=capsuleInterval(o,d,i);}
 float cursor=max(0.,shell.x);int hit=-2;for(int pass=0;pass<50;pass++){float previous=cursor;for(int i=0;i<49;i++){if(i>cutterCount)break;vec2 v=free[i];if(v.x<=cursor+1.e-7&&v.y>cursor){cursor=v.y;hit=i-1;}}if(previous==cursor)break;}
 if(cursor>=shell.y-1.e-7)return vec4(0);vec3 p=o+d*cursor;
 ${options.unchangedHit??'if(inspection==0&&hit==-2)discard; // Keep the accepted ordinary terrain pass.'}
 if(hit>=0){vec3 axis=primitiveB[hit].xyz-primitiveA[hit].xyz;float len=dot(axis,axis),t=len>1.e-14?clamp(dot(p-primitiveA[hit].xyz,axis)/len,0.,1.):0.;vec3 normal=normalize(primitiveA[hit].xyz+axis*t-p);return vec4(vec3(164,145,114)/255.*clamp(.64+.36*dot(normal,vec3(-.38,-.48,.78)),.28,1.1),1.);}
 bool inside=hit==-1,own=inside==(selectedInside==1);float ratio=inside?innerRatio:1.,halfLength=inside?innerHalf:outerHalf,radial=length(p.xy);int patchIndex=abs(abs(p.z)-halfLength)<abs(radial-ratio)?(p.z<0.?1:2):0;
 vec3 normal=(patchIndex==0?vec3(p.xy/radial,0.):vec3(0,0,patchIndex==1?-1.:1.))*(inside?-1.:1.);
 float theta=radial==0.?0.:atan(p.y,p.x),bankRadius=own?radiusMeters:oppositeRadius,bankLength=own?lengthMeters:oppositeLength,bankH=bankLength/(2.*bankRadius),z=p.z/ratio,r=radial/ratio;vec3 value;
 if(own)value=patchIndex==0?field(sideElevations,theta,r,z,true,bankH,bankRadius,bankLength):patchIndex==1?field(startElevations,theta,r,z,false,bankH,bankRadius,bankLength):field(endElevations,${options.endTheta??'-theta'},r,z,false,bankH,bankRadius,bankLength);
 else value=patchIndex==0?field(oppositeSide,theta,r,z,true,bankH,bankRadius,bankLength):patchIndex==1?field(oppositeStart,theta,r,z,false,bankH,bankRadius,bankLength):field(oppositeEnd,${options.endTheta??'-theta'},r,z,false,bankH,bankRadius,bankLength);
 return vec4(colorAt(value)*(inspection==1?1.:.74+.26*max(0.,dot(normal,cameraForward))),1.);
}
`;}
export const HOLLOW_CYLINDER_GLSL=cylindricalExcavationGLSL();
