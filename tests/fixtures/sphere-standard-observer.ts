// Read-only observer and fixed saved test geography for the normal Atlas app.
import { SphericalSession } from '../../src/editor/spherical-session.ts';
import { createSphericalTerrain } from '../../src/terrain/spherical.ts';
import { encodeSphericalHeightmap } from '../../src/persistence/spherical-format.ts';
import { LocalMapStore } from '../../src/persistence/local-map-store.ts';
import { unitDirection, type Vec3 } from '../../src/surfaces/cube-sphere.ts';
import { projectSphere, type SphericalView } from '../../src/rendering/spherical-view.ts';
let active: SphericalSession | undefined;
const original = SphericalSession.prototype.updateDisplay;
SphericalSession.prototype.updateDisplay = function (...args) { active = this; return original.apply(this, args); };
export const canvas = () => document.querySelector<HTMLCanvasElement>('canvas[aria-label="Atlas spherical terrain map"]')!;
export function current() { if (!active) throw Error('Sphere not ready'); return active; }
export function view(): SphericalView { const d = canvas().dataset; return { mode: d.mode as 'globe' | 'net', frame: JSON.parse(d.frame!), zoom: Number(d.zoom), pan: JSON.parse(d.pan!) }; }
export function snapshot() {
 const s = current(), d = canvas().dataset;
 return { presentationPending:d.displayPending === 'true', ready:d.ready !== 'false', viewPending:d.viewPending === 'true', displayPending:s.displayPending ?? false, revision:s.terrain.revision, textureRevision:s.cache.sourceRevision, displayRevision:Number(d.displayRevision ?? d.revision), painting:s.painting, processing:s.processing, pending:s.pendingPoints, statistics:{...s.statistics}, history:{state:s.history.stateId,entries:s.history.length,bytes:s.history.retainedBytes}, renderer:d.renderer ?? 'cpu', renderTimes:JSON.parse(d.renderTimes??'[]'), diagnostics:JSON.parse(d.displayDiagnostics??'{}'), work:(s as unknown as {workDiagnostics?:object}).workDiagnostics ?? null };
}
export async function wordsHash() { return hash(current().terrain.copyElevations().buffer as ArrayBuffer); }
async function hash(buffer:ArrayBuffer) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(v=>v.toString(16).padStart(2,'0')).join(''); }
export function point(direction:Vec3) { const c=canvas(), r=c.getBoundingClientRect(), points=projectSphere(current().terrain,direction,view(),{width:r.width,height:r.height}); const p=points[0]; return p&&{x:r.left+p.x,y:r.top+p.y}; }
export async function fixture(n:number) {
 const t=createSphericalTerrain({terrainId:`p1c-geography-${n}`,identity:{worldId:'p1c-geography',surfaceId:'round-sphere'},radiusMeters:1000000,cellsPerEdge:n});
 const peaks=[{d:unitDirection([1,1,.15]),h:8500},{d:unitDirection([1,1,1]),h:7500},{d:unitDirection([.05,.02,1]),h:6500}];
 for(const k of t.samples()) { const [x,y,z]=t.directionAt(k);let h=-650+2800*(x*y-.3*z+.25*Math.sin(4*z)*Math.cos(3*x));for(const p of peaks){const a=Math.acos(Math.max(-1,Math.min(1,x*p.d[0]+y*p.d[1]+z*p.d[2])));h+=p.h*Math.exp(-((a/.115)**2));}t.write(k,h); }
 const r=await encodeSphericalHeightmap(t,`P1C fixed geography N${n}`,'2026-10-19T00:00:00.000Z'),bytes=new Uint8Array(r.elevations);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return {...r,elevations:btoa(binary),payloadSha256:await hash(r.elevations)};
}
export async function install(input:Awaited<ReturnType<typeof fixture>>) { const binary=atob(input.elevations),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0)),{payloadSha256:_,...r}=input;await new LocalMapStore().save({...r,elevations:bytes.buffer});return r.id; }
let stop:()=>object=()=>({});
export function monitor() {
 const c=canvas(), events:object[]=[],frames:{utcMs:number;raf:number;revision:number;displayRevision:number;pending:number;painting:boolean}[]=[],tasks:number[]=[],stages:Record<string,number[]>={begin:[],pump:[],updateDisplay:[]};let running=true,id=0;
 const wrapped: {name:'begin'|'pump'|'updateDisplay';previous:Function}[]=[];
 for(const name of ['begin','pump','updateDisplay'] as const){const previous:Function=SphericalSession.prototype[name];wrapped.push({name,previous});(SphericalSession.prototype as unknown as Record<string,Function>)[name]=function(this:SphericalSession,...args:unknown[]){const at=performance.now();try{return previous.apply(this,args);}finally{if(stages[name]!.length<8192)stages[name]!.push(performance.now()-at);}};}
 const listen=(e:Event)=>{const p=e as PointerEvent;if(events.length<4096)events.push({type:p.type,x:p.clientX,y:p.clientY,pointerType:p.pointerType,utcMs:performance.timeOrigin+performance.now(),at:performance.now(),timeStamp:p.timeStamp});if(p.type==='pointerdown')console.timeStamp('sphere-paint-down');};
 for(const name of ['pointerdown','pointermove','pointerup','pointercancel'])c.addEventListener(name,listen,true);
 const observer=new PerformanceObserver(list=>{for(const e of list.getEntries())if(tasks.length<4096)tasks.push(e.duration);});observer.observe({type:'longtask',buffered:false});
 const beat=(raf:number)=>{if(!running)return;const s=snapshot();if(frames.length<8192)frames.push({utcMs:performance.timeOrigin+performance.now(),raf,revision:s.revision,displayRevision:s.displayRevision,pending:s.pending,painting:s.painting});id=requestAnimationFrame(beat);};id=requestAnimationFrame(beat);
 stop=()=>{running=false;cancelAnimationFrame(id);observer.disconnect();for(const name of ['pointerdown','pointermove','pointerup','pointercancel'])c.removeEventListener(name,listen,true);for(const{previous,name}of wrapped)(SphericalSession.prototype as unknown as Record<string,Function>)[name]=previous;console.timeStamp('sphere-paint-drained');return{events,frames,longTasks:tasks,stages,final:snapshot()};};
}
export function finishMonitor(){return stop();}
