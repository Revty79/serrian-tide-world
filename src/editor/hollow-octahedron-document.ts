import {HOLLOW_OCTAHEDRON_ROLES,type HollowOctahedronRole} from '../surfaces/hollow-octahedron.ts';
import type {HollowOctahedronWorld} from '../terrain/hollow-octahedron.ts';
import {prepareOctahedronSession} from './octahedron-session.ts';
import type {PersistenceWork} from '../persistence/cooperative-work.ts';
type Prepared=Awaited<ReturnType<typeof prepareOctahedronSession>>;
/** The existing sessions retain numerical authority and history. This parent
 * owns only bank selection, host locking and the combined save checkpoint. */
export class HollowOctahedronDocument{
 readonly world:HollowOctahedronWorld;readonly surfaces:Record<HollowOctahedronRole,Prepared>;name:string;selectedSurface:HollowOctahedronRole;hasSaved:boolean;error='';changed=()=>{};private savedName:string;private savedRole:HollowOctahedronRole;private hostLocked=false;private switching=false;private closed=false;
 constructor(world:HollowOctahedronWorld,surfaces:Record<HollowOctahedronRole,Prepared>,name:string,saved:boolean,selected:HollowOctahedronRole){this.world=world;this.surfaces=surfaces;this.name=this.savedName=name;this.selectedSurface=this.savedRole=selected;this.hasSaved=saved;}
 get modified(){return this.name!==this.savedName||this.selectedSurface!==this.savedRole||HOLLOW_OCTAHEDRON_ROLES.some(r=>this.surfaces[r].editor.modified);}
 get painting(){return HOLLOW_OCTAHEDRON_ROLES.some(r=>this.surfaces[r].editor.painting);}
 get processing(){return this.switching||HOLLOW_OCTAHEDRON_ROLES.some(r=>this.surfaces[r].editor.processing);}
 get locked(){return this.hostLocked||this.switching||this.closed;}set locked(v:boolean){this.hostLocked=v;this.syncLock();}
 private syncLock(){for(const r of HOLLOW_OCTAHEDRON_ROLES)this.surfaces[r].editor.locked=this.locked;}
 markSaved(name:string){this.name=this.savedName=name;this.savedRole=this.selectedSurface;this.hasSaved=true;for(const r of HOLLOW_OCTAHEDRON_ROLES)this.surfaces[r].editor.markSaved(name);this.changed();}
 async drainForSave(yieldWork?:()=>Promise<void>){for(const r of HOLLOW_OCTAHEDRON_ROLES)await this.surfaces[r].editor.drainForSave(yieldWork);}
 async select(role:HollowOctahedronRole){if(!HOLLOW_OCTAHEDRON_ROLES.includes(role))throw RangeError('Unknown octahedron bank.');if(this.locked||this.selectedSurface===role)return;this.switching=true;this.syncLock();this.changed();try{await this.surfaces[this.selectedSurface].editor.drainForSave();if(this.closed)throw Error('Octahedron document closed during surface selection.');this.selectedSurface=role;this.error='';}catch(e){this.error=String(e);throw e;}finally{this.switching=false;this.syncLock();this.changed();}}
 dispose(){this.closed=true;for(const r of HOLLOW_OCTAHEDRON_ROLES)this.surfaces[r].editor.dispose();this.changed=()=>{};}
}
export async function prepareHollowOctahedronDocument(world:HollowOctahedronWorld,name:string,saved=false,selected:HollowOctahedronRole='exterior',work:PersistenceWork={}){if(!HOLLOW_OCTAHEDRON_ROLES.includes(selected))throw RangeError('Unknown octahedron bank.');const started=performance.now(),surfaces={} as Record<HollowOctahedronRole,Prepared>;try{for(const r of HOLLOW_OCTAHEDRON_ROLES)surfaces[r]=await prepareOctahedronSession(world.surfaces[r].terrain,name,saved,work);return{editor:new HollowOctahedronDocument(world,surfaces,name,saved,selected),preparationMs:performance.now()-started};}catch(e){for(const r of HOLLOW_OCTAHEDRON_ROLES)surfaces[r]?.editor.dispose();throw e;}}
