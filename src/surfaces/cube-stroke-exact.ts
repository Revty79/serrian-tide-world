/** Cube-C2A arithmetic: finite rational linear combinations of square roots.
 * No factorization, approximate equality, terrain access or changes to Cube-B. */
import { createCubeExactBudget, cubeFloatDyadic, cubeFraction, type CubeBinaryRational, type CubeExactBudget, type CubeFraction } from './cube-route-exact.ts';

export type CubeRadical = Readonly<{ radicand: bigint; coefficient: CubeFraction }>;
export type CubeArc = readonly CubeRadical[];
export const CUBE_ARC_MAX_TERMS = 128;
export const CUBE_ARC_MAX_PRECISION = 4096;
export const cubeArcBudget = createCubeExactBudget;
const rational = (b: CubeExactBudget, n: bigint, d = 1n) => cubeFraction(b, n, d);
export const cubeRationalAdd = (b: CubeExactBudget, x: CubeFraction, y: CubeFraction) => rational(b, x.n*y.d+y.n*x.d, x.d*y.d);
export const cubeRationalMultiply = (b: CubeExactBudget, x: CubeFraction, y: CubeFraction) => rational(b, x.n*y.n, x.d*y.d);
export function cubeRational(b: CubeExactBudget, x: CubeBinaryRational): CubeFraction {
  return x.exponent >= 0 ? rational(b, x.n << BigInt(x.exponent), x.d) : rational(b, x.n, x.d << BigInt(-x.exponent));
}
export const cubeNumberRational = (b: CubeExactBudget, x: number) => cubeRational(b, { ...cubeFloatDyadic(x), d: 1n });
export function cubeIntegerRoot(b: CubeExactBudget, n: bigint): bigint {
  b.check(n); if (n < 0n) throw new RangeError('Negative cube radical.'); if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length/2));
  for (;;) { b.step(); const y = (x+n/x)>>1n; if (y >= x) return x; x = y; }
}
function gcd(b: CubeExactBudget, a: bigint, c: bigint): bigint {
  b.check(a,c); while (c) { b.step(); const t = a%c; a=c; c=t; } return a;
}
/** sqrt(r)/sqrt(s), when rational; square tests suffice without factoring. */
function equivalent(b: CubeExactBudget, r: bigint, s: bigint): CubeFraction | undefined {
  const g=gcd(b,r,s), x=r/g, y=s/g, a=cubeIntegerRoot(b,x), c=cubeIntegerRoot(b,y);
  return a*a===x && c*c===y ? rational(b,a,c) : undefined;
}
function append(b: CubeExactBudget, out: CubeRadical[], radicand: bigint, coefficient: CubeFraction) {
  b.check(radicand,coefficient.n,coefficient.d); if (!coefficient.n || !radicand) return;
  const root=cubeIntegerRoot(b,radicand);
  if (root*root===radicand) { coefficient=cubeRationalMultiply(b,coefficient,rational(b,root)); radicand=1n; }
  for (let i=0;i<out.length;i++) {
    const old=out[i]!, ratio=equivalent(b,radicand,old.radicand); if (!ratio) continue;
    const sum=cubeRationalAdd(b,old.coefficient,cubeRationalMultiply(b,coefficient,ratio));
    if (sum.n) out[i]=Object.freeze({radicand:old.radicand,coefficient:sum}); else out.splice(i,1); return;
  }
  if (out.length >= CUBE_ARC_MAX_TERMS) throw new RangeError('Cube arc radical-term limit exhausted.');
  out.push(Object.freeze({radicand,coefficient}));
}
export function cubeArcAdd(b: CubeExactBudget, ...arcs: readonly CubeArc[]): CubeArc {
  // Operands are already normalized by this module; retain the first basis.
  const out: CubeRadical[]=[...(arcs[0]??[])];
  for (const arc of arcs.slice(1)) for (const term of arc) append(b,out,term.radicand,term.coefficient); return Object.freeze(out);
}
export function cubeArcScale(b: CubeExactBudget, arc: CubeArc, scale: CubeFraction): CubeArc {
  return Object.freeze(arc.filter(t=>t.coefficient.n && scale.n).map(t=>Object.freeze({radicand:t.radicand,coefficient:cubeRationalMultiply(b,t.coefficient,scale)})));
}
export const cubeArcRational = (x: CubeFraction): CubeArc => x.n ? Object.freeze([Object.freeze({radicand:1n,coefficient:x})]) : Object.freeze([]);
export function cubeArcLength(b: CubeExactBudget, squared: CubeBinaryRational): CubeArc {
  const q=cubeRational(b,squared), out: CubeRadical[]=[]; append(b,out,q.n*q.d,rational(b,1n,q.d)); return Object.freeze(out);
}
/** Dividing an algebraic arc by ONE positive route length stays in this field. */
export function cubeArcDivideLength(b: CubeExactBudget, arc: CubeArc, length: CubeArc): CubeArc {
  if (length.length!==1 || length[0]!.coefficient.n<=0n) throw new RangeError('Positive single-radical route length required.');
  const y=length[0]!, out: CubeRadical[]=[];
  for (const t of arc) {
    let radicand=t.radicand*y.radicand;
    let coefficient=rational(b,t.coefficient.n*y.coefficient.d,t.coefficient.d*y.coefficient.n*y.radicand);
    b.check(radicand);const root=cubeIntegerRoot(b,radicand);
    if(root*root===radicand){coefficient=cubeRationalMultiply(b,coefficient,rational(b,root));radicand=1n;}
    // Multiplication by the same square class is bijective: distinct input
    // classes stay distinct. No quadratic pairwise re-normalization is needed.
    out.push(Object.freeze({radicand,coefficient}));
  }
  return Object.freeze(out);
}
export interface CubeArcBounds { readonly lower: CubeFraction; readonly upper: CubeFraction; readonly precisionBits: number }
export function cubeArcBounds(b: CubeExactBudget, arc: CubeArc, precisionBits: number): CubeArcBounds {
  let lower=rational(b,0n), upper=lower; const denominator=1n<<BigInt(precisionBits);
  for (const t of arc) {
    let lo: CubeFraction, hi: CubeFraction;
    if (t.radicand===1n) lo=hi=t.coefficient;
    else {
      const scaled=t.radicand<<BigInt(2*precisionBits); b.check(scaled);
      const root=cubeIntegerRoot(b,scaled), exact=root*root===scaled;
      lo=cubeRationalMultiply(b,t.coefficient,rational(b,root,denominator));
      hi=cubeRationalMultiply(b,t.coefficient,rational(b,exact?root:root+1n,denominator));
      if (t.coefficient.n<0n) [lo,hi]=[hi,lo];
    }
    lower=cubeRationalAdd(b,lower,lo); upper=cubeRationalAdd(b,upper,hi);
  }
  return Object.freeze({lower,upper,precisionBits});
}
const compare=(b: CubeExactBudget,x: CubeFraction,y: CubeFraction) => { const d=x.n*y.d-y.n*x.d; b.check(d); return d<0n?-1:d>0n?1:0; };
/** Distinct rational-square classes are Q-linearly independent. Zero is structural. */
export function cubeArcSign(b: CubeExactBudget, arc: CubeArc): number {
  if (!arc.length) return 0;
  for (let p=64;p<=CUBE_ARC_MAX_PRECISION;p*=2) {
    const q=cubeArcBounds(b,arc,p); if (q.lower.n>0n) return 1; if (q.upper.n<0n) return -1;
    if (q.lower.n===0n && q.upper.n===0n) return 0;
  }
  throw new RangeError('Cube arc sign precision exhausted; no guessed spacing decision.');
}
const view=new DataView(new ArrayBuffer(8));
const float=(bits: bigint)=>{view.setBigUint64(0,bits,false);return view.getFloat64(0,false);};
function nearest(b: CubeExactBudget, q: CubeFraction): number {
  if (!q.n) return 0; if (q.n<0n) return -nearest(b,{n:-q.n,d:q.d});
  let lo=0n,hi=0x7fefffffffffffffn;
  while (lo<hi) { b.step(); const mid=(lo+hi+1n)>>1n; if (compare(b,cubeNumberRational(b,float(mid)),q)<=0) lo=mid; else hi=mid-1n; }
  const x=cubeNumberRational(b,float(lo)); if (compare(b,x,q)===0) return float(lo);
  if (lo===0x7fefffffffffffffn) throw new RangeError('Cube arc coordinate overflow.');
  const midpoint=cubeRationalMultiply(b,cubeRationalAdd(b,x,cubeNumberRational(b,float(lo+1n))),{n:1n,d:2n}), c=compare(b,q,midpoint);
  return float(c<0 || c===0 && !(lo&1n) ? lo : lo+1n);
}
/** Round the ideal algebraic coordinate once, nearest/even, with a proof interval. */
export function cubeArcRound(b: CubeExactBudget, arc: CubeArc) {
  for (let p=64;p<=CUBE_ARC_MAX_PRECISION;p*=2) {
    const bounds=cubeArcBounds(b,arc,p), a=nearest(b,bounds.lower), c=nearest(b,bounds.upper);
    if (Object.is(a,c) || a===0 && c===0) return Object.freeze({value:a===0?0:a,bounds});
  }
  throw new RangeError('Cube arc rounding precision exhausted; no uncertified center returned.');
}
