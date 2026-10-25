/// <reference lib="webworker" />
import {sphericalFieldRaster} from './spherical-field-raster.ts';
import {roundedBoundTree} from '../surfaces/rounded-crescent-bounds.ts';
import type {RoundedCrescentGeometry} from '../surfaces/rounded-crescent-globe.ts';
import type {SphereFieldSnapshot} from './spherical-elevation.ts';
import type {RoundedRasterInput,RoundedRasterOutput,RoundedRasterRequest} from './rounded-crescent-raster-protocol.ts';
const scope=self as unknown as DedicatedWorkerGlobalScope;
let field:SphereFieldSnapshot|undefined,geometry:RoundedCrescentGeometry|undefined,fingerprint='',active=-1,job:Generator|undefined;
const channel=new MessageChannel();let next:(()=>void)|undefined;
channel.port1.onmessage=()=>{const f=next;next=undefined;f?.();};
const schedule=(f:()=>void)=>{next=f;channel.port2.postMessage(0);};
const send=(m:RoundedRasterOutput,transfer:Transferable[]=[])=>scope.postMessage(m,transfer);
function render(m:RoundedRasterRequest){
 if(!field||!geometry)throw Error('Missing immutable Rounded Crescent display epoch.');
 active=m.id;const epoch=field,view={...m.view,roundedGlobe:geometry},at=performance.now(),work=sphericalFieldRaster(epoch,view,m.size,m.appearance,m.budget,undefined,undefined,m.backing,m.grid,false);job=work;
 const tick=()=>{if(active!==m.id||job!==work){work.return(undefined as never);return;}try{const start=performance.now();let r=work.next();while(!r.done&&performance.now()-start<6)r=work.next();if(!r.done){schedule(tick);return;}job=undefined;const columns=r.value.columns,pixels=r.value.pixels.slice(m.haloTop*columns*4,(m.haloTop+m.rowCount)*columns*4);send({type:'result',id:m.id,revision:epoch.sourceRevision,firstRow:m.firstRow,rowCount:m.rowCount,columns,pixels,computeMs:performance.now()-at},[pixels.buffer]);}catch(e){job=undefined;send({type:'error',id:m.id,message:String(e)});}};schedule(tick);
}
scope.onmessage=({data:m}:{data:RoundedRasterInput})=>{try{
 if(m.type==='field'){if(![128,256].includes(m.field.n)||Object.values(m.field.data).reduce((n,a)=>n+a.byteLength,0)>8*1024*1024||!m.view.roundedGlobe)throw Error('Unsupported derived display epoch.');field=m.field;const key=JSON.stringify(m.view.roundedGlobe);if(key!==fingerprint){geometry=m.view.roundedGlobe;fingerprint=key;roundedBoundTree(geometry);}send({type:'ready'});}
 else if(m.type==='cancel'){if(active===m.id){active=-1;job?.return(undefined as never);job=undefined;}}
 else{if(m.grid.columns*m.grid.rows>180000||m.grid.columns<1||m.grid.rows<1)throw Error('Invalid bounded navigation tile.');job?.return(undefined as never);render(m);}
 }catch(e){send({type:'error',id:'id'in m?m.id:-1,message:String(e)});}};
