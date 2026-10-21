import {cubeFloatDyadic,type CubeFraction,type CubeBinaryRational,type CubeLengthInterval} from '../surfaces/cube-route-exact.ts';
import {SOLID_CUBE_FRAMES,solidCubeConnection,type SolidCubeConfiguration,type SolidCubeFace,createSolidCubeGeometry} from '../surfaces/solid-cube.ts';
import type {CubeStrokePathEvent} from '../surfaces/solid-cube-stroke-path.ts';
import type {CubeExactChartPoint,CubeExactWorldPoint} from '../surfaces/solid-cube-routing.ts';
const add=(a:CubeFraction,b:CubeFraction):CubeFraction=>({n:a.n*b.d+b.n*a.d,d:a.d*b.d});
const negate=(a:CubeFraction):CubeFraction=>({n:-a.n,d:a.d});
const sub=(a:CubeFraction,b:CubeFraction)=>add(a,negate(b));
const mul=(a:CubeFraction,b:CubeFraction):CubeFraction=>({n:a.n*b.n,d:a.d*b.d});
const cmp=(a:CubeFraction,b:CubeFraction)=>{const x=a.n*b.d-b.n*a.d;return x<0n?-1:x>0n?1:0;};
const zero={n:0n,d:1n},one={n:1n,d:1n};
function fraction(q:CubeFraction){if(!q||typeof q.n!=='bigint'||typeof q.d!=='bigint'||q.d<=0n)throw Error('Invalid cube certificate fraction');return q;}
function binary(q:CubeBinaryRational):CubeFraction{
 fraction(q);if(!Number.isSafeInteger(q.exponent)||q.exponent< -1074||q.exponent>1023)throw Error('Invalid cube certificate exponent');
 return q.exponent>=0?{n:q.n<<BigInt(q.exponent),d:q.d}:{n:q.n,d:q.d<<BigInt(-q.exponent)};
}
const exact=(value:number)=>{const q=cubeFloatDyadic(value);return binary({...q,d:1n});};
const view=new DataView(new ArrayBuffer(8));
function adjacent(value:number,up:boolean){if(value===0)return up?Number.MIN_VALUE:-Number.MIN_VALUE;view.setFloat64(0,value,false);const bits=view.getBigUint64(0,false);view.setBigUint64(0,bits+((value>0)===up?1n:-1n),false);return view.getFloat64(0,false);}
function even(value:number){view.setFloat64(0,value,false);return !(view.getBigUint64(0,false)&1n);}

/** Independent bounded checks of physical witnesses and rounding cells. Global route choice
 * and carried algebraic spacing additionally require matching complete accepted-C2A replicas. */
