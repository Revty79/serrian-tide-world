/** Only physical inversion/normals change. field(), color(), and the palette are shared. */
export const CRESCENT_CUT_GLOBE_GLSL=`
uniform int foldEnabled,foldRegion;
uniform vec3 foldAxis;
uniform float foldSeparation;
vec3 foldDirection(int face,vec2 uv){vec2 t=tan(uv);return normalize(face==0?vec3(1.,t.x,t.y):face==1?vec3(-1.,-t.x,t.y):face==2?vec3(-t.x,1.,t.y):face==3?vec3(t.x,-1.,t.y):face==4?vec3(t.x,t.y,1.):vec3(t.x,-t.y,-1.));}
bool foldHit(vec2 pixel,out vec4 value,out float depth,out int classification){
 value=vec4(0.);depth=1.;classification=0;vec3 p;bool cut=false;int face;vec2 uv;
 if(mode==0){vec2 xy=(pixel-viewport*.5)/globeRadius;xy.y=-xy.y;vec3 plane=cameraRight*xy.x+cameraUp*xy.y;float outerDisc=1.-dot(xy,xy);if(outerDisc<0.)return false;float outerRoot=sqrt(outerDisc),z=outerRoot;
  // A ray meets material iff at least one A endpoint is outside B. On A,
  // outside B is exactly axis.point <= d/2. Compare the squared projected
  // predicate rather than subtracting two almost equal sphere roots at the
  // silhouette. This is the same solid interval difference without its loss
  // of significant digits; no epsilon expands the material boundary.
  vec2 projectedAxis=vec2(dot(foldAxis,cameraRight),dot(foldAxis,cameraUp));float facing=dot(foldAxis,cameraForward),side=dot(projectedAxis,xy)-foldSeparation*.5,predicate=facing*facing*outerDisc-side*side;
  if(side>0.&&predicate<0.)return false;
  cut=facing>0.&&!(side<=0.&&predicate<=0.);
  if(cut){vec2 shifted=xy-foldSeparation*projectedAxis;z=foldSeparation*facing-sqrt(max(0.,1.-dot(shifted,shifted)));}
  vec3 q=plane+cameraForward*z;
  vec3 normal=cut?foldSeparation*foldAxis-q:q;depth=max(0.,dot(normal,cameraForward));if(cut){vec2 shifted=xy-foldSeparation*vec2(dot(foldAxis,cameraRight),dot(foldAxis,cameraUp));vec3 r=cameraRight-2.*dot(cameraRight,foldAxis)*foldAxis,uvec=cameraUp-2.*dot(cameraUp,foldAxis)*foldAxis,f= -cameraForward+2.*dot(cameraForward,foldAxis)*foldAxis;p=normalize(r*shifted.x+uvec*shifted.y+f*sqrt(max(0.,1.-dot(shifted,shifted))));}else p=normalize(q);vec3 a=abs(p);float n,u,v;
  if(a.x>=a.y&&a.x>=a.z){face=p.x>=0.?0:1;n=a.x;u=p.x>=0.?p.y:-p.y;v=p.z;}else if(a.y>=a.z){face=p.y>=0.?2:3;n=a.y;u=p.y>=0.?-p.x:p.x;v=p.z;}else{face=p.z>=0.?4:5;n=a.z;u=p.x;v=p.z>=0.?p.y:-p.y;}uv=atan(vec2(u,v)/n);
 }else{vec2 grid=(pixel-viewport*.5)/faceSize+vec2(2.,1.5)-pan;ivec2 slot=ivec2(floor(grid));vec2 st=fract(grid);face=-1;if(slot.y==1){if(slot.x==0)face=3;else if(slot.x==1)face=0;else if(slot.x==2)face=2;else if(slot.x==3)face=1;}else if(slot.x==1&&slot.y==0)face=4;else if(slot.x==1&&slot.y==2)face=5;if(face<0)return false;uv=face==4?(2.*st.yx-1.)*Q:face==5?(1.-2.*st.yx)*Q:vec2(2.*st.x-1.,1.-2.*st.y)*Q;p=foldDirection(face,uv);cut=dot(p,foldAxis)>foldSeparation*.5;if(foldRegion!=0&&(cut?2:1)!=foldRegion)return false;}
 value=field(face,uv);if(cut)value.yzw-=2.*dot(value.yzw,foldAxis)*foldAxis;classification=(cut?4:2)+(value.x>0.?1:0);return true;
}
vec4 foldShade(vec2 pixel,out int classification){vec4 v;float depth;if(!foldHit(pixel,v,depth,classification))return vec4(0.);return vec4(color(v,depth),1.);}
vec4 foldPixel(vec2 pixel){vec4 v;float depth;int classification;bool found=foldHit(pixel,v,depth,classification);vec4 center=found?vec4(color(v,depth),1.):vec4(0.);
 // Discrete derivative quads can miss a silhouette between their centers.
 // Evaluate all four real quarter rays; preserve the center if their material
 // classes agree, so ordinary relief and ramps receive no spatial blur.
 vec2 step=viewport/backingSize*.25;int a,b,c,d;vec4 sum=foldShade(pixel+vec2(-step.x,-step.y),a)+foldShade(pixel+vec2(step.x,-step.y),b)+foldShade(pixel+vec2(-step.x,step.y),c)+foldShade(pixel+step,d);if(a!=classification||b!=classification||c!=classification||d!=classification)return sum*.25;
 return center;
}
`;
