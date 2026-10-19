// Screenshot color accuracy against independent native-pixel CPU reference;
// excludes overlay controls, silhouettes/rims and the map's labels/guides.
import{chromium}from'@playwright/test';import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';
import{createCylinderPreviewTerrain}from'../src/editor/cylinder-preview-session.ts';
import{CylinderDisplayCache,cylinderInterpolatedColor}from'../src/rendering/cylindrical-raster.ts';
import{cylinderLayout,cylinderRayHit}from'../src/rendering/cylindrical-view.ts';
import{dot3}from'../src/surfaces/cube-sphere.ts';
const quant=a=>{const s=a.sort((a,b)=>a-b);return{count:s.length,p50:s[Math.floor(s.length*.5)],p95:s[Math.floor(s.length*.95)],max:s.at(-1),mean:s.reduce((x,v)=>x+v,0)/s.length};};
const browser=await chromium.launch(),results=[];
try{const page=await browser.newPage();for(const label of['baseline-hardware','improved-hardware']){
 const cases=JSON.parse(readFileSync(`docs/evidence/a7-p1a-${label}-benchmarks.json`));
 for(const c of cases){const t=createCylinderPreviewTerrain(c.n);for(const k of t.samples()){const p=t.geometry.referencePosition(t.positionAt(t.owner(k))),r=t.metadata.geometry.radiusMeters;t.write(k,Math.sin(p[0]/r*4+p[2]/r*3)*1800+Math.cos(p[1]/r*5-p[2]/r)*1300-400);}
  const payloadSha256=createHash('sha256').update(new Uint8Array(t.copyElevations().buffer)).digest('hex'),cache=new CylinderDisplayCache(t);for(const _ of cache.prepare())void _;
  const view=c.physicalSettings.view,size=c.physicalSettings.size,l=cylinderLayout(t.geometry,view,size),colors=cache.snapshot(),points=[];
  for(let y=150;y<size.height*.78;y+=3)for(let x=size.width*.18;x<size.width*.82;x+=3){const xx=(x-l.x)/l.scale+dot3(view.target,view.frame.right),yy=(l.y-y)/l.scale+dot3(view.target,view.frame.up),hit=cylinderRayHit(xx,yy,view.frame,l.h);if(!hit||hit.region==='side'&&(Math.abs(hit.z)>l.h-.025||Math.abs(Math.cos(hit.theta)*view.frame.forward[0]+Math.sin(hit.theta)*view.frame.forward[1])<.2)||hit.region!=='side'&&hit.radial>.96)continue;
   const color=cylinderInterpolatedColor(colors,t,hit),f=hit.region==='side'?Math.cos(hit.theta)*view.frame.forward[0]+Math.sin(hit.theta)*view.frame.forward[1]:(hit.region==='cap-end'?1:-1)*view.frame.forward[2],shade=.74+.26*Math.max(0,f);points.push({x,y,expected:[0,8,16].map(shift=>Math.round((color>>>shift&255)*shade))});
  }
  const png=readFileSync(`docs/evidence/a7-p1a-${label}-${c.profile}-n${c.n}-physical.png`).toString('base64');
  const errors=await page.evaluate(async({png,points,size})=>{const img=await createImageBitmap(await(await fetch('data:image/png;base64,'+png)).blob()),node=document.createElement('canvas');node.width=img.width;node.height=img.height;const ctx=node.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,img.width,img.height).data,errors=[];for(const p of points){const x=Math.round(p.x/size.width*img.width),y=Math.round(p.y/size.height*img.height),i=(y*img.width+x)*4;for(let channel=0;channel<3;channel++)errors.push(Math.abs(data[i+channel]-p.expected[channel]));}img.close();return errors;},{png,points,size});
  results.push({label,profile:c.profile,n:c.n,canonicalSamples:t.sampleCount,payloadSha256,points:points.length,absoluteChannelError:quant(errors),view,size,display:c.physicalSettings.renderer??{kind:'cpu',estimatedPixels:160000}});cache.dispose();
 }
}writeFileSync('docs/evidence/a7-p1a-pixel-clarity.json',JSON.stringify(results,null,2));console.log(results.map(r=>({label:r.label,profile:r.profile,n:r.n,error:r.absoluteChannelError})));}
finally{await browser.close();}
