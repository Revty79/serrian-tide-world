/** Outward binary64 arithmetic. Inputs are exact binary64 configuration words;
 * every elementary operation expands to the adjacent representable number. */
export type Interval=readonly[number,number];
const memory=new DataView(new ArrayBuffer(8));
export function adjacentFloat(value:number,up:boolean){if(Number.isNaN(value))throw RangeError('NaN interval endpoint.');if(value===(up?Infinity:-Infinity))return value;if(value===0)return up?Number.MIN_VALUE:-Number.MIN_VALUE;memory.setFloat64(0,value);let bits=memory.getBigUint64(0);bits+=(value>0)===up?1n:-1n;memory.setBigUint64(0,bits);return memory.getFloat64(0);}
export const exact=(x:number):Interval=>{if(!Number.isFinite(x))throw RangeError('Finite interval input required.');return[x,x];};
const out=(lo:number,hi:number):Interval=>{if(!Number.isFinite(lo)||!Number.isFinite(hi))throw RangeError('Pyramid interval range unsupported.');return[adjacentFloat(lo,false),adjacentFloat(hi,true)];};
export const add=(a:Interval,b:Interval)=>out(a[0]+b[0],a[1]+b[1]);
export const neg=(a:Interval):Interval=>[-a[1],-a[0]];
export const subtract=(a:Interval,b:Interval)=>add(a,neg(b));
export function multiply(a:Interval,b:Interval){const q=[a[0]*b[0],a[0]*b[1],a[1]*b[0],a[1]*b[1]];return out(Math.min(...q),Math.max(...q));}
export function divide(a:Interval,b:Interval){if(b[0]<=0&&b[1]>=0)throw RangeError('Pyramid interval division cannot certify its denominator.');return multiply(a,out(1/b[1],1/b[0]));}
export function square(a:Interval){const q=[a[0]*a[0],a[1]*a[1]];return out(a[0]<=0&&a[1]>=0?0:Math.min(...q),Math.max(...q));}
export function root(a:Interval):Interval{if(a[1]<0)throw RangeError('Negative interval square root.');return[Math.max(0,adjacentFloat(Math.sqrt(Math.max(0,a[0])),false)),adjacentFloat(Math.sqrt(a[1]),true)];}
export type IntervalPoint=readonly[Interval,Interval];
export const pointSubtract=(a:IntervalPoint,b:IntervalPoint):IntervalPoint=>[subtract(a[0],b[0]),subtract(a[1],b[1])];
export const pointCross=(a:IntervalPoint,b:IntervalPoint)=>subtract(multiply(a[0],b[1]),multiply(a[1],b[0]));
export const pointDot=(a:IntervalPoint,b:IntervalPoint)=>add(multiply(a[0],b[0]),multiply(a[1],b[1]));
export const pointLength=(a:IntervalPoint)=>root(add(square(a[0]),square(a[1])));
