import { CylinderWebGLRenderer } from '../../src/rendering/cylindrical-webgl.ts';
import { CylinderDisplayCache } from '../../src/rendering/cylindrical-raster.ts';
import { cylinderLayout, cylinderMapHit, cylinderRayHit, initialCylinderView, rotateCylinder, recenterCylinder, type CylinderView } from '../../src/rendering/cylindrical-view.ts';
import { createCylinderPreviewTerrain } from '../../src/editor/cylinder-preview-session.ts';
import { dot3 } from '../../src/surfaces/cube-sphere.ts';
import { cylinderElevationSampler, cylinderRelief, type CylinderAppearance } from '../../src/rendering/cylindrical-elevation.ts';
import { elevationToColor } from '../../src/rendering/elevation-colors.ts';

function elevationPacked(sample:ReturnType<typeof cylinderElevationSampler>,terrain:ReturnType<typeof createCylinderPreviewTerrain>,hit:Parameters<ReturnType<typeof cylinderElevationSampler>>[0],appearance:CylinderAppearance){
 const f=sample(hit),light=appearance==='relief'&&f.height>terrain.metadata.seaLevel?cylinderRelief(f.dx,f.dy):1,c=elevationToColor(f.height,terrain.metadata.seaLevel).map(v=>Math.round(v*light));
 return(c[0]!|c[1]!<<8|c[2]!<<16|255<<24)>>>0;
}

