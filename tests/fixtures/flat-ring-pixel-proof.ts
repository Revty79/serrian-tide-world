import {createFlatRing} from '../../src/terrain/flat-ring.ts';
import {FlatRingDisplayCache,initialFlatRingView} from '../../src/editor/flat-ring-session.ts';
import {flatRingWorkspaceAdapter,flatRingRegion} from '../../src/components/flat-ring-workspace-adapter.ts';
import {openCylinderRasterSteps} from '../../src/rendering/open-cylinder-raster.ts';
import {OpenCylinderWebGLRenderer} from '../../src/rendering/open-cylinder-webgl.ts';
import {openCylinderViewAdapter,type OpenCylinderView} from '../../src/rendering/open-cylinder-view.ts';
import {openCylinderElevationSampler,cylinderElevationColor,cylinderRelief} from '../../src/rendering/open-cylinder-elevation.ts';
import {FLAT_RING_PRESETS} from '../../src/surfaces/flat-ring.ts';
const size={width:1280,height:850};
export async function flatRingPixelProof(n:128|256,profile:keyof typeof FLAT_RING_PRESETS='Standard'){
 const [inner,height]=FLAT_RING_PRESETS[profile],Ro=1e6,Ri=inner*Ro,H=height*Ro,W=Ro-Ri;
 const world=createFlatRing({terrainId:'terrain',geometry:{provider:'physical-flat-ring',version:1,identity:{worldId:'world',surfaceId:'boundary'},innerRadiusMeters:Ri,outerRadiusMeters:Ro,thicknessMeters:H},detail:n}),t=world.terrain,g=t.geometry,A=t.metadata.representation.resolution.angularSamples,S=g.meridianLengthMeters;
 for(let i=0;i<t.sampleCount;i++){const row=t.rowGeometry(Math.floor(i/A)),theta=i%A/A*2*Math.PI;t.write(t.keyAt(i),Math.fround(1600*Math.sin(3*theta+.2)+1000*Math.cos(row.meridian/S*2*Math.PI)-200));}
 const digest=async()=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',t.copyElevations().buffer)),x=>x.toString(16).padStart(2,'0')).join(''),before=await digest(),cache=new FlatRingDisplayCache(world);for(const _ of cache.prepare())void _;
 const base=initialFlatRingView(),a=flatRingWorkspaceAdapter(world),views:{scene:string;view:OpenCylinderView}[]=[{scene:'overview',view:base},{scene:'upper',view:{...base,frame:{right:[1,0,0],up:[0,1,0],forward:[0,0,1]}}},{scene:'lower',view:{...base,frame:{right:[1,0,0],up:[0,-1,0],forward:[0,0,-1]}}}];
 for(const id of ['inner-wall','outer-wall','upper-inner','lower-outer'])views.push({scene:id,view:a.recenter(base,flatRingRegion(world,id))});
 for(const projection of ['upper-annulus','lower-annulus','inner-wall','outer-wall']as const)views.push({scene:projection+'-map',view:{...base,mode:'map',mapProjection:projection,zoom:projection.endsWith('wall')?4:1,phase:Math.PI-.01}});
 views.push({scene:'complete-map',view:{...base,mode:'map'}});
 const captures=[],results=[];
 for(const {scene,view}of views){
 const adapter=openCylinderViewAdapter(g,view,size),l=adapter.layout,job=openCylinderRasterSteps(cache,view,size,size.width*size.height,undefined,'relief',undefined,undefined,undefined,true);let step=job.next(),started=performance.now();while(!step.done){if(performance.now()-started>5){await new Promise(r=>setTimeout(r,0));started=performance.now();}step=job.next();}const image=step.value,cpu=document.createElement('canvas'),gpu=document.createElement('canvas');cpu.width=image.columns;cpu.height=image.rows;cpu.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(image.pixels),image.columns,image.rows),0,0);
 const renderer=new OpenCylinderWebGLRenderer(gpu,cache,()=>{},true);await renderer.whenReady();renderer.present(view,size,'relief');const gl=gpu.getContext('webgl2')!,raw=new Uint8Array(gpu.width*gpu.height*4);if(gpu.width!==size.width||gpu.height!==size.height)throw Error('Proof requires matching DPR1 backing');gl.readPixels(0,0,gpu.width,gpu.height,gl.RGBA,gl.UNSIGNED_BYTE,raw);const data=cpu.getContext('2d')!.getImageData(0,0,cpu.width,cpu.height).data,field=openCylinderElevationSampler(t.copyElevations(),t,'land');
 // Independent quadratic/plane intersections with the actual solid annulus.
 // Map domains are evaluated directly from their documented physical lengths.
 // This does not call production rays, map inverses, normals or projections.
 const dot=(a:readonly number[],b:readonly number[])=>a.reduce((s,x,i)=>s+x*b[i]!,0),reference=(x:number,y:number)=>{
  const px=(x-l.x)/l.scale,py=(l.y-y)/l.scale;
  if(view.mode==='map'){const X=px-view.pan.x,Y=py-view.pan.y;
   if(view.mapProjection?.endsWith('annulus')){const radiusMeters=Math.hypot(X,Y)*Ro;if(radiusMeters<Ri||radiusMeters>Ro)return;const upper=view.mapProjection==='upper-annulus';return{patchId:upper?'rim-end':'rim-start',theta:view.phase+Math.atan2(upper?Y:-Y,X),radiusMeters,zMeters:upper?H:0,facing:1};}
   if(view.mapProjection){const inner=view.mapProjection==='inner-wall',radiusMeters=inner?Ri:Ro;if(Math.abs(X)>Math.PI*radiusMeters/Ro||Math.abs(Y)>H/(2*Ro))return;return{patchId:inner?'inner-wall':'outer-wall',theta:view.phase+X*Ro/radiusMeters,radiusMeters,zMeters:H/2+Y*Ro,facing:1};}
   const m=S/2+Y*Ro;if(Math.abs(X)>Math.PI||m<0||m>S)return;const patchId=m<=H?'outer-wall':m<=H+W?'rim-end':m<=2*H+W?'inner-wall':'rim-start';return{patchId,theta:view.phase+X,radiusMeters:patchId==='outer-wall'?Ro:patchId==='inner-wall'?Ri:patchId==='rim-end'?Ro-(m-H):Ri+(m-2*H-W),zMeters:patchId==='outer-wall'?m:patchId==='inner-wall'?2*H+W-m:patchId==='rim-end'?H:0,facing:1};
  }
  const h=H/Ro/2,ratio=Ri/Ro,f=view.frame,tx=dot(view.target,f.right),ty=dot(view.target,f.up),o=f.right.map((v,i)=>v*(px+tx)+f.up[i]!*(py+ty)+f.forward[i]!*4),d=f.forward.map(v=>-v),hits:{distance:number;point:number[];patchId:string;normal:number[]}[]=[];
  for(const radius of[1,ratio]){const aa=d[0]!**2+d[1]!**2,bb=2*(o[0]!*d[0]!+o[1]!*d[1]!),cc=o[0]!**2+o[1]!**2-radius*radius,disc=bb*bb-4*aa*cc;if(aa>1e-24&&disc>=0)for(const distance of[(-bb-Math.sqrt(disc))/(2*aa),(-bb+Math.sqrt(disc))/(2*aa)]){const p=o.map((v,i)=>v+d[i]!*distance);if(distance>0&&Math.abs(p[2]!)<=h){const outer=radius===1,sign=outer?1:-1;hits.push({distance,point:p,patchId:outer?'outer-wall':'inner-wall',normal:[sign*p[0]!/radius,sign*p[1]!/radius,0]});}}}
  if(Math.abs(d[2]!)>1e-14)for(const z of[-h,h]){const distance=(z-o[2]!)/d[2]!,p=o.map((v,i)=>v+d[i]!*distance),rho=Math.hypot(p[0]!,p[1]!);if(distance>0&&rho>=ratio&&rho<=1)hits.push({distance,point:p,patchId:z>0?'rim-end':'rim-start',normal:[0,0,z>0?1:-1]});}
  hits.sort((a,b)=>a.distance-b.distance);const hit=hits[0];if(!hit)return;return{patchId:hit.patchId,theta:Math.atan2(hit.point[1]!,hit.point[0]!),radiusMeters:Math.hypot(hit.point[0]!,hit.point[1]!)*Ro,zMeters:Math.max(0,Math.min(H,hit.point[2]!*Ro+H/2)),facing:.74+.26*Math.max(0,dot(hit.normal,f.forward))};
 };
 let stableChecked=0,stableMax=0,envelopeViolations=0,envelopeMax=0,referenceMax=0,geometryViolations=0,empty=0,coasts=0,land=0,ocean=0,edgeChecked=0,coverageMax=0,gpuEdgeEnvelopeViolations=0;const regions:Record<string,number>={},worst:unknown[]=[];let stableWorst:unknown;
 for(let y=3;y<size.height-3;y+=2)for(let x=3;x<size.width-3;x+=2){const at=(y*size.width+x)*4,ga=((size.height-1-y)*size.width+x)*4,p=reference(x+.5,y+.5),around=[[-2,0],[2,0],[0,-2],[0,2]].map(([dx,dy])=>reference(x+.5+dx!,y+.5+dy!));if(!p&&around.every(q=>!q)){empty++;if(data[at+3]||raw[ga+3])geometryViolations++;continue;}if(!p||around.some(q=>!q)){edgeChecked++;const coverage=(xx:number,yy:number)=>Math.round([[-.25,-.25],[-.25,.25],[.25,-.25],[.25,.25]].filter(([dx,dy])=>reference(xx+.5+dx!,yy+.5+dy!)).length/4*255),expected=coverage(x,y);coverageMax=Math.max(coverageMax,Math.abs(data[at+3]!-expected));const envelope=[[-2,0],[2,0],[0,-2],[0,2],[0,0]].map(([dx,dy])=>coverage(x+dx!,y+dy!));if(raw[ga+3]!<Math.min(...envelope)-3||raw[ga+3]!>Math.max(...envelope)+3)gpuEdgeEnvelopeViolations++;continue;}
  if(data[at+3]!==255||raw[ga+3]!==255){geometryViolations++;continue;}regions[p.patchId]=(regions[p.patchId]??0)+1;
  let variation=0,difference=0,bad=false;for(let c=0;c<4;c++){let low=Infinity,high=-Infinity;for(const dy of[-2,-1,0,1,2])for(const dx of[-2,-1,0,1,2]){const k=((y+dy)*size.width+x+dx)*4,value=c===3?data[k+3]!:data[k+c]!*data[k+3]!/255;low=Math.min(low,value);high=Math.max(high,value);}variation=Math.max(variation,high-low);const error=Math.max(low-raw[ga+c]!,raw[ga+c]!-high,0);envelopeMax=Math.max(envelopeMax,error);bad||=error>3;difference=Math.max(difference,Math.abs(data[at+c]!-raw[ga+c]!));}if(bad){envelopeViolations++;if(worst.length<8)worst.push({x,y,p,cpu:[...data.slice(at,at+4)],gpu:[...raw.slice(ga,ga+4)]});}
  const sample=field(p as Parameters<typeof field>[0]);if(sample.crossesSea)coasts++;if(sample.height>0)land++;else ocean++;
  if(variation<=12&&!sample.crossesSea&&around.every(q=>q!.patchId===p.patchId&&!field(q as Parameters<typeof field>[0]).crossesSea)){stableChecked++;if(difference>stableMax)stableWorst={x,y,p,sample,variation,cpu:[...data.slice(at,at+4)],gpu:[...raw.slice(ga,ga+4)]};stableMax=Math.max(stableMax,difference);const color=cylinderElevationColor(sample.height,0),shade=p.facing*(sample.height>0?cylinderRelief(sample.dx,sample.dy):1);referenceMax=Math.max(referenceMax,...[0,1,2].map(c=>Math.abs(Math.round(color[c]!*shade)-data[at+c]!)));}
 }

 const combined=document.createElement('canvas');combined.width=size.width*2;combined.height=size.height+24;const ctx=combined.getContext('2d')!;ctx.fillStyle='#102b3a';ctx.fillRect(0,0,combined.width,combined.height);ctx.fillStyle='white';ctx.font='14px system-ui';ctx.fillText(`Flat Ring N${n} ${profile} ${scene}: Canvas`,12,17);ctx.fillText('hardware WebGL2',size.width+12,17);ctx.drawImage(cpu,0,24);ctx.drawImage(gpu,size.width,24);
 captures.push({scene,png:combined.toDataURL()});results.push({scene,stableChecked,stableMax,envelopeMax,envelopeViolations,referenceMax,geometryViolations,empty,coasts,land,ocean,edgeChecked,coverageMax,gpuEdgeEnvelopeViolations,regions,worst,stableWorst,graphics:{...renderer.statistics}});renderer.dispose();
 }
 const result={n,profile,before,after:await digest(),results,captures,cacheBytes:cache.byteLength,authorityBytes:t.elevationByteLength};cache.dispose();return result;
}
