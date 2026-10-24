import type {FloatingIslandTerrain} from '../terrain/floating-island.ts';
import {prepareFloatingIslandSession} from './floating-island-session.ts';
import type {PersistenceWork} from '../persistence/cooperative-work.ts';
import {islandPlacement,validateIslandArrangement,type IslandDescriptor,type IslandPlacement} from './floating-islands-placement.ts';
import type {CylinderControls} from './cylinder-controls.ts';
import {floatingIslandBrushPolicy} from '../terrain/floating-island-brush.ts';
import {defaultCylinderControls} from './cylinder-controls.ts';
export interface IslandComponent{readonly id:string;readonly name:string;readonly terrain:FloatingIslandTerrain;readonly placement:IslandPlacement}
type Prepared=Awaited<ReturnType<typeof prepareFloatingIslandSession>>;
function frozenComponent(c:IslandComponent){return Object.isFrozen(c)&&Object.isFrozen(c.placement)?c:Object.freeze({...c,placement:islandPlacement(c.placement)});}
type Arrangement={islands:readonly IslandComponent[];selected:string};
export function islandDescriptor(c:IslandComponent):IslandDescriptor{return{id:c.id,name:c.name,terrainId:c.terrain.metadata.terrainId,geometry:c.terrain.geometry.metadata,subdivisions:c.terrain.subdivisions as 128|256,placement:c.placement};}
/** Parent owns membership/placement only. Accepted per-island sessions own all
 * geography, brushes, history and derived display resources. Inactive islands
 * are prepared lazily; selecting or painting never re-prepares their neighbors. */
