import {HOLLOW_TRAPEZOHEDRON_ROLES,type HollowTrapezohedronRole} from '../surfaces/hollow-trapezohedron.ts';
import type {HollowTrapezohedronWorld} from '../terrain/hollow-trapezohedron.ts';
import {prepareTrapezohedronSession} from './trapezohedron-session.ts';
import type {PersistenceWork} from '../persistence/cooperative-work.ts';
type Prepared=Awaited<ReturnType<typeof prepareTrapezohedronSession>>;
/** The existing sessions retain numerical authority and history. This parent
 * owns only bank selection, host locking and the combined save checkpoint. */
export class HollowTrapezohedronDocument{
 readonly world:HollowTrapezohedronWorld;readonly surfaces:Record<HollowTrapezohedronRole,Prepared>;name:string;selectedSurface:HollowTrapezohedronRole;hasSaved:boolean;error='';changed=()=>{};private savedName:string;private savedRole:HollowTrapezohedronRole;private hostLocked=false;private switching=false;private closed=false;
 constructor(world:HollowTrapezohedronWorld,surfaces:Record<HollowTrapezohedronRole,Prepared>,name:string,saved:boolean,selected:HollowTrapezohedronRole){this.world=world;this.surfaces=surfaces;this.name=this.savedName=name;this.selectedSurface=this.savedRole=selected;this.hasSaved=saved;}
 get modified(){return this.name!==this.savedName||this.selectedSurface!==this.savedRole||HOLLOW_TRAPEZOHEDRON_ROLES.some(r=>this.surfaces[r].editor.modified);}
 get painting(){return HOLLOW_TRAPEZOHEDRON_ROLES.some(r=>this.surfaces[r].editor.painting);}
 get processing(){return this.switching||HOLLOW_TRAPEZOHEDRON_ROLES.some(r=>this.surfaces[r].editor.processing);}
 get locked(){return this.hostLocked||this.switching||this.closed;}set locked(v:boolean){this.hostLocked=v;this.syncLock();}
 private syncLock(){for(const r of HOLLOW_TRAPEZOHEDRON_ROLES)this.surfaces[r].editor.locked=this.locked;}
 markSaved(name:string){this.name=this.savedName=name;this.savedRole=this.selectedSurface;this.hasSaved=true;for(const r of HOLLOW_TRAPEZOHEDRON_ROLES)this.surfaces[r].editor.markSaved(name);this.changed();}
 async drainForSave(yieldWork?:()=>Promise<void>){for(const r of HOLLOW_TRAPEZOHEDRON_ROLES)await this.surfaces[r].editor.drainForSave(yieldWork);}
 async select(role:HollowTrapezohedronRole){if(!HOLLOW_TRAPEZOHEDRON_ROLES.includes(role))throw RangeError('Unknown trapezohedron bank.');if(this.locked||this.selectedSurface===role)return;this.switching=true;this.syncLock();this.changed();try{await this.surfaces[this.selectedSurface].editor.drainForSave();if(this.closed)throw Error('Trapezohedron document closed during surface selection.');this.selectedSurface=role;this.error='';}catch(e){this.error=String(e);throw e;}finally{this.switching=false;this.syncLock();this.changed();}}
 dispose(){this.closed=true;for(const r of HOLLOW_TRAPEZOHEDRON_ROLES)this.surfaces[r].editor.dispose();this.changed=()=>{};}
}
export async function prepareHollowTrapezohedronDocument(world:HollowTrapezohedronWorld,name:string,saved=false,selected:HollowTrapezohedronRole='exterior',work:PersistenceWork={}){if(!HOLLOW_TRAPEZOHEDRON_ROLES.includes(selected))throw RangeError('Unknown trapezohedron bank.');const started=performance.now(),surfaces={} as Record<HollowTrapezohedronRole,Prepared>;try{for(const r of HOLLOW_TRAPEZOHEDRON_ROLES)surfaces[r]=await prepareTrapezohedronSession(world.surfaces[r].terrain,name,saved,work);return{editor:new HollowTrapezohedronDocument(world,surfaces,name,saved,selected),preparationMs:performance.now()-started};}catch(e){for(const r of HOLLOW_TRAPEZOHEDRON_ROLES)surfaces[r]?.editor.dispose();throw e;}}
