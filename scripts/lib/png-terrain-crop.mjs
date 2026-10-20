import assert from'node:assert/strict';import{inflateSync}from'node:zlib';import{createHash}from'node:crypto';
/** Decode actual compositor PNG bytes; ignore encoded compression differences. */
export function terrainCrop(base64,focus={x:.5,y:.5}){
 const png=Buffer.from(base64,'base64'),parts=[];let w,h,c;
 for(let i=8;i<png.length;){const n=png.readUInt32BE(i),t=png.toString('ascii',i+4,i+8),d=png.subarray(i+8,i+8+n);if(t==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);assert.equal(d[8],8);assert.ok(d[9]===6||d[9]===2);c=d[9]===6?4:3;}if(t==='IDAT')parts.push(d);i+=n+12;}
 const raw=inflateSync(Buffer.concat(parts)),s=w*c,p=Buffer.alloc(s*h);let a=0;
 const paeth=(x,y,z)=>{const q=x+y-z,dx=Math.abs(q-x),dy=Math.abs(q-y),dz=Math.abs(q-z);return dx<=dy&&dx<=dz?x:dy<=dz?y:z;};
 for(let y=0;y<h;y++){const f=raw[a++];for(let x=0;x<s;x++){const l=x>=c?p[y*s+x-c]:0,u=y?p[(y-1)*s+x]:0,z=y&&x>=c?p[(y-1)*s+x-c]:0;p[y*s+x]=(raw[a++]+(f===1?l:f===2?u:f===3?Math.floor((l+u)/2):f===4?paeth(l,u,z):0))&255;}}
 const bits=[];for(let y=Math.max(0,Math.floor(h*(focus.y-.06)));y<Math.min(h,Math.floor(h*(focus.y+.06)));y++)bits.push(p.subarray(y*s+Math.max(0,Math.floor(w*(focus.x-.06)))*c,y*s+Math.min(w,Math.floor(w*(focus.x+.06)))*c));
 return createHash('sha256').update(Buffer.concat(bits)).digest('hex');
}