export class FloatingIslandsDocument{
 readonly worldId:string;name:string;hasSaved:boolean;islands:readonly IslandComponent[];selectedIsland:string;controls:CylinderControls;error='';changed=()=>{};
 private sessions=new Map<string,Prepared>();private past:Arrangement[]=[];private future:Arrangement[]=[];private busy=false;private hostLocked=false;private closed=false;private savedStamp:string;
 constructor(worldId:string,islands:readonly IslandComponent[],name:string,saved:boolean,selected:string,first:Prepared,controls?:CylinderControls){this.worldId=worldId;this.islands=Object.freeze(islands.map(frozenComponent));this.name=name;this.hasSaved=saved;this.selectedIsland=selected;this.sessions.set(selected,first);const p=floatingIslandBrushPolicy(first.terrain);this.controls=controls??{...defaultCylinderControls(first.terrain.geometry.scaleMeters),radius:String(p.defaultRadius)};this.savedStamp=this.stamp();}
 get current(){return this.islands.find(c=>c.id===this.selectedIsland)!;}
 get selectedSession(){const p=this.sessions.get(this.selectedIsland);if(!p)throw Error('Selected island display is not prepared.');return p;}
 session(id:string){return this.sessions.get(id);}
 stamp(){return JSON.stringify({worldId:this.worldId,name:this.name,islands:this.islands.map(islandDescriptor),selected:this.selectedIsland,controls:this.controls});}
 get modified(){return this.stamp()!==this.savedStamp||this.islands.some(c=>this.sessions.get(c.id)?.editor.modified);}
 get painting(){return [...this.sessions.values()].some(p=>p.editor.painting);}
 get processing(){return this.busy||[...this.sessions.values()].some(p=>p.editor.processing);}
 get locked(){return this.closed||this.hostLocked||this.busy;}set locked(v:boolean){this.hostLocked=v;this.syncLock();}
 private syncLock(){for(const p of this.sessions.values())p.editor.locked=this.locked;}
 get canUndoArrangement(){return !this.locked&&this.past.length>0;}get canRedoArrangement(){return !this.locked&&this.future.length>0;}
 get arrangementHistory(){return{undo:this.past.length,redo:this.future.length,retainedComponents:this.retained().size};}
 private retained(){return new Map([...this.past,...this.future,{islands:this.islands,selected:this.selectedIsland}].flatMap(s=>s.islands.map(c=>[c.id,c] as const)));}
 private trim(){while(this.past.length>8)this.past.shift();while(this.retainedSamples()>1_769_478&&this.past.length)this.past.shift();while(this.retainedSamples()>1_769_478&&this.future.length)this.future.shift();const keep=this.retained();for(const[id,p]of this.sessions)if(!keep.has(id)){p.editor.dispose();this.sessions.delete(id);}}
 private retainedSamples(){return [...this.retained().values()].reduce((s,c)=>s+c.terrain.sampleCount,0);}
 private replace(islands:readonly IslandComponent[],selected=this.selectedIsland){validateIslandArrangement(this.worldId,islands.map(islandDescriptor));if(!islands.some(c=>c.id===selected))throw Error('Missing selected island.');this.past.push({islands:this.islands,selected:this.selectedIsland});this.future=[];this.islands=Object.freeze(islands.map(frozenComponent));this.selectedIsland=selected;const policy=floatingIslandBrushPolicy(this.current.terrain);this.controls={...this.controls,radius:String(Math.max(policy.minimum,Math.min(policy.maximum*.999,Number.isFinite(Number(this.controls.radius))?Number(this.controls.radius):policy.defaultRadius)))};this.trim();this.error='';this.changed();}
 async prepare(id:string,work:PersistenceWork={}){const old=this.sessions.get(id);if(old)return old;const c=this.retained().get(id);if(!c)throw Error('Unknown island.');const p=await prepareFloatingIslandSession(c.terrain,this.name,this.hasSaved,work);if(this.closed){p.editor.dispose();throw Error('Island World closed during preparation.');}this.sessions.set(id,p);this.syncLock();return p;}
 async exclusive<T>(operation:()=>Promise<T>){if(this.locked)throw Error('Finish the current island operation first.');this.busy=true;this.syncLock();this.changed();try{await this.drainForSave();const result=await operation();this.error='';return result;}catch(e){this.error=e instanceof Error?e.message:String(e);throw e;}finally{this.busy=false;this.syncLock();this.changed();}}
 async select(id:string){if(id===this.selectedIsland)return;await this.exclusive(async()=>{if(!this.islands.some(c=>c.id===id))throw Error('Unknown island.');await this.prepare(id);this.selectedIsland=id;const p=floatingIslandBrushPolicy(this.current.terrain);this.controls={...this.controls,radius:String(Math.max(p.minimum,Math.min(p.maximum*.999,Number.isFinite(Number(this.controls.radius))?Number(this.controls.radius):p.defaultRadius)))};});}
 async add(c:IslandComponent){await this.exclusive(async()=>{validateIslandArrangement(this.worldId,[...this.islands,c].map(islandDescriptor));const p=await prepareFloatingIslandSession(c.terrain,this.name,false);if(this.closed){p.editor.dispose();throw Error('Island World closed during creation.');}this.sessions.set(c.id,p);this.replace([...this.islands,c],c.id);});}
 async move(placement:IslandPlacement){await this.exclusive(async()=>this.replace(this.islands.map(c=>c.id===this.selectedIsland?Object.freeze({...c,placement}):c)));}
 async remove(){await this.exclusive(async()=>{if(this.islands.length<=1)throw Error('Keep at least one island in the World.');const next=this.islands.filter(c=>c.id!==this.selectedIsland),selected=next[0]!.id;await this.prepare(selected);this.replace(next,selected);});}
 async replay(redo=false){await this.exclusive(async()=>{const stack=redo?this.future:this.past,next=stack.at(-1);if(!next)return;await this.prepare(next.selected);stack.pop();(redo?this.past:this.future).push({islands:this.islands,selected:this.selectedIsland});this.islands=next.islands;this.selectedIsland=next.selected;this.trim();});}
 async drainForSave(yieldWork?:()=>Promise<void>){for(const p of this.sessions.values())await p.editor.drainForSave(yieldWork);}
 markSaved(name:string){this.name=name;this.hasSaved=true;for(const p of this.sessions.values())p.editor.markSaved(name);this.savedStamp=this.stamp();this.changed();}
 dispose(){this.closed=true;for(const p of this.sessions.values())p.editor.dispose();this.sessions.clear();this.past=[];this.future=[];this.changed=()=>{};}
}
export async function prepareFloatingIslandsDocument(worldId:string,islands:readonly IslandComponent[],name:string,saved=false,selected=islands[0]!.id,work:PersistenceWork={},controls?:CylinderControls){validateIslandArrangement(worldId,islands.map(islandDescriptor));const c=islands.find(c=>c.id===selected);if(!c)throw Error('Saved island selection is missing.');const started=performance.now(),p=await prepareFloatingIslandSession(c.terrain,name,saved,work);try{return{editor:new FloatingIslandsDocument(worldId,Object.freeze([...islands]),name,saved,selected,p,controls),preparationMs:performance.now()-started};}catch(e){p.editor.dispose();throw e;}}
