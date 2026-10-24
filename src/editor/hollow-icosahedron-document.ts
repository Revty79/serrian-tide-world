import {HOLLOW_ICOSAHEDRON_ROLES,type HollowIcosahedronRole} from '../surfaces/hollow-icosahedron.ts';
import type {HollowIcosahedronWorld} from '../terrain/hollow-icosahedron.ts';
import {prepareIcosahedronSession} from './icosahedron-session.ts';
import type {PersistenceWork} from '../persistence/cooperative-work.ts';
type Prepared=Awaited<ReturnType<typeof prepareIcosahedronSession>>;
/** The existing sessions retain numerical authority and history. This parent
 * owns only bank selection, host locking and the combined save checkpoint. */
export class HollowIcosahedronDocument{
 readonly world:HollowIcosahedronWorld;readonly surfaces:Record<HollowIcosahedronRole,Prepared>;name:string;selectedSurface:HollowIcosahedronRole;hasSaved:boolean;error='';changed=()=>{};private savedName:string;private savedRole:HollowIcosahedronRole;private hostLocked=false;private switching=false;private closed=false;
 constructor(world:HollowIcosahedronWorld,surfaces:Record<HollowIcosahedronRole,Prepared>,name:string,saved:boolean,selected:HollowIcosahedronRole){this.world=world;this.surfaces=surfaces;this.name=this.savedName=name;this.selectedSurface=this.savedRole=selected;this.hasSaved=saved;}
 get modified(){return this.name!==this.savedName||this.selectedSurface!==this.savedRole||HOLLOW_ICOSAHEDRON_ROLES.some(r=>this.surfaces[r].editor.modified);}
 get painting(){return HOLLOW_ICOSAHEDRON_ROLES.some(r=>this.surfaces[r].editor.painting);}
 get processing(){return this.switching||HOLLOW_ICOSAHEDRON_ROLES.some(r=>this.surfaces[r].editor.processing);}
 get locked(){return this.hostLocked||this.switching||this.closed;}set locked(v:boolean){this.hostLocked=v;this.syncLock();}
 private syncLock(){for(const r of HOLLOW_ICOSAHEDRON_ROLES)this.surfaces[r].editor.locked=this.locked;}
 markSaved(name:string){this.name=this.savedName=name;this.savedRole=this.selectedSurface;this.hasSaved=true;for(const r of HOLLOW_ICOSAHEDRON_ROLES)this.surfaces[r].editor.markSaved(name);this.changed();}
 async drainForSave(yieldWork?:()=>Promise<void>){for(const r of HOLLOW_ICOSAHEDRON_ROLES)await this.surfaces[r].editor.drainForSave(yieldWork);}
 async select(role:HollowIcosahedronRole){if(!HOLLOW_ICOSAHEDRON_ROLES.includes(role))throw RangeError('Unknown icosahedron bank.');if(this.locked||this.selectedSurface===role)return;this.switching=true;this.syncLock();this.changed();try{await this.surfaces[this.selectedSurface].editor.drainForSave();if(this.closed)throw Error('Icosahedron document closed during surface selection.');this.selectedSurface=role;this.error='';}catch(e){this.error=String(e);throw e;}finally{this.switching=false;this.syncLock();this.changed();}}
 dispose(){this.closed=true;for(const r of HOLLOW_ICOSAHEDRON_ROLES)this.surfaces[r].editor.dispose();this.changed=()=>{};}
}
export async function prepareHollowIcosahedronDocument(world:HollowIcosahedronWorld,name:string,saved=false,selected:HollowIcosahedronRole='exterior',work:PersistenceWork={}){if(!HOLLOW_ICOSAHEDRON_ROLES.includes(selected))throw RangeError('Unknown icosahedron bank.');const started=performance.now(),surfaces={} as Record<HollowIcosahedronRole,Prepared>;try{for(const r of HOLLOW_ICOSAHEDRON_ROLES)surfaces[r]=await prepareIcosahedronSession(world.surfaces[r].terrain,name,saved,work);return{editor:new HollowIcosahedronDocument(world,surfaces,name,saved,selected),preparationMs:performance.now()-started};}catch(e){for(const r of HOLLOW_ICOSAHEDRON_ROLES)surfaces[r]?.editor.dispose();throw e;}}
