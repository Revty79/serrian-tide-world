import {prepareSphericalSession} from './prepare-spherical-session.ts';
import {HOLLOW_SPHERE_ROLES,type HollowSphereRole} from '../surfaces/hollow-sphere.ts';
import type {HollowSphereWorld} from '../terrain/hollow-sphere.ts';
import type {PersistenceWork} from '../persistence/cooperative-work.ts';
type Prepared=Awaited<ReturnType<typeof prepareSphericalSession>>;
/** Parent lifecycle only. Each surface retains the accepted spherical session. */
export class HollowSphereDocument {
 readonly world:HollowSphereWorld;readonly surfaces:Record<HollowSphereRole,Prepared>;
 name:string;hasSaved:boolean;selectedSurface:HollowSphereRole;error='';changed=()=>{};
 private checkpointName:string;private checkpointRole:HollowSphereRole;private hostLocked=false;private switching=false;
 constructor(world:HollowSphereWorld,surfaces:Record<HollowSphereRole,Prepared>,name:string,saved:boolean,selected:HollowSphereRole){this.world=world;this.surfaces=surfaces;this.name=this.checkpointName=name;this.hasSaved=saved;this.selectedSurface=this.checkpointRole=selected;}
 get modified(){return this.name!==this.checkpointName||this.selectedSurface!==this.checkpointRole||HOLLOW_SPHERE_ROLES.some(r=>this.surfaces[r].editor.modified);}
 get painting(){return HOLLOW_SPHERE_ROLES.some(r=>this.surfaces[r].editor.painting);}
 get processing(){return this.switching||HOLLOW_SPHERE_ROLES.some(r=>this.surfaces[r].editor.processing);}
 get locked(){return this.hostLocked||this.switching;}
 set locked(value:boolean){this.hostLocked=value;this.syncLock();}
 private syncLock(){for(const role of HOLLOW_SPHERE_ROLES)this.surfaces[role].editor.locked=this.locked;}
 markSaved(name:string){this.name=this.checkpointName=name;this.checkpointRole=this.selectedSurface;this.hasSaved=true;for(const r of HOLLOW_SPHERE_ROLES)this.surfaces[r].editor.markSaved(name);this.changed();}
 async drainForSave(yieldWork?:()=>Promise<void>){for(const r of HOLLOW_SPHERE_ROLES)await this.surfaces[r].editor.drainForSave(yieldWork);}
 async select(role:HollowSphereRole){if(!HOLLOW_SPHERE_ROLES.includes(role))throw RangeError('Unknown spherical surface.');if(this.locked||role===this.selectedSurface)return;this.switching=true;this.syncLock();this.changed();try{await this.surfaces[this.selectedSurface].editor.drainForSave();this.selectedSurface=role;this.error='';}catch(cause){this.error=String(cause);throw cause;}finally{this.switching=false;this.syncLock();this.changed();}}
 dispose(){for(const r of HOLLOW_SPHERE_ROLES){this.surfaces[r].editor.disableBackground();this.surfaces[r].editor.releaseDisplay();}this.changed=()=>{};}
}
export async function prepareHollowSphereDocument(world:HollowSphereWorld,name:string,saved=false,selected:HollowSphereRole='exterior',work:PersistenceWork={}){
 if(!HOLLOW_SPHERE_ROLES.includes(selected))throw RangeError('Unknown spherical surface.');
 const started=performance.now(),surfaces={} as Record<HollowSphereRole,Prepared>;
 try{for(const r of HOLLOW_SPHERE_ROLES)surfaces[r]=await prepareSphericalSession(world.surfaces[r].terrain,name,saved,work);return{editor:new HollowSphereDocument(world,surfaces,name,saved,selected),preparationMs:performance.now()-started};}
 catch(cause){for(const r of HOLLOW_SPHERE_ROLES)surfaces[r]?.editor.disableBackground();throw cause;}
}
