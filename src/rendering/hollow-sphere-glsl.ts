import {NO_HIT_GLSL,SPHERE_INTERVAL_GLSL,CAPSULE_INTERVAL_GLSL,PROJECTED_CUT_GLSL} from './excavation-interval-glsl.ts';
/** Reference spherical shell subtraction. Uses the same capsule cutting math as
 * the cube; spherical intervals, normals and chart lookup are shape-specific. */
export const HOLLOW_SPHERE_GLSL=`
uniform highp sampler2DArray oppositeElevations;
uniform int excavationEnabled,cutterCount,selectedInside;
uniform float innerRatio;
uniform vec3 eyePosition;
uniform vec4 primitiveA[48],primitiveB[48];
${NO_HIT_GLSL}
${SPHERE_INTERVAL_GLSL}
${CAPSULE_INTERVAL_GLSL}
${PROJECTED_CUT_GLSL}
bool sphereCutAffects(vec2 pixel){if(interior==1)return true;vec2 xy=(pixel-viewport*.5)/globeRadius;xy.y=-xy.y;return projectedCutAt(xy,2./globeRadius,cutterCount);}
vec4 sphereCutField(vec3 p,int kind){
 vec3 a=abs(p);int face;float normal,u,v;
 if(a.x>=a.y&&a.x>=a.z){face=p.x>=0.?0:1;normal=a.x;u=p.x>=0.?p.y:-p.y;v=p.z;}else if(a.y>=a.z){face=p.y>=0.?2:3;normal=a.y;u=p.y>=0.?-p.x:p.x;v=p.z;}else{face=p.z>=0.?4:5;normal=a.z;u=p.x;v=p.z>=0.?p.y:-p.y;}
 vec2 angles=atan(vec2(u,v)/normal);bool own=(kind==1)==(selectedInside==1);if(own)return field(face,angles);
 int n=textureSize(oppositeElevations,0).x-1;vec2 q=clamp((angles/Q+1.)*float(n)*.5,0.,float(n));ivec2 cell=ivec2(min(floor(q),vec2(n-1)));vec2 f=q-vec2(cell);
 vec4 v0=texelFetch(oppositeElevations,ivec3(cell,face),0),v1=texelFetch(oppositeElevations,ivec3(cell+ivec2(1,0),face),0),v2=texelFetch(oppositeElevations,ivec3(cell+ivec2(0,1),face),0),v3=texelFetch(oppositeElevations,ivec3(cell+ivec2(1,1),face),0);vec4 value=mix(mix(v0,v1,f.x),mix(v2,v3,f.x),f.y);value.x/=heightScale;return value;
}
vec4 sphereCutRay(vec2 pixel){
 vec2 xy=(pixel-viewport*.5)/globeRadius;xy.y=-xy.y;vec3 o,d;
 if(interior==1){o=eyePosition;d=normalize(-cameraRight*xy.x+cameraUp*xy.y+cameraForward);}
 else{o=cameraRight*xy.x+cameraUp*xy.y+cameraForward*4.;d=-cameraForward;}
 vec2 shell=sphereInterval(o,d,vec3(0),1.);if(shell.x>shell.y||shell.y<=0.)return vec4(0);vec2 free[49];free[0]=sphereInterval(o,d,vec3(0),innerRatio);for(int i=0;i<48;i++){if(i>=cutterCount)break;free[i+1]=capsuleInterval(o,d,i);}
 float cursor=max(0.,shell.x);int hit=-2;
 for(int pass=0;pass<50;pass++){float previous=cursor;for(int i=0;i<49;i++){if(i>cutterCount)break;vec2 h=free[i];if(h.x<=cursor+1.e-7&&h.y>cursor){cursor=h.y;hit=i-1;}}if(previous==cursor)break;}
 if(cursor>=shell.y-1.e-7)return vec4(0);vec3 p=o+d*cursor;
 if(hit>=0){vec3 axis=primitiveB[hit].xyz-primitiveA[hit].xyz;float len=dot(axis,axis),t=len>1.e-14?clamp(dot(p-primitiveA[hit].xyz,axis)/len,0.,1.):0.;vec3 normal=normalize(primitiveA[hit].xyz+axis*t-p);return vec4(vec3(164,145,114)/255.*clamp(.64+.36*dot(normal,vec3(-.38,-.48,.78)),.28,1.1),1.);}
 int kind=hit==-1?1:0;vec3 normal=normalize(p)*(kind==1?-1.:1.);return vec4(color(sphereCutField(p,kind),max(0.,dot(normal,cameraForward)))*(kind==1&&interior==0?.75:1.),1.);
}
`;
