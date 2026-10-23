import {HOLLOW_TETRAHEDRON_ROLES,type HollowTetrahedronRole} from '../surfaces/hollow-tetrahedron.ts';
import type {HollowTetrahedronWorld} from '../terrain/hollow-tetrahedron.ts';
import {prepareTetrahedronSession} from './tetrahedron-session.ts';
import type {PersistenceWork} from '../persistence/cooperative-work.ts';
import {polyhedronMaterial} from '../surfaces/polyhedron-material.ts';
import {PolyhedronConnectionStore} from './polyhedron-connection-store.ts';
import type {PolyhedronConnections} from './polyhedron-connections.ts';
import type {WordHistoryJournal} from './terrain-history.ts';
type Prepared=Awaited<ReturnType<typeof prepareTetrahedronSession>>;
/** The existing sessions retain numerical authority and history. This parent
 * owns only bank selection, host locking and the combined save checkpoint. */
export class HollowTetrahedronDocument{
 readonly world:HollowTetrahedronWorld;readonly surfaces:Record<HollowTetrahedronRole,Prepared>;readonly connectionStore:PolyhedronConnectionStore;name:string;selectedSurface:HollowTetrahedronRole;hasSaved:boolean;error='';changed=()=>{};private savedName:string;private savedRole:HollowTetrahedronRole;private hostLocked=false;private switching=false;private closed=false;private connectionBusy=false;
 constructor(world:HollowTetrahedronWorld,surfaces:Record<HollowTetrahedronRole,Prepared>,name:string,saved:boolean,selected:HollowTetrahedronRole){this.world=world;this.surfaces=surfaces;this.name=this.savedName=name;this.selectedSurface=this.savedRole=selected;this.hasSaved=saved;this.connectionStore=new PolyhedronConnectionStore(polyhedronMaterial(world.surfaces.exterior.geometry,world.surfaces.interior.geometry),{exterior:surfaces.exterior.terrain,interior:surfaces.interior.terrain},{locked:()=>this.locked,setBusy:busy=>{this.connectionBusy=busy;this.syncLock();},drain:async()=>{for(const r of HOLLOW_TETRAHEDRON_ROLES)await surfaces[r].editor.drainForSave();},changed:()=>this.changed()});for(const r of HOLLOW_TETRAHEDRON_ROLES)surfaces[r].editor.beforeOperation=()=>{this.connectionStore.historyScope='terrain';this.changed();};}
 get modified(){return this.connectionStore.modified||this.name!==this.savedName||this.selectedSurface!==this.savedRole||HOLLOW_TETRAHEDRON_ROLES.some(r=>this.surfaces[r].editor.modified);}
 get painting(){return HOLLOW_TETRAHEDRON_ROLES.some(r=>this.surfaces[r].editor.painting);}
 get processing(){return this.connectionBusy||this.switching||HOLLOW_TETRAHEDRON_ROLES.some(r=>this.surfaces[r].editor.processing);}
 get locked(){return this.hostLocked||this.switching||this.closed||this.connectionBusy;}set locked(v:boolean){this.hostLocked=v;this.syncLock();}
 private syncLock(){for(const r of HOLLOW_TETRAHEDRON_ROLES)this.surfaces[r].editor.locked=this.locked;}
 markSaved(name:string){this.name=this.savedName=name;this.savedRole=this.selectedSurface;this.hasSaved=true;this.connectionStore.markSaved();for(const r of HOLLOW_TETRAHEDRON_ROLES)this.surfaces[r].editor.markSaved(name);this.changed();}
 async drainForSave(yieldWork?:()=>Promise<void>){if(this.connectionBusy)throw Error('Wait for the physical connection update.');for(const r of HOLLOW_TETRAHEDRON_ROLES)await this.surfaces[r].editor.drainForSave(yieldWork);}
 async select(role:HollowTetrahedronRole){if(!HOLLOW_TETRAHEDRON_ROLES.includes(role))throw RangeError('Unknown tetrahedron bank.');if(this.locked||this.selectedSurface===role)return;this.switching=true;this.syncLock();this.changed();try{await this.surfaces[this.selectedSurface].editor.drainForSave();if(this.closed)throw Error('Tetrahedron document closed during surface selection.');this.selectedSurface=role;this.error='';}catch(e){this.error=String(e);throw e;}finally{this.switching=false;this.syncLock();this.changed();}}
 dispose(){this.closed=true;this.connectionStore.dispose();for(const r of HOLLOW_TETRAHEDRON_ROLES)this.surfaces[r].editor.dispose();this.changed=()=>{};}
}
export async function prepareHollowTetrahedronDocument(world:HollowTetrahedronWorld,name:string,saved=false,selected:HollowTetrahedronRole='exterior',work:PersistenceWork={},connections?:PolyhedronConnections,journal?:WordHistoryJournal){if(!HOLLOW_TETRAHEDRON_ROLES.includes(selected))throw RangeError('Unknown tetrahedron bank.');const started=performance.now(),surfaces={} as Record<HollowTetrahedronRole,Prepared>;try{for(const r of HOLLOW_TETRAHEDRON_ROLES)surfaces[r]=await prepareTetrahedronSession(world.surfaces[r].terrain,name,saved,work);const editor=new HollowTetrahedronDocument(world,surfaces,name,saved,selected);try{if(connections)await editor.connectionStore.restoreConnections(connections,journal,work);return{editor,preparationMs:performance.now()-started};}catch(e){editor.dispose();throw e;}}catch(e){for(const r of HOLLOW_TETRAHEDRON_ROLES)surfaces[r]?.editor.dispose();throw e;}}
