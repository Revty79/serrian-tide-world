/** Shared analytic sphere/capsule intervals; caller supplies primitiveA/B uniforms. */
export const NO_HIT_GLSL=`vec2 noHit(){return vec2(1.e20,-1.e20);}`;
/** Conservative projected capsule bounds. Outside these bounds an orthographic
 * view must retain the accepted ordinary terrain program, including its AA. */
export const PROJECTED_CUT_GLSL=`bool projectedCutAt(vec2 p,float margin,int count){for(int i=0;i<48;i++){if(i>=count)break;vec2 a=vec2(dot(primitiveA[i].xyz,cameraRight),dot(primitiveA[i].xyz,cameraUp)),b=vec2(dot(primitiveB[i].xyz,cameraRight),dot(primitiveB[i].xyz,cameraUp)),axis=b-a;float q=dot(axis,axis),t=q>0.?clamp(dot(p-a,axis)/q,0.,1.):0.,r=primitiveA[i].w+margin;if(dot(p-a-axis*t,p-a-axis*t)<=r*r)return true;}return false;}`;
export const SPHERE_INTERVAL_GLSL=`vec2 sphereInterval(vec3 o,vec3 d,vec3 c,float r){vec3 v=o-c;float b=dot(v,d);vec3 closest=v-d*b;float q=r*r-dot(closest,closest);if(q<0.)return noHit();q=sqrt(max(0.,q));return vec2(-b-q,-b+q);}`;
export const CAPSULE_INTERVAL_GLSL=`vec2 capsuleInterval(vec3 o,vec3 d,int i){vec3 a=primitiveA[i].xyz,b=primitiveB[i].xyz,axis=b-a;float r=primitiveA[i].w,len=length(axis);vec2 ends=sphereInterval(o,d,a,r);if(len<1.e-8)return ends;vec2 other=sphereInterval(o,d,b,r);ends=vec2(min(ends.x,other.x),max(ends.y,other.y));vec3 n=axis/len,v=o-a;float dn=dot(d,n),vn=dot(v,n);vec3 pd=d-dn*n,pv=v-vn*n;float aa=dot(pd,pd),bb=dot(pd,pv),cc=dot(pv,pv)-r*r;vec2 radial=noHit();if(aa<1.e-12){if(cc<=0.)radial=vec2(-1.e20,1.e20);}else{float center=-bb/aa;vec3 closest=pv+pd*center;float delta=(r*r-dot(closest,closest))/aa;if(delta>=0.)radial=vec2(center-sqrt(delta),center+sqrt(delta));}vec2 axial=vec2(-1.e20,1.e20);if(abs(dn)<1.e-8){if(vn<0.||vn>len)axial=noHit();}else{axial=vec2(-vn,len-vn)/dn;if(axial.x>axial.y)axial=axial.yx;}vec2 tube=vec2(max(radial.x,axial.x),min(radial.y,axial.y));if(tube.x<=tube.y)ends=vec2(min(ends.x,tube.x),max(ends.y,tube.y));return ends;}`;

/** Accepted finite-cylinder interval, also used for actual annular material. */
export const CYLINDER_INTERVAL_GLSL=`vec2 cylinderInterval(vec3 o,vec3 d,float r,float halfLength){
 float a=dot(d.xy,d.xy),b=dot(o.xy,d.xy),c=dot(o.xy,o.xy)-r*r;vec2 interval=vec2(-1.e20,1.e20);
 if(a>1.e-20){float delta=b*b-a*c;if(delta<0.)return noHit();float root=sqrt(delta),q=-b-(b<0.?-root:root);vec2 roots=q==0.?vec2(-b/a):vec2(q/a,c/q);interval=vec2(min(roots.x,roots.y),max(roots.x,roots.y));}else if(c>0.)return noHit();
 if(abs(d.z)>1.e-12){vec2 z=(vec2(-halfLength,halfLength)-o.z)/d.z;interval=vec2(max(interval.x,min(z.x,z.y)),min(interval.y,max(z.x,z.y)));}else if(abs(o.z)>halfLength)return noHit();
 return interval.x<=interval.y?interval:noHit();
}`;
