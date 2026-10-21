/** Geometry-only analytic difference adapter. No terrain/input/history authority. */
export const HOLLOW_CUBE_GLSL=`
uniform sampler2DArray oppositeElevations;
uniform int excavationEnabled,primitiveCount,perspectiveEye;
uniform float innerRatio,eyeFov;
uniform vec3 eyePosition;
uniform vec4 primitiveA[48],primitiveB[48];
vec2 noHit(){return vec2(1.e20,-1.e20);}
vec2 boxInterval(vec3 o,vec3 d,float h){float lo=-1.e20,hi=1.e20;for(int k=0;k<3;k++){if(abs(d[k])<1.e-8){if(abs(o[k])>h)return noHit();}else{vec2 t=vec2(-h-o[k],h-o[k])/d[k];lo=max(lo,min(t.x,t.y));hi=min(hi,max(t.x,t.y));}}return vec2(lo,hi);}
vec2 sphereInterval(vec3 o,vec3 d,vec3 c,float r){vec3 v=o-c;float b=dot(v,d),q=b*b-dot(v,v)+r*r;if(q<0.)return noHit();q=sqrt(max(0.,q));return vec2(-b-q,-b+q);}
vec2 capsuleInterval(vec3 o,vec3 d,int i){vec3 a=primitiveA[i].xyz,b=primitiveB[i].xyz,axis=b-a;float r=primitiveA[i].w,len=length(axis);vec2 ends=sphereInterval(o,d,a,r);if(len<1.e-8)return ends;vec2 other=sphereInterval(o,d,b,r);ends=vec2(min(ends.x,other.x),max(ends.y,other.y));vec3 n=axis/len,v=o-a;float dn=dot(d,n),vn=dot(v,n);vec3 pd=d-dn*n,pv=v-vn*n;float aa=dot(pd,pd),bb=dot(pd,pv),cc=dot(pv,pv)-r*r;vec2 radial=noHit();if(aa<1.e-8){if(cc<=0.)radial=vec2(-1.e20,1.e20);}else{float det=bb*bb-aa*cc;if(det>=0.)radial=vec2(-bb-sqrt(det),-bb+sqrt(det))/aa;}vec2 axial=vec2(-1.e20,1.e20);if(abs(dn)<1.e-8){if(vn<0.||vn>len)axial=noHit();}else{axial=vec2(-vn,len-vn)/dn;if(axial.x>axial.y)axial=axial.yx;}vec2 tube=vec2(max(radial.x,axial.x),min(radial.y,axial.y));if(tube.x<=tube.y)ends=vec2(min(ends.x,tube.x),max(ends.y,tube.y));return ends;}
vec3 otherFieldAt(int face,vec2 uv){int n=textureSize(oppositeElevations,0).x-1;vec2 q=clamp((uv+1.)*.5,0.,1.)*float(n);ivec2 p=min(ivec2(floor(q)),ivec2(n-1));vec2 f=q-vec2(p);return mix(mix(texelFetch(oppositeElevations,ivec3(p,face),0).xyz,texelFetch(oppositeElevations,ivec3(p+ivec2(1,0),face),0).xyz,f.x),mix(texelFetch(oppositeElevations,ivec3(p+ivec2(0,1),face),0).xyz,texelFetch(oppositeElevations,ivec3(p+ivec2(1,1),face),0).xyz,f.x),f.y);}
vec4 hollowRay(vec2 pixel){vec2 screen=pixel/backingSize*viewport;vec3 o,d;
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
