export interface PhysicalRaySample{readonly kind:number;readonly u:number;readonly v:number;readonly shade:number}
export const PHYSICAL_RAY_CACHE_SAMPLES=100000;
/** Derived geometry only, following the accepted Cube's kind/UV/shade cache.
 * Float64 coordinates retain exact query results. Terrain colors/revisions are
 * deliberately absent: painting recolors the cached physical intersections.
 * One current pose, a fixed sample cap, no canonical or history ownership. */
export class PhysicalRayCache{
 private epoch='';private closed=false;private slots=new Map<number,number>();private used=0;private kinds:Int16Array;private us:Float64Array;private vs:Float64Array;private shades:Float64Array;
 readonly capacity:number;hits=0;misses=0;
 constructor(capacity=PHYSICAL_RAY_CACHE_SAMPLES){if(!Number.isSafeInteger(capacity)||capacity<1||capacity>PHYSICAL_RAY_CACHE_SAMPLES)throw RangeError('Physical ray cache capacity may only lower its fixed display limit.');this.capacity=capacity;this.kinds=new Int16Array(capacity);this.us=new Float64Array(capacity);this.vs=new Float64Array(capacity);this.shades=new Float64Array(capacity);}
 get samples(){return this.used;}get byteLength(){return this.kinds.byteLength+this.us.byteLength+this.vs.byteLength+this.shades.byteLength;}
 begin(epoch:string){if(this.closed)throw Error('Physical display cache is closed.');if(this.epoch===epoch)return;this.epoch=epoch;this.slots.clear();this.used=0;this.hits=this.misses=0;}
 resolve(key:number,query:()=>PhysicalRaySample):PhysicalRaySample{if(this.closed)throw Error('Physical display cache is closed.');const old=this.slots.get(key);if(old!==undefined){this.hits++;return{kind:this.kinds[old]!,u:this.us[old]!,v:this.vs[old]!,shade:this.shades[old]!};}this.misses++;const value=query();if(this.used<this.capacity){const i=this.used++;this.kinds[i]=value.kind;this.us[i]=value.u;this.vs[i]=value.v;this.shades[i]=value.shade;this.slots.set(key,i);}return value;}
 dispose(){this.closed=true;this.slots.clear();this.used=0;this.kinds=new Int16Array(0);this.us=this.vs=this.shades=new Float64Array(0);}
}