/** Independent double-precision CPU analytic reference vs actual read-back GPU pixels. */
export function parity(n:number,appearance:CylinderAppearance='elevation'){
 const terrain=createCylinderPreviewTerrain(n);for(const key of terrain.samples())terrain.write(key,Math.sin(key.index*.7)*2200);
 const words=terrain.copyElevations(),cache=new CylinderDisplayCache(terrain);for(const _ of cache.prepare())void _;
 const node=document.createElement('canvas'),renderer=new CylinderWebGLRenderer(node,cache,()=>{});
 if(!renderer.available)throw Error(renderer.statistics.reason);
 // Odd backing dimensions place a fragment exactly on an axial cap center.
 const size={width:641,height:481},first=initialCylinderView(),views:CylinderView[]=[first,rotateCylinder(first,1.7,.8),rotateCylinder(first,-2.1,-1.3),{...first,zoom:2.4},...(['cap-start','cap-end'] as const).map(patchId=>recenterCylinder(terrain.geometry,first,{...terrain.metadata.identity,patchId,u:0,v:0})),{...initialCylinderView('map'),phase:2.7},{...initialCylinderView('map'),phase:-Math.PI+.01,zoom:1.8,pan:{x:.2,y:-.3}}];
 const results=[];
 for(const view of views){
  const receipt=renderer.present(view,size,appearance),gl=node.getContext('webgl2')!,pixels=new Uint8Array(receipt.width*receipt.height*4);gl.readPixels(0,0,receipt.width,receipt.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const sample=cylinderElevationSampler(cache.elevationSnapshot(),terrain,appearance==='relief'?'all':'none'),l=cylinderLayout(terrain.geometry,view,size);let checked=0,empty=0,maxError=0,maxEnvelopeError=0,wrongCoverage=0,worst:object={};
  const reference=(xx:number,yy:number)=>view.mode==='map'?cylinderMapHit(xx-view.pan.x,yy-view.pan.y,l.h,view.phase):cylinderRayHit(xx+dot3(view.target,view.frame.right),yy+dot3(view.target,view.frame.up),view.frame,l.h);
  for(let y=7;y<receipt.height;y+=13)for(let x=7;x<receipt.width;x+=13){
   const xx=((x+.5)/receipt.width*size.width-size.width/2)/l.scale,yy=((y+.5)/receipt.height*size.height-size.height/2)/l.scale;
   const hit=reference(xx,yy),offset=(y*receipt.width+x)*4;
   if(!hit){if(pixels[offset+3]===255)wrongCoverage++;empty++;continue;}
   // Exclude true reference silhouettes/cuts covered by independent subpixel AA.
   if(pixels[offset+3]!==255)continue;
   if([[-1,-1],[-1,1],[1,-1],[1,1]].some(([dx,dy])=>reference(xx+dx!*size.width/receipt.width/l.scale,yy+dy!*size.height/receipt.height/l.scale)?.region!==hit.region))continue;
   const packed=elevationPacked(sample,terrain,hit,appearance),facing=hit.region==='side'?Math.cos(hit.theta)*view.frame.forward[0]+Math.sin(hit.theta)*view.frame.forward[1]:(hit.region==='cap-end'?1:-1)*view.frame.forward[2],shade=view.mode==='map'?1:.74+.26*Math.max(0,facing);
   // MSAA resolves actual subpixel coverage at implementation-selected sample positions.
   // Compare to an independent CPU pixel envelope as well as retaining center errors.
   const offsets=[-.5,-.25,0,.25,.5],samples=offsets.flatMap(dx=>offsets.map(dy=>reference(xx+dx*size.width/receipt.width/l.scale,yy+dy*size.height/receipt.height/l.scale)!));
   const expected=samples.map(s=>{const c=elevationPacked(sample,terrain,s,appearance),f=s.region==='side'?Math.cos(s.theta)*view.frame.forward[0]+Math.sin(s.theta)*view.frame.forward[1]:(s.region==='cap-end'?1:-1)*view.frame.forward[2],k=view.mode==='map'?1:.74+.26*Math.max(0,f);return[0,8,16].map(shift=>(c>>>shift&255)*k);});
   for(let c=0;c<3;c++){const lo=Math.min(...expected.map(e=>e[c]!)),hi=Math.max(...expected.map(e=>e[c]!)),value=pixels[offset+c]!;maxEnvelopeError=Math.max(maxEnvelopeError,Math.max(lo-value,value-hi,0));}
   for(let c=0;c<3;c++){const error=Math.abs(pixels[offset+c]!-Math.round((packed>>>(8*c)&255)*shade));if(error>maxError){maxError=error;worst={x,y,hit,facing,actual:pixels[offset+c],expected:Math.round((packed>>>(8*c)&255)*shade)};}}checked++;
  }
  let centerCheck;
  if(view.mode==='physical'&&Math.abs(view.frame.forward[2])>.999999){const centerHit=reference(0,0)!,expected=elevationPacked(sample,terrain,centerHit,appearance),offset=(Math.floor(receipt.height/2)*receipt.width+Math.floor(receipt.width/2))*4,actual=[...pixels.slice(offset,offset+4)],error=Math.max(...[0,8,16].map((shift,i)=>Math.abs((expected>>>shift&255)-actual[i]!)));centerCheck={region:centerHit.region,actual,expected:[0,8,16].map(shift=>expected>>>shift&255),error};if(actual[3]!==255||error>2)throw Error('Axial cap-center pixel does not match its canonical elevation/physical gradient: '+JSON.stringify(centerCheck));}
  results.push({view,checked,empty,maxError,maxEnvelopeError,wrongCoverage,worst,centerCheck,width:receipt.width,height:receipt.height});
 }
 const beforeUploads=renderer.statistics.uploads;renderer.present(first,size);const cameraReused=renderer.statistics.uploads===beforeUploads;
 const key=terrain.keyAt(0);terrain.write(key,3200);cache.refresh([0]);renderer.present(first,size);const commitUploaded=renderer.statistics.uploads===beforeUploads+1;
 // The only terrain write above is intentional fixture setup/update; renderer did not write.
 const unchanged=terrain.copyElevations().every((v,i)=>i===0?v===3200:Object.is(v,words[i]));
 renderer.dispose();cache.dispose();return{n,appearance,results,cameraReused,commitUploaded,unchanged,disposedTextureBytes:renderer.statistics.textureBytes};
}
