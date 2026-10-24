import {terrainHermiteGrid} from './terrain-hermite.ts';
import {cylinderElevationColor,cylinderRelief,type CylinderAppearance} from './cylindrical-elevation.ts';
import type {TorusTerrain} from '../terrain/torus.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import {IndexedDisplayCache} from './indexed-display-cache.ts';
export class TorusDisplayCache extends IndexedDisplayCache<TorusTerrain>{
 values:Float32Array;private epochs:{from:number;to:number;indices:Uint32Array}[]=[];
 constructor(t:TorusTerrain){super(t,262144,'Torus display supports N128/N256.');this.values=t.copyElevations();}
 override *prepare(){this.values=this.terrain.copyElevations();if(this.terrain.revision===0&&this.values.every(v=>Object.is(v,this.values[0]))){yield* super.prepare();return;}const revision=this.terrain.revision;for(let first=0;first<this.terrain.sampleCount;first+=512){if(this.terrain.revision!==revision)throw Error('Torus changed while preparing its display.');super.refresh(Array.from({length:Math.min(512,this.terrain.sampleCount-first)},(_,i)=>first+i));yield;}}
 private record(indices:Uint32Array,from:number){for(const i of indices)this.values[i]=this.terrain.read(this.terrain.keyAt(i));this.epochs.push({from,to:this.terrain.revision,indices:indices.slice()});while(this.epochs.length>32||this.epochs.reduce((s,e)=>s+e.indices.byteLength,0)>1048576)this.epochs.shift();}
 override apply(indices:Uint32Array,colors:Uint32Array,revision:number){const from=this.sourceRevision;super.apply(indices,colors,revision);this.record(indices,from);}
 override refresh(indices:Iterable<number>){const words=Uint32Array.from(indices),from=this.sourceRevision;super.refresh(words);this.record(words,from);}
 changesSince(revision:number){if(revision===this.sourceRevision)return new Uint32Array(0);const first=this.epochs.findIndex(e=>e.from===revision);if(first<0)return;return Uint32Array.from(new Set(this.epochs.slice(first).flatMap(e=>Array.from(e.indices))));}
 get ownedArrayBufferBytes(){return this.byteLength+this.values.byteLength+this.epochs.reduce((s,e)=>s+e.indices.byteLength,0);}
 override dispose(){super.dispose();this.values=new Float32Array(0);this.epochs=[];}
}
/** Coast coverage conservatively includes the Hermite stencil so a subpixel
 * ray crossing an adjacent periodic cell receives the same coverage as GPU.
 * The accepted cylinder's harmonic-tangent tensor Hermite kernel, now with
 * canonical wrapping in BOTH directions and actual torus metric gradients. */
export function torusElevationSampler(values:Float32Array,t:TorusTerrain,light=true){const A=4*t.subdivisions,B=t.subdivisions,R=t.geometry.metadata.majorRadiusMeters,r=t.geometry.metadata.minorRadiusMeters,q=new Float64Array(16),major=new Float64Array(B);for(let row=0;row<B;row++)major[row]=A/(4*Math.PI*(R+r*Math.cos(row/B*2*Math.PI)));const index=(row:number,col:number)=>((row%B+B)%B)*A+(col%A+A)%A;
 return(p:SurfacePosition)=>{const column=(p.u/(2*Math.PI)*A%A+A)%A,row=(p.v/(2*Math.PI)*B%B+B)%B,left=Math.floor(column),top=Math.floor(row),x=column-left,y=row-top;let low=Infinity,high=-Infinity;for(let j=0;j<4;j++)for(let i=0;i<4;i++){const h=values[index(top+j-1,left+i-1)]!;q[j*4+i]=h;low=Math.min(low,h);high=Math.max(high,h);}const height=terrainHermiteGrid(q,x,y),crossesSea=low<=0&&high>0;let dx=0,dy=0;if(light&&height>0)for(let j=0;j<2;j++)for(let i=0;i<2;i++){const at=(j+1)*4+i+1,w=(j?y:1-y)*(i?x:1-x);dx+=(q[at+1]!-q[at-1]!)*major[(top+j)%B]!*w;dy+=(q[at+4]!-q[at-4]!)*B/(4*Math.PI*r)*w;}return{height,dx,dy,crossesSea};};
}
export function torusColor(field:{height:number;dx:number;dy:number},appearance:CylinderAppearance,facing=1){const c=cylinderElevationColor(field.height,0),shade=facing*(appearance==='relief'&&field.height>0?cylinderRelief(field.dx,field.dy):1);return c.map(x=>x*shade) as [number,number,number];}
