import {createSolidCubeTerrain} from '../../src/terrain/solid-cube.ts';
import {prepareSolidCubeDab, type PreparedSolidCubeDab, type CubeBrushSettings} from '../../src/terrain/solid-cube-brush.ts';
import type {SolidCubeConfiguration, SolidCubePosition} from '../../src/surfaces/solid-cube.ts';

type Input={type:'start';geometry:SolidCubeConfiguration;n:number;terrainId:string;values:Float32Array;revision:number}|{type:'prepare';sequence:number;revision:number;center:SolidCubePosition;settings:CubeBrushSettings}|{type:'ack';sequence:number;revision:number};
let terrain:ReturnType<typeof createSolidCubeTerrain>|undefined,job:PreparedSolidCubeDab|undefined,canonicalRevision=0,sequence=0,waiting=false,expectedWrites=0,started=0,maxPumpMs=0;
const channel=new MessageChannel();let queued=false;
const kick=()=>{if(!queued){queued=true;channel.port2.postMessage(0);}};
const fail=(e:unknown)=>{job?.cancel();job=undefined;terrain=undefined;postMessage({type:'error',message:String(e)});};
channel.port1.onmessage=()=>{
 queued=false;if(!job||waiting)return;
 try{
  const began=performance.now();let calls=0;
  while(job.status==='preparing'&&calls++<64&&performance.now()-began<6){const at=performance.now();job.pump(256);maxPumpMs=Math.max(maxPumpMs,performance.now()-at);}
  if(job.status==='ready'){
   const changes=[...job.preparedChanges(terrain!)],indices=Uint32Array.from(changes,c=>c.index),before=Float32Array.from(changes,c=>c.before),after=Float32Array.from(changes,c=>c.after);
   waiting=true;expectedWrites=changes.length;
   postMessage({type:'prepared',sequence,revision:canonicalRevision,center:job.center,settings:job.settings,statistics:job.statistics,indices,before,after,prepareMs:performance.now()-started,maxPumpMs},{transfer:[indices.buffer,before.buffer,after.buffer]});
  }else kick();
 }catch(e){fail(e);}
};
self.onmessage=(event:MessageEvent<Input>)=>{
 try{
  const m=event.data;
  if(m.type==='start'){
   if(terrain)throw Error('Probe already started');const at=performance.now();terrain=createSolidCubeTerrain({terrainId:m.terrainId,geometry:m.geometry,cellsPerEdge:m.n});
   if(!(m.values instanceof Float32Array)||m.values.length!==terrain.sampleCount||!Number.isSafeInteger(m.revision)||m.revision<0)throw Error('Invalid exact probe source');
   for(const key of terrain.samples())terrain.write(key,m.values[key.index]!);canonicalRevision=m.revision;postMessage({type:'ready',loadMs:performance.now()-at});
  }else if(m.type==='prepare'){
   if(!terrain||job||m.sequence!==sequence+1||m.revision!==canonicalRevision)throw Error('Invalid probe preparation order/epoch');sequence=m.sequence;started=performance.now();maxPumpMs=0;job=prepareSolidCubeDab(terrain,m.center,m.settings);kick();
  }else{
   if(!job||!waiting||m.sequence!==sequence||m.revision!==canonicalRevision+expectedWrites)throw Error('Invalid probe acknowledgement');
   job.commit();job=undefined;waiting=false;canonicalRevision=m.revision;postMessage({type:'ack',sequence,revision:canonicalRevision});
  }
 }catch(e){fail(e);}
};
