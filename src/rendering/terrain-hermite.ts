/** Accepted cylinder shape-preserving reconstruction. Keep the unrolled
 * Float64 hot path shared; geometry adapters supply the actual 4x4 samples. */
export function terrainHermiteTangent(a:number,b:number,c:number){const u=b-a,v=c-b;return u>0&&v>0||u<0&&v<0?2*u*(v/(u+v)):0;}
export function terrainHermiteCubic(a:number,b:number,c:number,d:number,t:number){const m=terrainHermiteTangent(a,b,c),n=terrainHermiteTangent(b,c,d),q=3*(c-b)-2*m-n,r=2*(b-c)+m+n;return b+t*(m+t*(q+t*r));}
export function terrainHermiteGrid(q:Float64Array,x:number,y:number){return terrainHermiteCubic(terrainHermiteCubic(q[0]!,q[1]!,q[2]!,q[3]!,x),terrainHermiteCubic(q[4]!,q[5]!,q[6]!,q[7]!,x),terrainHermiteCubic(q[8]!,q[9]!,q[10]!,q[11]!,x),terrainHermiteCubic(q[12]!,q[13]!,q[14]!,q[15]!,x),y);}
