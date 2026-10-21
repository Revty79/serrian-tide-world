import {CubeEditorSession} from './cube-editor-session.ts';
import {TerrainHistory} from './terrain-history.ts';
import type {HollowCubeWorld} from '../terrain/hollow-cube.ts';
import type {HollowCubeRole} from '../surfaces/hollow-cube.ts';
import {validateLinkedEntrance,type LinkedEntrance,type PhysicalPassage} from '../surfaces/passages.ts';
import {validateHollowCubePassage} from '../surfaces/hollow-cube-passages.ts';
import type {SolidCubeTerrain} from '../terrain/solid-cube.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';

export interface HollowConnections {readonly links:readonly LinkedEntrance[];readonly passages:readonly PhysicalPassage[]}
export const HOLLOW_CONNECTION_BYTES=256*1024;
export const HOLLOW_PRIMITIVE_LIMIT=48;
export const HOLLOW_ROLES=['exterior','interior'] as const;
const encode=(value:HollowConnections)=>{const bytes=new TextEncoder().encode(JSON.stringify(value));if(bytes.length>HOLLOW_CONNECTION_BYTES-4)throw RangeError('Entrances and tunnels exceed the 256 KiB World limit.');const words=new Uint32Array(HOLLOW_CONNECTION_BYTES/4);words[0]=bytes.length;new Uint8Array(words.buffer,4).set(bytes);return words;};
const decode=(words:Uint32Array):HollowConnections=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(words.buffer,words.byteOffset+4,words[0])));
export function validateHollowConnections(world:HollowCubeWorld,input:HollowConnections):HollowConnections {
 if(!input||Object.keys(input).sort().join(',')!=='links,passages'||!Array.isArray(input.links)||!Array.isArray(input.passages)||input.links.length>128||input.passages.length>8)throw RangeError('Unsupported or oversized World connections.');
 const links=input.links.map(link=>{if(link.worldId!==world.definition.id)throw RangeError('Entrance belongs to another World.');return validateLinkedEntrance(link,p=>world.select(p).geometry.normalize(p));});
 const passages=input.passages.map(p=>validateHollowCubePassage(world,p).passage);
 const ids=[...links,...passages].map(p=>p.id);if(new Set(ids).size!==ids.length)throw RangeError('Duplicate connection identity.');
 if(passages.reduce((n,p)=>n+p.nodes.length+p.segments.length,0)>HOLLOW_PRIMITIVE_LIMIT)throw RangeError(`This World supports ${HOLLOW_PRIMITIVE_LIMIT} tunnel balls and segments. Split or simplify the excavation.`);
 // Independent networks may not intersect silently. Connected branches belong to one network.
 const bounds=passages.map(p=>[0,1,2].map(axis=>[Math.min(...p.nodes.map(n=>n.position[axis]!-n.radiusMeters)),Math.max(...p.nodes.map(n=>n.position[axis]!+n.radiusMeters))]));
 for(let i=0;i<bounds.length;i++)for(let j=0;j<i;j++)if(bounds[i]!.every((b,k)=>b[0]!<=bounds[j]![k]![1]!&&b[1]!>=bounds[j]![k]![0]!))throw RangeError('Separate excavation bounds overlap. Add branches to the existing network instead.');
 const result=Object.freeze({links:Object.freeze(links),passages:Object.freeze(passages)});encode(result);return result;
}
/** Explicit conservative envelope, not a global displaced terrain mesh certificate. */
export function assertHollowElevation(world:HollowCubeWorld,role:HollowCubeRole,height:number){
 const min=-world.dimensions.nominalWallThicknessMeters/4,max=role==='interior'?world.dimensions.innerSideLengthMeters/4:world.dimensions.outerSideLengthMeters;
 if(!Number.isFinite(height)||height<min||height>max)throw RangeError(`${role==='interior'?'Inside':'Outside'} terrain must stay between ${min.toLocaleString()} and ${max.toLocaleString()} m to preserve the reserved shell/cavity clearance. Reduce strength or undo. No heights were clamped.`);
}
/** Host for two accepted editors; this is neither another brush executor nor another history engine. */
export class HollowCubeDocument {
 readonly sessions:Record<HollowCubeRole,CubeEditorSession>;
 readonly connectionWords=new Uint32Array(HOLLOW_CONNECTION_BYTES/4);
 readonly connectionHistory=new TerrainHistory(this.connectionWords,4*1024*1024,64);
 connections:HollowConnections=Object.freeze({links:[],passages:[]});
 selectedSurface:HollowCubeRole='exterior';historyScope:'terrain'|'connections'='terrain';
 changed=()=>{};geometryChanged=()=>{};status='Ready to paint outside';error='';preparationMs=0;
 private masks:Record<HollowCubeRole,Uint8Array>;private geometryRevision=0;private checkpoint=0;private savedName:string;private _name:string;private _locked=false;private disposed=false;private changing=false;
 readonly world:HollowCubeWorld;
 constructor(world:HollowCubeWorld,name:string,saved=false){
  this.world=world;
  this._name=this.savedName=name;this.connectionWords.set(encode(this.connections));
  this.masks={exterior:new Uint8Array(world.surfaces.exterior.referenceTerrain.sampleCount),interior:new Uint8Array(world.surfaces.interior.referenceTerrain.sampleCount)};
  this.sessions={} as Record<HollowCubeRole,CubeEditorSession>;
  for(const role of HOLLOW_ROLES){
   const raw=world.surfaces[role].referenceTerrain,other=world.surfaces[role==='exterior'?'interior':'exterior'].referenceTerrain;let opposingRevision=other.revision,geometryRevision=this.geometryRevision;
   const guarded:SolidCubeTerrain={...raw,get revision(){return raw.revision;},commitPreparedPatch:(binding,revision,blocks,capacity)=>{
    if(this.disposed||opposingRevision!==other.revision||geometryRevision!==this.geometryRevision)throw Error('The opposite surface or excavation changed. Start the edit again.');
    for(const block of blocks)for(let i=0;i<block.count;i++){assertHollowElevation(world,role,block.after[i]!);if(this.masks[role][block.indices[i]!]&&block.after[i]!==block.before[i])throw Error('This terrain supports an excavation. Remove or move the tunnel before sculpting its protected ground.');}
    return raw.commitPreparedPatch(binding,revision,blocks,capacity);
   }};
   const session=new CubeEditorSession(guarded,name,saved);session.beforeOperation=()=>{if(this.changing)throw Error('Wait for the excavation update.');opposingRevision=other.revision;geometryRevision=this.geometryRevision;this.historyScope='terrain';};this.sessions[role]=session;
  }
 }
 get active(){return this.sessions[this.selectedSurface];}get name(){return this._name;}set name(value:string){this._name=value;for(const s of Object.values(this.sessions))s.name=value;}
 get modified(){return this.name!==this.savedName||this.connectionHistory.stateId!==this.checkpoint||HOLLOW_ROLES.some(r=>this.sessions[r].modified);}
 get hasSaved(){return this.active.hasSaved;}get painting(){return HOLLOW_ROLES.some(r=>this.sessions[r].painting);}get processing(){return this.changing||HOLLOW_ROLES.some(r=>this.sessions[r].processing);}
 get locked(){return this._locked;}set locked(value:boolean){this._locked=value;for(const s of Object.values(this.sessions))s.locked=value;}
 get revision(){return this.geometryRevision;}
 get canUndo(){return this.historyScope==='connections'?this.connectionHistory.canUndo:this.active.history.canUndo;}get canRedo(){return this.historyScope==='connections'?this.connectionHistory.canRedo:this.active.history.canRedo;}
 async select(role:HollowCubeRole){if(!HOLLOW_ROLES.includes(role)||this.locked||this.changing)return;const at=performance.now();await this.active.drainForSave();this.selectedSurface=role;this.historyScope='terrain';this.status=`Ready to paint ${role==='exterior'?'outside':'inside'} · switched in ${Math.round(performance.now()-at)} ms`;this.changed();}
 async drainForSave(yieldWork?:()=>Promise<void>){for(const role of HOLLOW_ROLES)await this.sessions[role].drainForSave(yieldWork);if(this.changing)throw Error('Wait for the excavation update before saving.');}
 markSaved(name=this.name){this.name=this.savedName=name;for(const s of Object.values(this.sessions))s.markSaved(name);this.checkpoint=this.connectionHistory.stateId;this.changed();}
 private async prepare(input:HollowConnections,work:PersistenceWork={}){
  const started=performance.now(),revisions=HOLLOW_ROLES.map(r=>this.sessions[r].terrain.revision),epoch=this.geometryRevision,connections=validateHollowConnections(this.world,input),words=encode(connections);
  const masks={} as Record<HollowCubeRole,Uint8Array>;
  // Project conservative primitive bounds to each reference face. Expanded support
  // covers bilinear interpolation and edge gradients; computed only on geometry edits.
  const boxes=connections.passages.flatMap(p=>{const nodes=new Map(p.nodes.map(n=>[n.id,n]));return [...p.nodes.map(n=>({a:n.position,b:n.position,r:n.radiusMeters})),...p.segments.map(s=>({a:nodes.get(s.from)!.position,b:nodes.get(s.to)!.position,r:s.radiusMeters}))];});
  for(const role of HOLLOW_ROLES){const terrain=this.sessions[role].terrain,mask=new Uint8Array(terrain.sampleCount),pad=terrain.sampleSpacingMeters*2;masks[role]=mask;
   for(let i=0;i<terrain.sampleCount;i++){
    const key=terrain.keyAt(i),height=terrain.read(key);assertHollowElevation(this.world,role,height);
    if(boxes.length){const q=terrain.geometry.referencePosition(terrain.positionAt(terrain.owner(key)));if(boxes.some(b=>q.every((v,k)=>v>=Math.min(b.a[k]!,b.b[k]!)-b.r-pad&&v<=Math.max(b.a[k]!,b.b[k]!)+b.r+pad))){mask[i]=1;if(height!==0)throw Error('Excavation needs level ground at 0 m around its volume. Flatten this area to 0 m first.');}}
    if(i%8192===8191)await workStep(work,'Checking shell and excavation clearance',(HOLLOW_ROLES.indexOf(role)+i/terrain.sampleCount)/2);
   }
  }
  if(this.disposed||epoch!==this.geometryRevision||HOLLOW_ROLES.some((r,i)=>this.sessions[r].terrain.revision!==revisions[i]))throw Error('Terrain or excavation changed during validation. Retry the change.');
  return{connections,words,masks,ms:performance.now()-started};
 }
 async restore(input:HollowConnections,work:PersistenceWork={}){const ready=await this.prepare(input,work);this.connectionWords.set(ready.words);this.connections=ready.connections;this.masks=ready.masks;this.preparationMs=ready.ms;}
 async changeConnections(input:HollowConnections,replay?:boolean){
  if(this.locked||this.changing)throw Error('Wait for the current World operation.');
  await this.drainForSave();this.changing=true;this.changed();
  try{const ready=await this.prepare(input);if(replay===undefined)this.connectionHistory.replace(ready.words);else if(replay)this.connectionHistory.redo();else this.connectionHistory.undo();
   this.connections=ready.connections;this.masks=ready.masks;this.geometryRevision++;this.preparationMs=ready.ms;this.historyScope='connections';this.error='';this.status=`Entrances and excavation updated · ${Math.round(ready.ms)} ms`;this.geometryChanged();
  }finally{this.changing=false;this.changed();}
 }
 async replay(redo=false){if(this.historyScope==='terrain')return this.active.replay(redo);const words=this.connectionHistory.preview(redo);if(words)await this.changeConnections(decode(words),redo);}
 dispose(){this.disposed=true;for(const s of Object.values(this.sessions))s.dispose();this.changed=()=>{};this.geometryChanged=()=>{};}
}
export async function prepareHollowCubeDocument(world:HollowCubeWorld,name:string,saved=false,connections:HollowConnections={links:[],passages:[]},work:PersistenceWork={}){
 const editor=new HollowCubeDocument(world,name,saved);try{await editor.restore(connections,work);return{world,editor,preparationMs:editor.preparationMs};}catch(error){editor.dispose();throw error;}
}
