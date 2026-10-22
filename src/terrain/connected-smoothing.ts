/** Accepted cylinder half-CFL graph arithmetic. Geometry supplies only actual
 * neighboring canonical keys, positive conductances and physical control area. */
export function connectedSmoothEstimate<K>(terrain:{read(key:K):number},neighbors:readonly K[],conductances:readonly number[],current:number,areaOverRadiusSquared:number){
 if(!(areaOverRadiusSquared>0)||!Number.isFinite(areaOverRadiusSquared)||!conductances.every(v=>Number.isFinite(v)&&v>0))throw RangeError('Invalid cylinder Smooth area/conductance.');
 const maximum=Math.max(...conductances);let sum=0,delta=0,maxDifference=0;
 for(let i=0;i<neighbors.length;i++){
  const value=terrain.read(neighbors[i]!);if(!Number.isFinite(value))throw RangeError('Cylinder Smooth source contains nonfinite elevation.');
  const weight=conductances[i]!/maximum,difference=value-current;sum+=weight;delta+=weight*difference;maxDifference=Math.max(maxDifference,Math.abs(difference));
 }
 return{delta:delta/(2*sum),neighbors:neighbors.length,areaOverRadiusSquared,roundoffErrorMeters:128*Number.EPSILON*neighbors.length*maxDifference,conductances,keys:neighbors};
}
