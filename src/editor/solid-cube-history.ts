import {prepareSolidCubeDab, type CubeBrushSettings, type CubeDabLimits, type PreparedSolidCubeDab} from '../terrain/solid-cube-brush.ts';
import {MAX_CUBE_PATCH_SAMPLES, type CubePatchBlock, type SolidCubeTerrain} from '../terrain/solid-cube.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';

const CHUNK=1024, CHUNK_BYTES=CHUNK*12;
export const CUBE_HISTORY_LIMITS=Object.freeze({maxEntries:32,maxBytes:8*1024*1024,maxStrokeSamples:MAX_CUBE_PATCH_SAMPLES,maxBookkeepingSteps:16_000_000});
export type CubeHistoryLimits={readonly [K in keyof typeof CUBE_HISTORY_LIMITS]?:number};
export type CubeStrokeTermination='released'|'cancelled'|'failed'|'disposed';
type Chunk=CubePatchBlock & {readonly beforeWords:Uint32Array;readonly afterWords:Uint32Array;count:number};
interface Record {chunks:Chunk[];count:number;bytes:number;dabs:number;reason:CubeStrokeTermination}
type Change=Readonly<{index:number;before:number;after:number}>;
export type CubeDabExecutionStage='none'|'preparing'|'collecting'|'reserved';
const empty=():Record=>({chunks:[],count:0,bytes:0,dabs:0,reason:'released'});
const at=(r:Record,slot:number):Change=>{
  const c=r.chunks[Math.floor(slot/CHUNK)]!,i=slot%CHUNK;
  return {index:c.indices[i]!,before:c.before[i]!,after:c.after[i]!};
};

/** One authority, exact sorted net patches, and a revision lease. No view or timers.
 * C1 jobs are created privately: arbitrary caller-supplied commit proposals cannot enter history. */
