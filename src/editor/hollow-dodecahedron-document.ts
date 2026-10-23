import {HOLLOW_DODECAHEDRON_ROLES,type HollowDodecahedronRole} from '../surfaces/hollow-dodecahedron.ts';
import type {HollowDodecahedronWorld} from '../terrain/hollow-dodecahedron.ts';
import {prepareDodecahedronSession} from './dodecahedron-session.ts';
import type {PersistenceWork} from '../persistence/cooperative-work.ts';
type Prepared=Awaited<ReturnType<typeof prepareDodecahedronSession>>;
/** The existing sessions retain numerical authority and history. This parent
 * owns only bank selection, host locking and the combined save checkpoint. */
export class HollowDodecahedronDocument{
 readonly world:HollowDodecahedronWorld;readonly surfaces:Record<HollowDodecahedronRole,Prepared>;name:string;selectedSurface:HollowDodecahedronRole;hasSaved:boolean;error='';changed=()=>{};private savedName:string;private savedRole:HollowDodecahedronRole;private hostLocked=false;private switching=false;private closed=false;
 constructor(world:HollowDodecahedronWorld,surfaces:Record<HollowDodecahedronRole,Prepared>,name:string,saved:boolean,selected:HollowDodecahedronRole){this.world=world;this.surfaces=surfaces;this.name=this.savedName=name;this.selectedSurface=this.savedRole=selected;this.hasSaved=saved;}
 get modified(){return this.name!==this.savedName||this.selectedSurface!==this.savedRole||HOLLOW_DODECAHEDRON_ROLES.some(r=>this.surfaces[r].editor.modified);}
 get painting(){return HOLLOW_DODECAHEDRON_ROLES.some(r=>this.surfaces[r].editor.painting);}
 get processing(){return this.switching||HOLLOW_DODECAHEDRON_ROLES.some(r=>this.surfaces[r].editor.processing);}
 get locked(){return this.hostLocked||this.switching||this.closed;}set locked(v:boolean){this.hostLocked=v;this.syncLock();}
 private syncLock(){for(const r of HOLLOW_DODECAHEDRON_ROLES)this.surfaces[r].editor.locked=this.locked;}
 markSaved(name:string){this.name=this.savedName=name;this.savedRole=this.selectedSurface;this.hasSaved=true;for(const r of HOLLOW_DODECAHEDRON_ROLES)this.surfaces[r].editor.markSaved(name);this.changed();}
 async drainForSave(yieldWork?:()=>Promise<void>){for(const r of HOLLOW_DODECAHEDRON_ROLES)await this.surfaces[r].editor.drainForSave(yieldWork);}
 async select(role:HollowDodecahedronRole){if(!HOLLOW_DODECAHEDRON_ROLES.includes(role))throw RangeError('Unknown dodecahedron bank.');if(this.locked||this.selectedSurface===role)return;this.switching=true;this.syncLock();this.changed();try{await this.surfaces[this.selectedSurface].editor.drainForSave();if(this.closed)throw Error('Dodecahedron document closed during surface selection.');this.selectedSurface=role;this.error='';}catch(e){this.error=String(e);throw e;}finally{this.switching=false;this.syncLock();this.changed();}}
 dispose(){this.closed=true;for(const r of HOLLOW_DODECAHEDRON_ROLES)this.surfaces[r].editor.dispose();this.changed=()=>{};}
}
export async function prepareHollowDodecahedronDocument(world:HollowDodecahedronWorld,name:string,saved=false,selected:HollowDodecahedronRole='exterior',work:PersistenceWork={}){if(!HOLLOW_DODECAHEDRON_ROLES.includes(selected))throw RangeError('Unknown dodecahedron bank.');const started=performance.now(),surfaces={} as Record<HollowDodecahedronRole,Prepared>;try{for(const r of HOLLOW_DODECAHEDRON_ROLES)surfaces[r]=await prepareDodecahedronSession(world.surfaces[r].terrain,name,saved,work);return{editor:new HollowDodecahedronDocument(world,surfaces,name,saved,selected),preparationMs:performance.now()-started};}catch(e){for(const r of HOLLOW_DODECAHEDRON_ROLES)surfaces[r]?.editor.dispose();throw e;}}
