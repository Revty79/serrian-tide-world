import {createDumbbellTerrain} from '../../src/terrain/dumbbell.ts';
import {DUMBBELL_DEFAULT_DIMENSIONS,dumbbellBandPosition} from '../../src/surfaces/dumbbell.ts';
import {PolyhedronDisplayCache} from '../../src/rendering/polyhedron-field.ts';
import {DumbbellPresentation} from '../../src/rendering/dumbbell-presentation.ts';
import {initialDumbbellView} from '../../src/rendering/dumbbell-view.ts';
import {dumbbellWorkspaceAdapter,dumbbellRegionPosition} from '../../src/components/dumbbell-workspace-adapter.ts';
export async function dumbbellIncrementalProof(detail:128|256){
 const t=createDumbbellTerrain({terrainId:'incremental-heights',detail,geometry:{...DUMBBELL_DEFAULT_DIMENSIONS,provider:'physical-faceted-dumbbell',version:1,role:'exterior',identity:{worldId:'incremental',surfaceId:'boundary'}}}),g=t.geometry,cache=new PolyhedronDisplayCache(t,{polygonColorsOnly:true});
 for(const _ of cache.prepare())void _;
 const gpu=document.createElement('canvas'),canvas=document.createElement('canvas');document.body.append(gpu,canvas);const p=new DumbbellPresentation(gpu,canvas,cache,()=>{});p.fail('Forced Canvas incremental comparison');const size={width:1000,height:660},adapter=dumbbellWorkspaceAdapter(t),results=[];
 for(const region of ['first-terminal','second-terminal','neck','first-transition','map']){
  const view=region==='map'?initialDumbbellView('map'):adapter.recenter(initialDumbbellView(),dumbbellRegionPosition(g,region));p.present(view,size,'relief');
  const terminal=region==='second-terminal'?'second-terminal':'first-terminal',points=[{label:'pole',q:{...g.identity,patchId:terminal+'-0:0',u:0,v:0}},{label:'near-pole',q:{...g.identity,patchId:terminal+'-0:0',u:.04,v:.04}},...[0,3,4,5,8].map(band=>({label:String(band),q:dumbbellBandPosition(g,band,region==='map'?7:0,band===3?.99:band===5?.01:.5,.5)}))];
  for(const {label,q} of points){
   const before=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data,column=Math.round(q.u*t.subdivisions),row=Math.min(t.subdivisions-column,Math.round(q.v*t.subdivisions)),index=t.resolve({...q,column,row}).index;
   t.write(t.keyAt(index),t.read(t.keyAt(index))<0?1200:-100);cache.refresh([index]);p.present(view,size,'relief');const incremental=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;
   p.present({...view,zoom:view.zoom*1.001},size,'relief');p.present(view,size,'relief');const fresh=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;let changed=0,max=0,updated=0;const differences:unknown[]=[];for(let i=0;i<fresh.length;i++){if(incremental[i]!==before[i])updated++;if(fresh[i]!==incremental[i]){changed++;max=Math.max(max,Math.abs(fresh[i]!-incremental[i]!));if(differences.length<12)differences.push({x:Math.floor(i/4)%canvas.width,y:Math.floor(Math.floor(i/4)/canvas.width),channel:i%4,incremental:incremental[i],fresh:fresh[i]});}}results.push({region,label,changed,max,updated,differences});
  }
 }
 p.dispose();cache.dispose();return{detail,results};
}
