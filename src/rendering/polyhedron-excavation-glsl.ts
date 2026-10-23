import {NO_HIT_GLSL,SPHERE_INTERVAL_GLSL,CAPSULE_INTERVAL_GLSL,PROJECTED_CUT_GLSL} from './excavation-interval-glsl.ts';
/** Existing capsule intervals and accepted cube palette/slope shading. Convex
 * plane clipping is the only new material-boundary intersection mathematics. */
export function polyhedronExcavationGLSL(count:number,coloring:string){const materialColor=coloring.replaceAll('colorAtOrientation','materialColorAtOrientation').replaceAll('colorAt(','materialColorAt(').replaceAll('normals[face]','bodyNormals[face]').replaceAll('us[face]','bodyUs[face]').replaceAll('vs[face]','bodyVs[face]');return`
uniform sampler2DArray materialElevations;
uniform int sceneEnabled,hasCavity,primitiveCount;uniform vec4 primitiveA[48],primitiveB[48];
uniform vec3 bodyNormals[${2*count}],bodyOrigins[${2*count}],bodyDualU[${2*count}],bodyDualV[${2*count}],bodyUs[${2*count}],bodyVs[${2*count}];
${NO_HIT_GLSL}${SPHERE_INTERVAL_GLSL}${CAPSULE_INTERVAL_GLSL}${PROJECTED_CUT_GLSL}
${materialColor}
vec4 convexInterval(vec3 o,vec3 d,int bank){float lo=-1.e20,hi=1.e20;int enter=-1,leave=-1;for(int j=0;j<${count};j++){int i=bank*${count}+j;float den=dot(bodyNormals[i],d),gap=dot(bodyNormals[i],bodyOrigins[i]-o);if(abs(den)<1.e-7){if(gap<0.)return vec4(1.e20,-1.e20,-1,-1);continue;}float t=gap/den;if(den<0.){if(t>lo){lo=t;enter=i;}}else if(t<hi){hi=t;leave=i;}}return vec4(lo,hi,float(enter),float(leave));}
vec3 materialFieldAt(int face,vec2 uv){int n=textureSize(materialElevations,0).x-1;vec2 q=clamp(uv,0.,1.)*float(n);ivec2 p=min(ivec2(floor(q)),ivec2(n-1));vec2 f=q-vec2(p);vec3 a=texelFetch(materialElevations,ivec3(p,face),0).xyz,b=texelFetch(materialElevations,ivec3(p+ivec2(1,0),face),0).xyz,c=texelFetch(materialElevations,ivec3(p+ivec2(0,1),face),0).xyz;if(triangles[face%${count}]==1&&p.x+p.y>=n-1)return a*(1.-f.x-f.y)+b*f.x+c*f.y;return mix(mix(a,b,f.x),mix(c,texelFetch(materialElevations,ivec3(p+ivec2(1,1),face),0).xyz,f.x),f.y);}
bool hasProjectedCut(vec2 pixel){if(sceneEnabled!=1)return false;if(inspection==1)return true;vec2 s=(pixel/backingSize*viewport-viewCenter)/scale;return projectedCutAt(s+vec2(dot(target,cameraRight),dot(target,cameraUp)),2./scale,primitiveCount);}
vec4 cutRay(vec2 pixel){vec2 s=(pixel/backingSize*viewport-viewCenter)/scale;vec3 o=inspection==1?eye:target+cameraRight*s.x+cameraUp*s.y+cameraForward*(8.+length(target)),d=inspection==1?normalize(-cameraForward-cameraRight*s.x+cameraUp*s.y):-cameraForward;vec4 outer=convexInterval(o,d,0);if(outer.x>outer.y||outer.y<=0.)return vec4(0);vec4 inner=hasCavity==1?convexInterval(o,d,1):vec4(1.e20,-1.e20,-1,-1);
 vec2 intervals[49];int labels[49];int n=0;if(hasCavity==1&&inner.x<=inner.y){intervals[n]=inner.xy;labels[n++]=-1;}for(int i=0;i<48;i++){if(i>=primitiveCount)break;vec2 v=capsuleInterval(o,d,i);if(v.x<=v.y){intervals[n]=v;labels[n++]=i;}}
 // Same sorted free-interval union used by the CPU CSG. This bounded work is
 // restricted to conservative projected cut pixels in an editing overview.
 for(int i=1;i<49;i++){if(i>=n)break;vec2 v=intervals[i];int label=labels[i],j=i;for(int k=0;k<49;k++){if(j<=0||intervals[j-1].x<=v.x)break;intervals[j]=intervals[j-1];labels[j]=labels[j-1];j--;}intervals[j]=v;labels[j]=label;}
 float cursor=max(0.,outer.x);int which=-2;for(int i=0;i<49;i++){if(i>=n||intervals[i].x>cursor+1.e-7)break;if(intervals[i].y>cursor){cursor=intervals[i].y;which=labels[i];}}if(cursor>=outer.y-1.e-7||which==-2&&outer.x< -1.e-7)return vec4(0);if(which==-2&&inspection==0)return vec4(0,0,0,-1);vec3 point=o+d*cursor;
 if(which>=0){vec3 a=primitiveA[which].xyz,axis=primitiveB[which].xyz-a;float len=dot(axis,axis),t=len>0.?clamp(dot(point-a,axis)/len,0.,1.):0.;vec3 normal=normalize(a+axis*t-point);float shade=clamp(.64+.36*dot(normal,vec3(-.38,-.48,.78)),.28,1.1);return vec4(vec3(164,145,114)/255.*shade,1.);}
 int face=int(which==-1?inner.w:outer.z);if(face<0)return vec4(0);vec3 delta=point-bodyOrigins[face];vec2 uv=vec2(dot(delta,bodyDualU[face]),dot(delta,bodyDualV[face]));return vec4(materialColorAtOrientation(face,materialFieldAt(face,uv),face<${count}?1.:-1.),1.);
}`;}
