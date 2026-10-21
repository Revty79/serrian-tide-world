/** Exact, bounded transferable-value checking. No numerical approximation or geometry policy. */
export const CUBE_VALUE_LIMITS=Object.freeze({maxNodes:32_768,maxBytes:2*1024*1024,maxDepth:32,maxArray:4096,maxKeys:64,maxBigIntBits:16_384});
type Scalar=undefined|null|boolean|string|number|bigint;
type Frame={left:unknown;right:unknown;target:Record<string,unknown>|unknown[];key:string|number;depth:number;exit?:boolean};
function shape(value:object){
 const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
 if(prototype!==(array?Array.prototype:Object.prototype)&&prototype!==null)throw Error('Non-data cube worker object');
 const names=Reflect.ownKeys(value);if(names.some(k=>typeof k!=='string'))throw Error('Symbol in cube worker data');
 if(array){if(value.length>CUBE_VALUE_LIMITS.maxArray||names.length!==value.length+1||names.some(k=>k!=='length'&&(typeof k!=='string'||String(Number(k))!==k||!Number.isInteger(Number(k))||Number(k)<0||Number(k)>=value.length)))throw Error('Invalid cube worker array');}
 else if(names.length>CUBE_VALUE_LIMITS.maxKeys)throw Error('Cube worker object key limit');
 const keys=(names as string[]).filter(k=>!array||k!=='length').sort();
 for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key)!;if(!('value'in d))throw Error('Accessor in cube worker data');}
 return {array,keys};
}
function scalarBytes(value:Scalar){
 if(typeof value==='number'&&!Number.isFinite(value))throw Error('Nonfinite cube worker number');
 if(typeof value==='bigint'){const bits=(value<0n?-value:value).toString(2).length;if(bits>CUBE_VALUE_LIMITS.maxBigIntBits)throw Error('Cube worker integer bit limit');return Math.ceil(bits/8)+8;}
 return typeof value==='string'?value.length*2+8:16;
}
/** Each pump visits at most its field quantum. The returned clone shares no worker references. */
export function createCubeValueComparison(left:unknown,right:unknown,maxBytes=CUBE_VALUE_LIMITS.maxBytes){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>CUBE_VALUE_LIMITS.maxBytes)throw RangeError('Cube value byte budget');
 const root:Record<string,unknown>={},stack:Frame[]=[{left,right,target:root,key:'value',depth:0}],activeLeft=new WeakSet<object>(),activeRight=new WeakSet<object>();
 let nodes=0,bytes=0,complete=false;
 const put=(frame:Frame,value:unknown)=>{Object.defineProperty(frame.target,frame.key,{value,writable:true,enumerable:true,configurable:true});};
 return {
  get complete(){return complete;},get value(){if(!complete)throw Error('Cube value validation incomplete');return root.value;},
  get statistics(){return{nodes,bytes};},
  pump(steps=128){
   if(!Number.isSafeInteger(steps)||steps<1||steps>4096)throw RangeError('Cube value comparison quantum');
   for(let i=0;i<steps&&stack.length;i++){
    const frame=stack.pop()!,a=frame.left,b=frame.right;
    if(frame.exit){activeLeft.delete(a as object);activeRight.delete(b as object);Object.freeze(frame.target);continue;}nodes++;
    if(nodes>CUBE_VALUE_LIMITS.maxNodes||frame.depth>CUBE_VALUE_LIMITS.maxDepth)throw Error('Cube worker value structure limit');
    if(a===null||typeof a!=='object'){
     if(!['undefined','boolean','string','number','bigint','object'].includes(typeof a)||!Object.is(a,b))throw Error('Cube worker certificate mismatch');
     bytes+=scalarBytes(a as Scalar);put(frame,a);
    }else{
     if(b===null||typeof b!=='object'||activeLeft.has(a)||activeRight.has(b))throw Error('Invalid cyclic cube worker data');activeLeft.add(a);activeRight.add(b);
     const sa=shape(a),sb=shape(b);if(sa.array!==sb.array||sa.keys.length!==sb.keys.length||sa.keys.some((key,k)=>key!==sb.keys[k]))throw Error('Cube worker certificate shape mismatch');
     const output:Record<string,unknown>|unknown[]=sa.array?new Array((a as unknown[]).length):{};put(frame,output);bytes+=32+sa.keys.reduce((n,k)=>n+k.length*2,0);
     stack.push({left:a,right:b,target:output,key:'',depth:frame.depth,exit:true});
     for(const key of sa.keys.toReversed())stack.push({left:Object.getOwnPropertyDescriptor(a,key)!.value,right:Object.getOwnPropertyDescriptor(b,key)!.value,target:output,key,depth:frame.depth+1});
    }
    if(bytes>maxBytes)throw Error('Cube worker value byte limit');
   }
   complete=stack.length===0;return complete;
  },
 };
}
/** Used only on trusted engine-produced records when bounding the optional replay log. */
export function cubeWorkValueBytes(value:unknown){const check=createCubeValueComparison(value,value);while(!check.complete)check.pump(4096);return check.statistics.bytes;}