export function createCubePathCertificateCheck(configuration:SolidCubeConfiguration){
 const geometry=createSolidCubeGeometry(configuration),identity=geometry.identity,half=exact(configuration.sideLengthMeters/2);
 const identified=(p:{worldId:string;surfaceId:string})=>{if(p.worldId!==identity.worldId||p.surfaceId!==identity.surfaceId)throw Error('Foreign cube physical certificate');};
 const world=(p:CubeExactWorldPoint)=>{identified(p);if(!Array.isArray(p.numerator)||p.numerator.length!==3||typeof p.denominator!=='bigint'||p.denominator<=0n)throw Error('Invalid cube world witness');return p.numerator.map(n=>binary({n,d:p.denominator,exponent:p.exponent}));};
 const sameWorld=(a:CubeExactWorldPoint,b:CubeExactWorldPoint)=>{const x=world(a),y=world(b);if(x.some((q,i)=>cmp(q,y[i]!)!==0))throw Error('Disconnected cube physical route');};
 const chart=(p:CubeExactChartPoint,face:SolidCubeFace)=>{
  identified(p);if(p.patchId!==face||!SOLID_CUBE_FRAMES[face])throw Error('Invalid cube chart witness');const u=binary(p.u),v=binary(p.v);
  if([u,v].some(q=>cmp(q,negate(half))<0||cmp(q,half)>0))throw Error('Cube route outside closed face');const frame=SOLID_CUBE_FRAMES[face];
  const values=[0,1,2].map(axis=>add(add(mul(half,{n:BigInt(frame.normal[axis]!),d:1n}),mul(u,{n:BigInt(frame.u[axis]!),d:1n})),mul(v,{n:BigInt(frame.v[axis]!),d:1n})));return{u,v,values};
 };
 const length=(interval:CubeLengthInterval,squared:CubeFraction)=>{
  if(!interval||interval.units!=='meters'||!Number.isFinite(interval.lower)||!Number.isFinite(interval.upper)||interval.lower<0||interval.lower>interval.upper)throw Error('Invalid cube meter interval');
  if(cmp(mul(exact(interval.lower),exact(interval.lower)),squared)>0||cmp(mul(exact(interval.upper),exact(interval.upper)),squared)<0)throw Error('Cube meter interval does not enclose physical length');
 };
 return (event:CubeStrokePathEvent)=>{
  if(event.kind==='dab'){
   const point=geometry.aliases(event.center).find(p=>p.patchId===event.idealFace);if(!point||!event.coordinateBounds)throw Error('Cube brush chart/rounding witness missing');
   for(const axis of['u','v'] as const){
    const bounds=event.coordinateBounds[axis],value=point[axis],q=exact(value),low=mul(add(exact(adjacent(value,false)),q),{n:1n,d:2n}),high=mul(add(q,exact(adjacent(value,true))),{n:1n,d:2n});
    if(!bounds||!Number.isSafeInteger(bounds.precisionBits)||bounds.precisionBits<64||bounds.precisionBits>4096||(bounds.precisionBits&(bounds.precisionBits-1)))throw Error('Invalid cube rounding precision');
    fraction(bounds.lower);fraction(bounds.upper);const a=cmp(bounds.lower,low),b=cmp(bounds.upper,high);
    if(cmp(bounds.lower,bounds.upper)>0||a<0||b>0||(!even(value)&&(a===0||b===0)))throw Error('Cube center disagrees with exact nearest-even certificate');
   }
   return;
  }
  const route=event.route,segments=route.segments;if(!Array.isArray(segments)||segments.length<1||segments.length>6||route.faces.length!==segments.length||route.crossings.length!==segments.length-1||route.vertices.length!==segments.length+1)throw Error('Invalid cube route extent');
  const from=geometry.referencePosition(event.from),to=geometry.referencePosition(event.to),a=world(segments[0]!.fromWorld),b=world(segments.at(-1)!.toWorld);
  if(a.some((q,i)=>cmp(q,exact(from[i]!))!==0)||b.some((q,i)=>cmp(q,exact(to[i]!))!==0))throw Error('Cube route endpoints differ from accepted geography');
  if(cmp(fraction(segments[0]!.startParameter),zero)!==0||cmp(fraction(segments.at(-1)!.endParameter),one)!==0)throw Error('Cube route parameter endpoints');
  const direction=segments[0]!.direction,squared=add(mul(binary(direction.du),binary(direction.du)),mul(binary(direction.dv),binary(direction.dv)));length(route.lengthMeters,squared);sameWorld(route.vertices[0]!,segments[0]!.fromWorld);
  for(const [index,s]of segments.entries()){
   if(route.faces[index]!==s.face)throw Error('Cube route face witness');const first=chart(s.from,s.face),last=chart(s.to,s.face),x=world(s.fromWorld),y=world(s.toWorld);
   if(x.some((q,i)=>cmp(q,first.values[i]!)!==0)||y.some((q,i)=>cmp(q,last.values[i]!)!==0))throw Error('Cube world/chart witness mismatch');
   const start=fraction(s.startParameter),end=fraction(s.endParameter),span=sub(end,start);if(cmp(start,zero)<0||cmp(end,one)>0||cmp(span,zero)<=0)throw Error('Cube route parameter ordering');
   if(cmp(sub(last.u,first.u),mul(binary(s.direction.du),span))!==0||cmp(sub(last.v,first.v),mul(binary(s.direction.dv),span))!==0)throw Error('Cube route direction witness mismatch');
   length(s.lengthMeters,mul(squared,mul(span,span)));sameWorld(route.vertices[index+1]!,s.toWorld);
   if(index){
    const previous=segments[index-1]!,crossing=route.crossings[index-1]!;sameWorld(previous.toWorld,s.fromWorld);sameWorld(crossing.point,s.fromWorld);
    if(cmp(fraction(previous.endParameter),start)!==0||cmp(fraction(crossing.parameter),start)!==0)throw Error('Cube crossing parameter mismatch');
    const connection=solidCubeConnection(previous.face,crossing.fromEdge);if(connection.toFace!==s.face||connection.toEdge!==crossing.toEdge||connection.edgeId!==crossing.edgeId)throw Error('Cube crossing adjacency mismatch');
    const mid={...identity,patchId:previous.face,u:crossing.fromEdge.startsWith('u')?(crossing.fromEdge.endsWith('min')?-configuration.sideLengthMeters/2:configuration.sideLengthMeters/2):0,v:crossing.fromEdge.startsWith('v')?(crossing.fromEdge.endsWith('min')?-configuration.sideLengthMeters/2:configuration.sideLengthMeters/2):0};
    const transport=geometry.crossEdge(mid,crossing.fromEdge).transport;for(const key of['uu','uv','vu','vv'] as const)if(crossing.transport[key]!==transport[key])throw Error('Cube crossing fold mismatch');
    const fromChart=chart(crossing.from,previous.face),toChart=chart(crossing.to,s.face);if(fromChart.values.some((q,i)=>cmp(q,x[i]!)!==0)||toChart.values.some((q,i)=>cmp(q,x[i]!)!==0))throw Error('Cube crossing chart mismatch');
    const du=binary(previous.direction.du),dv=binary(previous.direction.dv),nextU=add(mul(du,{n:BigInt(transport.uu),d:1n}),mul(dv,{n:BigInt(transport.uv),d:1n})),nextV=add(mul(du,{n:BigInt(transport.vu),d:1n}),mul(dv,{n:BigInt(transport.vv),d:1n}));
    if(cmp(nextU,binary(s.direction.du))!==0||cmp(nextV,binary(s.direction.dv))!==0)throw Error('Cube route tangent fold mismatch');
    if(x.every(q=>cmp(q,half)===0||cmp(q,negate(half))===0))throw Error('Cube route illegally crosses a singular corner');
   }
  }
 };
}
