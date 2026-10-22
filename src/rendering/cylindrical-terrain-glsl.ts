/** Accepted cylinder terrain reconstruction, palette and relief. Geometry shaders
 * supply only physical sample coordinates; closed shader arithmetic is preserved. */
export const CYLINDRICAL_TERRAIN_FIELD_GLSL=`float sampleAt(sampler2D data,int row,int col){ivec2 s=textureSize(data,0);return texelFetch(data,ivec2((col%s.x+s.x)%s.x,clamp(row,0,s.y-1)),0).r;}
float tangent(float a,float b,float c){float u=b-a,v=c-b;return ((u>0.&&v>0.)||(u<0.&&v<0.))?2.*u*(v/(u+v)):0.;}
float curve(vec4 v,float t){float m=tangent(v.x,v.y,v.z),n=tangent(v.y,v.z,v.w),q=3.*(v.z-v.y)-2.*m-n,r=2.*(v.y-v.z)+m+n;return v.y+t*(m+t*(q+t*r));}
vec4 rowAt(sampler2D data,int row,int col){return vec4(sampleAt(data,row,col-1),sampleAt(data,row,col),sampleAt(data,row,col+1),sampleAt(data,row,col+2));}
vec2 capGradient(sampler2D data,float angular,float vertical,float row,float col,vec2 s,float radiusMeters){
 if(row==0.)return vec2(sampleAt(data,1,0)-sampleAt(data,1,int(s.x)/2),sampleAt(data,1,int(s.x)/4)-sampleAt(data,1,int(s.x)*3/4))*(s.y-1.)/(2.*radiusMeters);
 float theta=col/s.x*2.*PI,dr=vertical*(s.y-1.)/radiusMeters,dt=angular*(s.y-1.)/row;
 return vec2(cos(theta)*dr-sin(theta)*dt,sin(theta)*dr+cos(theta)*dt);
}
vec4 gradients(sampler2D data,vec4 prev,vec4 here,vec4 next,int row,int col,vec2 s,bool side,float radiusMeters,float lengthMeters){
 vec2 angular=vec2(here.z-here.x,here.w-here.y)*s.x/(4.*PI*radiusMeters),vertical=(next.yz-prev.yz)/((row==0||row==int(s.y)-1)?1.:2.);
 if(side)return vec4(angular.x,vertical.x*(s.y-1.)/lengthMeters,angular.y,vertical.y*(s.y-1.)/lengthMeters);
 return vec4(capGradient(data,angular.x,vertical.x,float(row),float(col),s,radiusMeters),capGradient(data,angular.y,vertical.y,float(row),float(col+1),s,radiusMeters));
}
vec3 field(sampler2D data,float theta,float radial,float z,bool side,float h,float radiusMeters,float lengthMeters){
 vec2 s=vec2(textureSize(data,0));
 float column=mod(theta/(2.*PI)*s.x,s.x),row=clamp(side?(z+h)/(2.*h)*(s.y-1.):radial*(s.y-1.),0.,s.y-1.);
 int col=int(floor(column)),r=int(min(floor(row),s.y-2.));float x=fract(column),y=row-float(r);
 vec4 q0=rowAt(data,r-1,col),q1=rowAt(data,r,col),q2=rowAt(data,r+1,col),q3=rowAt(data,r+2,col);
 float height=curve(vec4(curve(q0,x),curve(q1,x),curve(q2,x),curve(q3,x)),y);
 if(relief==0||height<=seaLevel/heightScale)return vec3(height,0.,0.);
 vec4 g0=gradients(data,q0,q1,q2,r,col,s,side,radiusMeters,lengthMeters),g1=gradients(data,q1,q2,q3,r+1,col,s,side,radiusMeters,lengthMeters);
 vec2 gradient=mix(mix(g0.xy,g0.zw,x),mix(g1.xy,g1.zw,x),y);
 return vec3(height,gradient);
}`;
export const ELEVATION_COLOR_GLSL=`vec3 elevationColor(float normalized){
 float relative=clamp(normalized,-1.,1.)*heightScale;
 vec3 water=mix(vec3(37.,111.,143.),vec3(12.,45.,72.),clamp(-relative/1000.,0.,1.));
 vec3 land=relative<=2000.?mix(vec3(109.,149.,88.),vec3(183.,160.,121.),clamp(relative/2000.,0.,1.)):mix(vec3(183.,160.,121.),vec3(235.,234.,224.),clamp((relative-2000.)/3000.,0.,1.));
 return (normalized>0.?land:water)/255.;
}`;
export const CYLINDRICAL_TERRAIN_COLOR_GLSL=`vec3 colorAt(vec3 value){
 vec3 rgb=elevationColor(value.x-seaLevel/heightScale);
 if(relief==1&&value.x>seaLevel/heightScale){vec2 g=clamp(value.yz,vec2(-1e6/heightScale),vec2(1e6/heightScale))*heightScale*5.;float light=clamp((1.+.6*g.x-.6*g.y)/length(vec3(g,1.)),.55,1.25);rgb*=light;}
 return rgb;
}`;

/** Annular coordinates extend the same accepted Hermite/finite-difference
 * field. The inner radius is physical material, never a collapsed cap center. */
export const ANNULAR_CYLINDRICAL_FIELD_GLSL=`
vec4 annularGradients(sampler2D data,vec4 prev,vec4 here,vec4 next,int row,int col,vec2 s,float outerRadius,float innerRadius,float span){
 vec2 angular=vec2(here.z-here.x,here.w-here.y)*s.x/(4.*PI*outerRadius),vertical=(next.yz-prev.yz)/((row==0||row==int(s.y)-1)?1.:2.);
 float radius=innerRadius+span*float(row)/(s.y-1.),a=float(col)/s.x*2.*PI,b=float(col+1)/s.x*2.*PI;
 vec2 dr=vertical*(s.y-1.)/span,dt=angular*outerRadius/radius;
 return vec4(cos(a)*dr.x-sin(a)*dt.x,sin(a)*dr.x+cos(a)*dt.x,cos(b)*dr.y-sin(b)*dt.y,sin(b)*dr.y+cos(b)*dt.y);
}
vec3 annularField(sampler2D data,float theta,float radialMeters,float outerRadius,float innerRadius,float span){
 vec2 s=vec2(textureSize(data,0));float column=mod(theta/(2.*PI)*s.x,s.x),row=clamp((radialMeters-innerRadius)/span*(s.y-1.),0.,s.y-1.);
 int col=int(floor(column)),r=int(min(floor(row),s.y-2.));float x=fract(column),y=row-float(r);
 vec4 q0=rowAt(data,r-1,col),q1=rowAt(data,r,col),q2=rowAt(data,r+1,col),q3=rowAt(data,r+2,col);
 float height=curve(vec4(curve(q0,x),curve(q1,x),curve(q2,x),curve(q3,x)),y);
 if(relief==0||height<=seaLevel/heightScale)return vec3(height,0.,0.);
 vec4 g0=annularGradients(data,q0,q1,q2,r,col,s,outerRadius,innerRadius,span),g1=annularGradients(data,q1,q2,q3,r+1,col,s,outerRadius,innerRadius,span);
 vec2 gradient=mix(mix(g0.xy,g0.zw,x),mix(g1.xy,g1.zw,x),y);return vec3(height,gradient);
}
`;
