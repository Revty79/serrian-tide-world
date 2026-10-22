import {prepareCylinderSession} from './prepare-cylinder-session.ts';
import type {HollowCylinderWorld} from '../terrain/hollow-cylinder.ts';
import {HOLLOW_CYLINDER_ROLES,type HollowCylinderRole} from '../surfaces/hollow-cylinder.ts';
import type {PersistenceWork} from '../persistence/cooperative-work.ts';
type Prepared=Awaited<ReturnType<typeof prepareCylinderSession>>;
/** Parent lifecycle; accepted cylindrical sessions retain all numerical work. */
export class HollowCylinderDocument {
 readonly world:HollowCylinderWorld;readonly surfaces:Record<HollowCylinderRole,Prepared>;
 name:string;hasSaved:boolean;selectedSurface:HollowCylinderRole;error='';changed=()=>{};
 private checkpointName:string;private checkpointRole:HollowCylinderRole;private hostLocked=false;private switching=false;private disposed=false;
 constructor(world:HollowCylinderWorld,surfaces:Record<HollowCylinderRole,Prepared>,name:string,saved:boolean,selected:HollowCylinderRole){this.world=world;this.surfaces=surfaces;this.name=this.checkpointName=name;this.hasSaved=saved;this.selectedSurface=this.checkpointRole=selected;world.setExcavationProtection(()=>{if(this.disposed)throw Error('This cylindrical document is closed.');});}
 get modified(){return this.name!==this.checkpointName||this.selectedSurface!==this.checkpointRole||HOLLOW_CYLINDER_ROLES.some(r=>this.surfaces[r].editor.modified);}
 get painting(){return HOLLOW_CYLINDER_ROLES.some(r=>this.surfaces[r].editor.painting);}
 get processing(){return this.switching||HOLLOW_CYLINDER_ROLES.some(r=>this.surfaces[r].editor.processing);}
 get locked(){return this.hostLocked||this.switching;}
 set locked(value:boolean){this.hostLocked=value;this.syncLock();}
 private syncLock(){for(const r of HOLLOW_CYLINDER_ROLES)this.surfaces[r].editor.locked=this.locked;}
 markSaved(name:string){this.name=this.checkpointName=name;this.checkpointRole=this.selectedSurface;this.hasSaved=true;for(const r of HOLLOW_CYLINDER_ROLES)this.surfaces[r].editor.markSaved(name);this.changed();}
 async drainForSave(yieldWork?:()=>Promise<void>){for(const r of HOLLOW_CYLINDER_ROLES)await this.surfaces[r].editor.drainForSave(yieldWork);}
 async select(role:HollowCylinderRole){if(!HOLLOW_CYLINDER_ROLES.includes(role))throw RangeError('Unknown cylindrical surface.');if(this.locked||role===this.selectedSurface)return;this.switching=true;this.syncLock();this.changed();try{await this.surfaces[this.selectedSurface].editor.drainForSave();this.selectedSurface=role;this.error='';}catch(e){this.error=String(e);throw e;}finally{this.switching=false;this.syncLock();this.changed();}}
 dispose(){this.disposed=true;for(const r of HOLLOW_CYLINDER_ROLES)this.surfaces[r].editor.dispose();this.changed=()=>{};}
}
export async function prepareHollowCylinderDocument(world:HollowCylinderWorld,name:string,saved=false,selected:HollowCylinderRole='exterior',work:PersistenceWork={}){
 if(!HOLLOW_CYLINDER_ROLES.includes(selected))throw RangeError('Unknown cylindrical surface.');const started=performance.now(),surfaces={}as Record<HollowCylinderRole,Prepared>;
 try{for(const r of HOLLOW_CYLINDER_ROLES)surfaces[r]=await prepareCylinderSession(world.surfaces[r].terrain,name,saved,work);return{editor:new HollowCylinderDocument(world,surfaces,name,saved,selected),preparationMs:performance.now()-started};}catch(e){for(const r of HOLLOW_CYLINDER_ROLES)surfaces[r]?.editor.dispose();throw e;}
}