export function createSolidCubeHistory(terrain:SolidCubeTerrain,input:CubeHistoryLimits={}) {
  const limits=Object.freeze({...CUBE_HISTORY_LIMITS,...input});
  for(const k of Object.keys(CUBE_HISTORY_LIMITS) as (keyof typeof limits)[])
    if(!Number.isSafeInteger(limits[k])||limits[k]<1||limits[k]>CUBE_HISTORY_LIMITS[k])throw new RangeError('Cube history limits may only lower hard budgets.');
  const binding=terrain.keyAt(0),entries:(Record|undefined)[]=new Array(limits.maxEntries);
  let size=0,cursor=0,bytes=0,expectedRevision=terrain.revision,active:Record|undefined;
  let evictions=0,branches=0,conflicts=0,peakTypedBytes=0;
  const synchronized=()=>{
    if(terrain.revision!==expectedRevision){conflicts++;throw new Error('Cube authority revision changed outside this history lease.');}
  };
  const apply=(redo:boolean)=>{
    if(active)throw new Error('End the cube gesture before replaying history.');
    if(redo?cursor===size:cursor===0)return false;
    const r=entries[redo?cursor:cursor-1]!,revision=terrain.revision;
    if(revision!==expectedRevision)conflicts++;
    // Explicit Undo/Redo may retain disjoint external edits. C1 validates EVERY
    // target source word and this current epoch before its atomic publication.
    const blocks:CubePatchBlock[]=r.chunks.map(c=>({indices:c.indices,before:redo?c.before:c.after,after:redo?c.after:c.before,count:c.count}));
    const writes=terrain.commitPreparedPatch(binding,revision,blocks);
    expectedRevision=revision+writes;cursor+=redo?1:-1;return true;
  };
  return Object.freeze({limits,
    get expectedRevision(){return expectedRevision;},
    get canUndo(){return !active&&cursor>0;},get canRedo(){return !active&&cursor<size;},
    get statistics(){return Object.freeze({entries:size,cursor,retainedBytes:bytes+(active?.bytes??0),activeBytes:active?.bytes??0,
      activeSamples:active?.count??0,evictions,branches,conflicts,peakTypedBytes});},
    get operations(){return Object.freeze(entries.slice(0,size).map(r=>Object.freeze({samples:r!.count,bytes:r!.bytes,dabs:r!.dabs,termination:r!.reason})));},
    synchronized,undo:()=>apply(false),redo:()=>apply(true),
    clear(){if(active)throw new Error('End the cube gesture before clearing history.');entries.fill(undefined);size=cursor=bytes=0;expectedRevision=terrain.revision;},
    *changes(operation:number){
      if(!Number.isSafeInteger(operation)||operation<0||operation>=size)throw new RangeError('Invalid cube history operation.');
      const r=entries[operation]!;
      for(const c of r.chunks)for(let i=0;i<c.count;i++)yield Object.freeze({index:c.indices[i]!,beforeWord:c.beforeWords[i]!,afterWord:c.afterWords[i]!});
    },
    beginOperation(expectedTerrain:SolidCubeTerrain){
      if(expectedTerrain!==terrain)throw new Error('Foreign cube history authority.');
      if(active)throw new Error('A cube gesture is already active.');synchronized();
      let record=empty(),closed=false,job:PreparedSolidCubeDab|undefined,draft:Record|undefined;
      let iterator:Generator<Change>|undefined,peek:Change|undefined,ended=false,oldSlot=0,lastChange=-1;
      let stage:CubeDabExecutionStage='none',preparedCount=0,reservedCount=0,bookkeepingSteps=0;
      let peakDraftBytes=0,lastStatistics:PreparedSolidCubeDab['statistics']|undefined;
      let sealed:Readonly<{count:number;bytes:number;dabs:number}>|undefined;
      active=record;
      const synced=()=>{if(closed||active!==record)throw new Error('Cube gesture lease is closed.');synchronized();};
      const cancelPending=()=>{if(job)lastStatistics=job.statistics;job?.cancel();job=undefined;draft=undefined;iterator=undefined;peek=undefined;stage='none';};
      const append=(c:Change)=>{
        if(Object.is(c.before,c.after))return;
        const r=draft!;
        if(r.count>=limits.maxStrokeSamples)throw new RangeError('Cube gesture history sample budget exhausted.');
        let chunk=r.chunks.at(-1);
        if(!chunk||chunk.count===CHUNK){
          if(r.bytes+CHUNK_BYTES>limits.maxBytes)throw new RangeError('Cube gesture history memory budget exhausted.');
          const before=new Float32Array(CHUNK),after=new Float32Array(CHUNK);
          chunk={indices:new Uint32Array(CHUNK),before,after,beforeWords:new Uint32Array(before.buffer),afterWords:new Uint32Array(after.buffer),count:0};
          r.chunks.push(chunk);r.bytes+=CHUNK_BYTES;peakDraftBytes=Math.max(peakDraftBytes,r.bytes);
          peakTypedBytes=Math.max(peakTypedBytes,bytes+record.bytes+r.bytes);
        }
        const i=chunk.count++;chunk.indices[i]=c.index;chunk.before[i]=c.before;chunk.after[i]=c.after;r.count++;
      };
      return Object.freeze({
        synchronized:synced,
        get stage(){return stage;},
        get current(){return job?Object.freeze({status:job.status,settings:job.settings,center:job.center,sourceRevision:job.sourceRevision,statistics:job.statistics}):undefined;},
        get statistics(){return Object.freeze({preparedDabs:preparedCount,reservedDabs:reservedCount,committedDabs:sealed?.dabs??record.dabs,bookkeepingSteps,
          activeSamples:record.count,activeBytes:record.bytes,prefixSamples:sealed?.count??record.count,prefixBytes:sealed?.bytes??record.bytes,
          draftBytes:draft&&draft!==record?draft.bytes:0,peakDraftBytes,lastDabStatistics:lastStatistics});},
        startDab(center:SurfacePosition,settings:CubeBrushSettings,dabLimits:CubeDabLimits={}){
          synced();if(job)throw new Error('A cube dab is already pending.');
          job=prepareSolidCubeDab(terrain,center,settings,dabLimits);synced();
          stage=job.status==='ready'?'collecting':'preparing';if(job.status==='ready')preparedCount++;
        },
        pumpPreparation(steps=256){
          synced();if(stage!=='preparing'||!job)throw new Error('No preparing cube dab.');
          job.pump(steps);synced();if(job.status==='ready'){stage='collecting';preparedCount++;}return stage;
        },
        pumpBookkeeping(steps=256){
          synced();if(stage!=='collecting'||!job)throw new Error('No ready cube dab to reserve.');
          if(!Number.isSafeInteger(steps)||steps<1||steps>4096)throw new RangeError('Cube history pump needs 1-4096 steps.');
          if(job.statistics.changesPrepared===0){draft=record;stage='reserved';reservedCount++;return stage;}
          if(!draft){draft=empty();iterator=job.preparedChanges(terrain);oldSlot=0;peek=undefined;ended=false;lastChange=-1;}
          for(let work=0;work<steps;work++){
            if(bookkeepingSteps>=limits.maxBookkeepingSteps)throw new RangeError('Cube gesture bookkeeping budget exhausted.');bookkeepingSteps++;
            if(!peek&&!ended){const next=iterator!.next();ended=Boolean(next.done);if(!next.done){peek=next.value;
              if(!Number.isSafeInteger(peek.index)||peek.index<=lastChange||peek.index>=terrain.sampleCount||!Number.isFinite(peek.before)||!Number.isFinite(peek.after))throw new Error('Invalid cube dab handoff.');lastChange=peek.index;}}
            const old=oldSlot<record.count?at(record,oldSlot):undefined;
            if(!old&&!peek){stage='reserved';reservedCount++;break;}
            if(old&&(!peek||old.index<peek.index)){append(old);oldSlot++;}
            else if(peek&&(!old||peek.index<old.index)){append(peek);peek=undefined;}
            else{
              if(!Object.is(old!.after,peek!.before))throw new Error('Cube history before word conflicts with the committed prefix.');
              append({index:old!.index,before:old!.before,after:peek!.after});oldSlot++;peek=undefined;
            }
          }
          synced();return stage;
        },
        commitDab(){
          synced();if(stage!=='reserved'||!job||!draft)throw new Error('Cube dab needs complete history reservation before publication.');
          const changed=job.statistics.changesPrepared;
          let keepBytes=0;for(let i=0;i<cursor;i++)keepBytes+=entries[i]!.bytes;
          let evict=0;
          if(changed)while(keepBytes+draft.bytes>limits.maxBytes){
            if(evict>=cursor)throw new RangeError('Cube history cannot reserve this committed prefix.');keepBytes-=entries[evict++]!.bytes;
          }
          synced();const writes=job.commit();
          // Everything below is private bounded bookkeeping; no allocation or
          // caller callback separates publication from prefix promotion.
          expectedRevision+=writes;draft.dabs=record.dabs+1;record=draft;active=record;
          if(changed){
            for(let i=cursor;i<size;i++){bytes-=entries[i]!.bytes;entries[i]=undefined;branches++;}size=cursor;
            for(let i=0;i<evict;i++){bytes-=entries[i]!.bytes;evictions++;}
            if(evict){for(let i=evict;i<size;i++)entries[i-evict]=entries[i];for(let i=size-evict;i<size;i++)entries[i]=undefined;size-=evict;cursor=size;}
          }
          lastStatistics=job.statistics;job=undefined;draft=undefined;iterator=undefined;peek=undefined;stage='none';synced();return writes;
        },
        cancelPending,
        finish(reason:CubeStrokeTermination){
          if(!['released','cancelled','failed','disposed'].includes(reason))throw new RangeError('Invalid cube gesture termination.');
          if(closed)return false;cancelPending();closed=true;active=undefined;
          const r=record;r.reason=reason;sealed=Object.freeze({count:r.count,bytes:r.bytes,dabs:r.dabs});record=empty();
          if(!r.count)return false;
          // A pending gesture is not yet an entry. Delay count-only eviction
          // until sealing, so an eventual net-zero gesture retains old entries.
          if(size===limits.maxEntries){bytes-=entries[0]!.bytes;for(let i=1;i<size;i++)entries[i-1]=entries[i];entries[--size]=undefined;cursor=size;evictions++;}
          entries[size++]=r;bytes+=r.bytes;cursor=size;return true;
        },
      });
    },
  });
}
export type SolidCubeHistory=ReturnType<typeof createSolidCubeHistory>;
export type SolidCubeHistoryOperation=ReturnType<SolidCubeHistory['beginOperation']>;
