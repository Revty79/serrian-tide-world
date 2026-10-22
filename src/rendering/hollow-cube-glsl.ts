import {NO_HIT_GLSL,SPHERE_INTERVAL_GLSL,CAPSULE_INTERVAL_GLSL,PROJECTED_CUT_GLSL} from './excavation-interval-glsl.ts';
/** Geometry-only analytic difference adapter. No terrain/input/history authority. */
export const HOLLOW_CUBE_GLSL=`
uniform sampler2DArray oppositeElevations;
uniform int excavationEnabled,primitiveCount,perspectiveEye;
uniform float innerRatio,eyeFov;
uniform vec3 eyePosition;
uniform vec4 primitiveA[48],primitiveB[48];
${NO_HIT_GLSL}
vec2 boxInterval(vec3 o,vec3 d,float h){float lo=-1.e20,hi=1.e20;for(int k=0;k<3;k++){if(abs(d[k])<1.e-8){if(abs(o[k])>h)return noHit();}else{vec2 t=vec2(-h-o[k],h-o[k])/d[k];lo=max(lo,min(t.x,t.y));hi=min(hi,max(t.x,t.y));}}return vec2(lo,hi);}
${SPHERE_INTERVAL_GLSL}
${CAPSULE_INTERVAL_GLSL}
${PROJECTED_CUT_GLSL}
vec4 ray(vec2 pixel);
vec3 otherFieldAt(int face,vec2 uv){int n=textureSize(oppositeElevations,0).x-1;vec2 q=clamp((uv+1.)*.5,0.,1.)*float(n);ivec2 p=min(ivec2(floor(q)),ivec2(n-1));vec2 f=q-vec2(p);return mix(mix(texelFetch(oppositeElevations,ivec3(p,face),0).xyz,texelFetch(oppositeElevations,ivec3(p+ivec2(1,0),face),0).xyz,f.x),mix(texelFetch(oppositeElevations,ivec3(p+ivec2(0,1),face),0).xyz,texelFetch(oppositeElevations,ivec3(p+ivec2(1,1),face),0).xyz,f.x),f.y);}
vec4 hollowRay(vec2 pixel){vec2 screen=pixel/backingSize*viewport;vec3 o,d;
 if(perspectiveEye==0&&orientation>0.&&!projectedCutAt((screen-viewCenter)/scale,3./scale,primitiveCount))return(ray(pixel+vec2(-.25,-.25))+ray(pixel+vec2(.25,-.25))+ray(pixel+vec2(-.25,.25))+ray(pixel+vec2(.25,.25)))*.25;
 if(perspectiveEye==1){o=eyePosition;vec2 xy=(screen-viewport*.5)/(viewport.y*.5)*tan(eyeFov*.5);d=normalize(-cameraForward+cameraRight*xy.x+cameraUp*xy.y);}
 else{vec2 s=(screen-viewCenter)/scale;o=cameraRight*s.x+cameraUp*s.y+cameraForward*4.;d=-cameraForward;}
 vec2 shell=boxInterval(o,d,1.);if(shell.x>shell.y||shell.y<=0.)return vec4(0);vec2 holes[49];holes[0]=boxInterval(o,d,innerRatio);for(int i=0;i<48;i++){if(i>=primitiveCount)break;holes[i+1]=capsuleInterval(o,d,i);}
 float cursor=max(0.,shell.x);int hit=-2;if(orientation<0.&&perspectiveEye==0){if(holes[0].x>holes[0].y||holes[0].y<cursor)return vec4(0);cursor=holes[0].y;hit=-1;}
 for(int pass=0;pass<50;pass++){float previous=cursor;for(int i=0;i<49;i++){if(i>primitiveCount)break;vec2 h=holes[i];if(h.x<=cursor+1.e-7&&h.y>cursor){cursor=h.y;hit=i-1;}}if(cursor==previous)break;}
 if(cursor>=shell.y-1.e-7)return vec4(0);vec3 p=o+d*cursor,normal;int face=0;float signN=hit==-1?-1.:1.;
 if(hit>=0){vec3 a=primitiveA[hit].xyz,axis=primitiveB[hit].xyz-a;float len=dot(axis,axis),t=len>1.e-14?clamp(dot(p-a,axis)/len,0.,1.):0.;normal=normalize(a+axis*t-p);float shade=clamp(.64+.36*dot(normal,vec3(-.38,-.48,.78)),.28,1.1);return vec4(vec3(164,145,114)/255.*shade,1.);}
 float h=hit==-1?innerRatio:1.;vec3 error=abs(abs(p)-h);int axis=error.y<error.x?1:0;if(error.z<error[axis])axis=2;vec3 n=vec3(0);n[axis]=sign(p[axis]);for(int i=0;i<6;i++)if(dot(n,normals[i])>.9)face=i;vec2 uv=vec2(dot(p,us[face]),dot(p,vs[face]))/h;vec3 value=orientation==signN?fieldAt(face,uv):otherFieldAt(face,uv);return vec4(colorAtOrientation(face,value,signN)*(hit==-1?.75:1.),1.);
}
`;
