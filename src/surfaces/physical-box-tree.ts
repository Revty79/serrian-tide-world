export interface PhysicalBox {readonly low:readonly number[];readonly high:readonly number[]}
export interface PhysicalBoxNode<Id> extends PhysicalBox {readonly ids?:readonly Id[];readonly children?:readonly PhysicalBoxNode<Id>[]}
/** Median split on the widest physical axis, extracted from the accepted
 * Ribbon visibility hierarchy. Trees contain geometry and identifiers only. */
export function physicalBoxTree<Id>(items:readonly (PhysicalBox&{readonly id:Id})[]):PhysicalBoxNode<Id>{
 if(!items.length||items.some(p=>p.low.length!==3||p.high.length!==3||p.low.some((v,k)=>!Number.isFinite(v)||!Number.isFinite(p.high[k])||v>p.high[k]!)))throw RangeError('Finite ordered physical boxes required.');
 const build=(rows:typeof items):PhysicalBoxNode<Id>=>{const low=[0,1,2].map(k=>Math.min(...rows.map(p=>p.low[k]!))),high=[0,1,2].map(k=>Math.max(...rows.map(p=>p.high[k]!)));if(rows.length<=8)return{low,high,ids:rows.map(p=>p.id)};let axis=0;for(let i=1;i<3;i++)if(high[i]!-low[i]!>high[axis]!-low[axis]!)axis=i;const sorted=[...rows].sort((a,b)=>a.low[axis]!+a.high[axis]!-b.low[axis]!-b.high[axis]!);return{low,high,children:[build(sorted.slice(0,sorted.length/2)),build(sorted.slice(sorted.length/2))]};};return build(items);
}
