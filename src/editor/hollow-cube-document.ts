import {CubeEditorSession} from './cube-editor-session.ts';
import {TerrainHistory} from './terrain-history.ts';
import type {HollowCubeWorld} from '../terrain/hollow-cube.ts';
import type {HollowCubeRole} from '../surfaces/hollow-cube.ts';
import {validateLinkedEntrance,type LinkedEntrance,type PhysicalPassage} from '../surfaces/passages.ts';
import {validateHollowCubePassage} from '../surfaces/hollow-cube-passages.ts';
import {cubePatchBlocks,MAX_CUBE_PATCH_SAMPLES,type SolidCubeTerrain} from '../terrain/solid-cube.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';
import {SOLID_CUBE_FACES,SOLID_CUBE_FRAMES,cubeDot} from '../surfaces/solid-cube.ts';

export interface HollowConnections {readonly links:readonly LinkedEntrance[];readonly passages:readonly PhysicalPassage[]}
export const HOLLOW_CONNECTION_BYTES=256*1024;
export const HOLLOW_PRIMITIVE_LIMIT=48;
export const HOLLOW_ROLES=['exterior','interior'] as const;
const exactFields=(value:unknown,keys:string[])=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==keys.sort().join(','))throw RangeError('Unsupported entrance or excavation fields.');};
const denseArray=(value:unknown,max:number)=>{if(!Array.isArray(value)||value.length>max||Object.keys(value).length!==value.length||Object.keys(value).some((key,i)=>key!==String(i)))throw RangeError('World connections require bounded dense arrays.');};
const boundedId=(value:unknown)=>{if(typeof value!=='string'||value.length<1||value.length>128||!value.trim())throw RangeError('World connection identities must contain 1–128 characters.');};
const exactPosition=(p:unknown)=>{exactFields(p,['worldId','surfaceId','patchId','u','v']);const q=p as {worldId:string;surfaceId:string;patchId:string};boundedId(q.worldId);boundedId(q.surfaceId);boundedId(q.patchId);};
const encode=(value:HollowConnections)=>{const bytes=new TextEncoder().encode(JSON.stringify(value));if(bytes.length>HOLLOW_CONNECTION_BYTES-4)throw RangeError('Entrances and tunnels exceed the 256 KiB World limit.');const words=new Uint32Array(HOLLOW_CONNECTION_BYTES/4);words[0]=bytes.length;new Uint8Array(words.buffer,4).set(bytes);return words;};
const decode=(words:Uint32Array):HollowConnections=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(words.buffer,words.byteOffset+4,words[0])));
export function validateHollowConnections(world:HollowCubeWorld,input:HollowConnections):HollowConnections {
 if(!input||Object.keys(input).sort().join(',')!=='links,passages'||!Array.isArray(input.links)||!Array.isArray(input.passages)||input.links.length>128||input.passages.length>8)throw RangeError('Unsupported or oversized World connections.');
 denseArray(input.links,128);denseArray(input.passages,8);
 for(const link of input.links){exactFields(link,['kind','version','id','worldId','anchors']);boundedId(link.id);boundedId(link.worldId);denseArray(link.anchors,2);if(!Array.isArray(link.anchors)||link.anchors.length!==2)throw RangeError('Two entrance anchors are required.');for(const a of link.anchors){exactFields(a,['id','targetAnchorId','location']);boundedId(a.id);boundedId(a.targetAnchorId);if(a.location?.kind==='surface'){exactFields(a.location,['kind','position']);exactPosition(a.location.position);}else {exactFields(a.location,['kind','worldId','mapId','locationId']);const l=a.location;boundedId(l.worldId);boundedId(l.mapId);boundedId(l.locationId);}}}
 for(const p of input.passages){exactFields(p,['kind','version','id','worldId','geometry','nodes','segments','portals']);boundedId(p.id);boundedId(p.worldId);denseArray(p.nodes,48);denseArray(p.segments,48);denseArray(p.portals,48);if(!Array.isArray(p.nodes)||!Array.isArray(p.segments)||!Array.isArray(p.portals)||p.nodes.length+p.segments.length>HOLLOW_PRIMITIVE_LIMIT||p.portals.length>HOLLOW_PRIMITIVE_LIMIT)throw RangeError('Excavation exceeds its bounded geometry budget.');for(const n of p.nodes){exactFields(n,['id','position','radiusMeters']);boundedId(n.id);denseArray(n.position,3);if(n.position.length!==3||!n.position.every(Number.isFinite))throw RangeError('Finite dense three-dimensional passage position required.');if(n.radiusMeters<world.dimensions.outerSideLengthMeters*1e-5)throw RangeError('Excavation radius is below the supported display precision: use at least 0.001% of the outer side length.');}for(const s of p.segments){exactFields(s,['id','from','to','radiusMeters']);boundedId(s.id);boundedId(s.from);boundedId(s.to);if(s.radiusMeters<world.dimensions.outerSideLengthMeters*1e-5)throw RangeError('Tunnel segment radius is below supported display precision.');}for(const a of p.portals){exactFields(a,['id','nodeId','position','apertureRadiusMeters']);boundedId(a.id);boundedId(a.nodeId);exactPosition(a.position);}if(world.dimensions.nominalWallThicknessMeters<world.dimensions.outerSideLengthMeters*1e-4)throw RangeError('Shell is too thin for supported excavation precision. Use wall thickness of at least 0.01% of the outer side.');}
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

/** Same local support validation for host proposals and persisted payloads. */
export async function prepareHollowProtection(world:HollowCubeWorld,connections:HollowConnections,read:(role:HollowCubeRole,index:number)=>number,work:PersistenceWork={}){
  const masks={} as Record<HollowCubeRole,Uint8Array>;
  // Project conservative primitive bounds to each reference face. Expanded support
  // covers bilinear interpolation and edge gradients; computed only on geometry edits.
  const boxes=connections.passages.flatMap(p=>{const nodes=new Map(p.nodes.map(n=>[n.id,n]));return [...p.nodes.map(n=>({a:n.position,b:n.position,r:n.radiusMeters})),...p.segments.map(s=>({a:nodes.get(s.from)!.position,b:nodes.get(s.to)!.position,r:s.radiusMeters}))];});
  let slice=performance.now();
  for(const role of HOLLOW_ROLES){const terrain=world.surfaces[role].referenceTerrain,mask=new Uint8Array(terrain.sampleCount),step=terrain.sampleSpacingMeters,pad=step*2,half=terrain.metadata.geometry.sideLengthMeters/2,n=terrain.metadata.representation.cellsPerEdge;masks[role]=mask;

   // Only projected support rectangles need examining on geometry changes.
   // Canonical resolve also covers aliases without duplicate authority edits.
   for(const box of boxes)for(const face of SOLID_CUBE_FACES){const f=SOLID_CUBE_FRAMES[face],r=box.r+pad,normalA=cubeDot(box.a,f.normal),normalB=cubeDot(box.b,f.normal),intrusion=world.dimensions.nominalWallThicknessMeters/4,minLevel=role==='exterior'?half-intrusion:half,maxLevel=role==='interior'?half+intrusion:half;if(maxLevel<Math.min(normalA,normalB)-r||minLevel>Math.max(normalA,normalB)+r)continue;
    const range=(axis:typeof f.u)=>{const a=cubeDot(box.a,axis),b=cubeDot(box.b,axis);return[Math.max(0,Math.ceil((Math.min(a,b)-r+half)/step)),Math.min(n,Math.floor((Math.max(a,b)+r+half)/step))] as const;},[left,right]=range(f.u),[bottom,top]=range(f.v);
    for(let row=bottom;row<=top;row++){for(let column=left;column<=right;column++){const key=terrain.resolve({...terrain.metadata.identity,patchId:face,column,row});if(mask[key.index])continue;mask[key.index]=1;if(read(role,key.index)!==0)throw Error('Excavation needs level ground at exactly 0 m. Choose an untouched area, or dig before sculpting its supporting ground.');}
     if(performance.now()-slice>=4){await workStep(work,'Checking excavation support',(HOLLOW_ROLES.indexOf(role)+row/(n+1))/2);slice=performance.now();}}
   }
  }
 return masks;
}

/** Host for two accepted editors; this is neither another brush executor nor another history engine. */
export class HollowCubeDocument {
 readonly sessions:Record<HollowCubeRole,CubeEditorSession>;
 readonly connectionWords=new Uint32Array(HOLLOW_CONNECTION_BYTES/4);
 readonly connectionHistory=new TerrainHistory(this.connectionWords,4*1024*1024,64);
 connections:HollowConnections=Object.freeze({links:[],passages:[]});
 selectedSurface:HollowCubeRole='exterior';historyScope:'terrain'|'connections'='terrain';
 changed=()=>{};geometryChanged=()=>{};status='Ready to paint outside';error='';preparationMs=0;
 lastSurfaceSwitchMs=0;
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
    raw.read(binding);const key=raw.keyAt(binding.index),prepared=cubePatchBlocks(blocks,capacity==='history'?raw.sampleCount:MAX_CUBE_PATCH_SAMPLES);
    if(this.disposed||opposingRevision!==other.revision||geometryRevision!==this.geometryRevision)throw Error('The opposite surface or excavation changed. Start the edit again.');
    for(const block of prepared)for(let i=0;i<block.count;i++){assertHollowElevation(world,role,block.after[i]!);if(this.masks[role][block.indices[i]!]&&!Object.is(block.after[i],block.before[i]))throw Error('This terrain supports an excavation. Remove or move the tunnel before sculpting its protected ground.');}
    return raw.commitPreparedPatch(key,revision,prepared,capacity);
   }};
   const session=new CubeEditorSession(guarded,name,saved);session.beforeOperation=()=>{if(this.changing)throw Error('Wait for the excavation update.');opposingRevision=other.revision;geometryRevision=this.geometryRevision;this.historyScope='terrain';this.changed();};this.sessions[role]=session;
  }
 }
 get active(){return this.sessions[this.selectedSurface];}get name(){return this._name;}set name(value:string){this._name=value;for(const s of Object.values(this.sessions))s.name=value;}
 get modified(){return this.name!==this.savedName||this.connectionHistory.stateId!==this.checkpoint||HOLLOW_ROLES.some(r=>this.sessions[r].modified);}
 get hasSaved(){return this.active.hasSaved;}get painting(){return HOLLOW_ROLES.some(r=>this.sessions[r].painting);}get processing(){return this.changing||HOLLOW_ROLES.some(r=>this.sessions[r].processing);}
 get locked(){return this._locked;}set locked(value:boolean){this._locked=value;for(const s of Object.values(this.sessions))s.locked=value;}
 get revision(){return this.geometryRevision;}
 get canUndo(){return this.historyScope==='connections'?this.connectionHistory.canUndo:this.active.history.canUndo;}get canRedo(){return this.historyScope==='connections'?this.connectionHistory.canRedo:this.active.history.canRedo;}
 async select(role:HollowCubeRole){if(!HOLLOW_ROLES.includes(role)||this.locked||this.changing)return;const at=performance.now();await this.active.drainForSave();this.selectedSurface=role;this.historyScope='terrain';this.lastSurfaceSwitchMs=performance.now()-at;this.status=`Ready to paint ${role==='exterior'?'outside':'inside'} · switched in ${Math.round(this.lastSurfaceSwitchMs)} ms`;this.changed();}
 async drainForSave(yieldWork?:()=>Promise<void>){for(const role of HOLLOW_ROLES)await this.sessions[role].drainForSave(yieldWork);if(this.changing)throw Error('Wait for the excavation update before saving.');}
 markSaved(name=this.name){this.name=this.savedName=name;for(const s of Object.values(this.sessions))s.markSaved(name);this.checkpoint=this.connectionHistory.stateId;this.changed();}
 private async prepare(input:HollowConnections,work:PersistenceWork={},validateAll=false){
  const started=performance.now(),revisions=HOLLOW_ROLES.map(r=>this.sessions[r].terrain.revision),epoch=this.geometryRevision,connections=validateHollowConnections(this.world,input),words=encode(connections);
  if(validateAll)for(const role of HOLLOW_ROLES){const terrain=this.sessions[role].terrain;let slice=performance.now();for(let i=0;i<terrain.sampleCount;i++){assertHollowElevation(this.world,role,terrain.read(terrain.keyAt(i)));if(i%1024===1023&&performance.now()-slice>=4){await workStep(work,'Validating both surface envelopes',(HOLLOW_ROLES.indexOf(role)+i/terrain.sampleCount)/2);slice=performance.now();}}}
  const masks=await prepareHollowProtection(this.world,connections,(role,index)=>{const t=this.sessions[role].terrain;return t.read(t.keyAt(index));},work);
  if(this.disposed||epoch!==this.geometryRevision||HOLLOW_ROLES.some((r,i)=>this.sessions[r].terrain.revision!==revisions[i]))throw Error('Terrain or excavation changed during validation. Retry the change.');
  return{connections,words,masks,ms:performance.now()-started};
 }
 async restore(input:HollowConnections,work:PersistenceWork={}){const ready=await this.prepare(input,work,true);this.connectionWords.set(ready.words);this.connections=ready.connections;this.masks=ready.masks;this.preparationMs=ready.ms;}
 async changeConnections(input:HollowConnections,replay?:boolean){
  if(this.locked||this.changing)throw Error('Wait for the current World operation.');
  this.changing=true;for(const s of Object.values(this.sessions))s.locked=true;this.changed();
  try{for(const role of HOLLOW_ROLES)await this.sessions[role].drainForSave();const ready=await this.prepare(input,{progress:(stage,fraction)=>{this.status=`${stage} · ${Math.round(fraction*100)}%`;this.changed();}});if(replay===undefined)this.connectionHistory.replace(ready.words);else if(replay)this.connectionHistory.redo();else this.connectionHistory.undo();
   this.connections=ready.connections;this.masks=ready.masks;this.geometryRevision++;this.preparationMs=ready.ms;this.historyScope='connections';this.error='';this.status=`Entrances and excavation updated · ${Math.round(ready.ms)} ms`;this.geometryChanged();
  }finally{this.changing=false;for(const s of Object.values(this.sessions))s.locked=this.locked;this.changed();}
 }
 async replay(redo=false){if(this.historyScope==='terrain')return this.active.replay(redo);const words=this.connectionHistory.preview(redo);if(words)await this.changeConnections(decode(words),redo);}
 dispose(){this.disposed=true;for(const s of Object.values(this.sessions))s.dispose();this.changed=()=>{};this.geometryChanged=()=>{};}
}
export async function prepareHollowCubeDocument(world:HollowCubeWorld,name:string,saved=false,connections:HollowConnections={links:[],passages:[]},work:PersistenceWork={}){
 const editor=new HollowCubeDocument(world,name,saved);try{await editor.restore(connections,work);return{world,editor,preparationMs:editor.preparationMs};}catch(error){editor.dispose();throw error;}
}
