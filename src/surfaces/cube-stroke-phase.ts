import type {CubeBinaryRational,CubeExactBudget} from './cube-route-exact.ts';
import {cubeIntegerRoot,cubeNumberRational,cubeRational} from './cube-stroke-exact.ts';

/** One tick is exactly spacing/2^64 metres. Integer phase needs no growing radical
 * expression. Each segment contributes at most half a tick of length error. */
export const CUBE_PHASE_BITS=64;
export const CUBE_PHASE_UNIT=1n<<BigInt(CUBE_PHASE_BITS);
/** roundEven(sqrt(squared)/spacing * 2^64), proven with integer comparisons.
 * No floating-point sqrt, tolerance decision or approximate route is involved. */
export function cubePhaseLength(b:CubeExactBudget,squared:CubeBinaryRational,spacing:number):bigint {
 const q=cubeRational(b,squared),s=cubeNumberRational(b,spacing);
 if(q.n<0n||s.n<=0n)throw RangeError('Positive spacing and nonnegative squared route required.');
 const n=(q.n*s.d*s.d)<<BigInt(2*CUBE_PHASE_BITS),d=q.d*s.n*s.n;b.check(n,d);
 const root=cubeIntegerRoot(b,n/d),mid=2n*root+1n,comparison=4n*n-d*mid*mid;b.check(comparison);
 return root+(comparison>0n||comparison===0n&&(root&1n)!==0n?1n:0n);
}
