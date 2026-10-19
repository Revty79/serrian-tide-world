// Compare against source exported verbatim from the approved Git checkpoint,
// including every history before/after word, rather than two current wrappers.
import{execFileSync}from'node:child_process';
import{mkdirSync,writeFileSync}from'node:fs';
import{join,dirname,resolve}from'node:path';
import{pathToFileURL}from'node:url';
import{createHash}from'node:crypto';
import assert from'node:assert/strict';
import{createCylinderWorkRuntime}from'../src/editor/cylinder-work-runtime.ts';
import{createCylindricalTerrain}from'../src/terrain/cylindrical.ts';
import{createCylindricalHistory}from'../src/editor/cylindrical-history.ts';
import{cylinderPreparedPatch}from'../src/editor/cylinder-prepared-patch.ts';
import{CYLINDER_PREVIEW_DAB_LIMITS}from'../src/rendering/cylindrical-raster.ts';
const base='267903f69e5cdff3f2151944b971002ca7d2be7e',root='.local/a7-p1b-golden';
for(const p of execFileSync('git',['ls-tree','-r','--name-only',base],{encoding:'utf8'}).trim().split('\n').filter(p=>/^src\/(terrain|surfaces|editor|rendering|persistence)\/.*\.ts$/.test(p))){const d=join(root,p);mkdirSync(dirname(d),{recursive:true});writeFileSync(d,execFileSync('git',['show',`${base}:${p}`]));}
const baseline=await import(pathToFileURL(resolve(root,'src/terrain/cylindrical-stroke.ts')).href),oldTerrain=await import(pathToFileURL(resolve(root,'src/terrain/cylindrical.ts')).href),oldHistory=await import(pathToFileURL(resolve(root,'src/editor/cylindrical-history.ts')).href);
const hash=v=>createHash('sha256').update(v).digest('hex'),records=[];
const paths=[[['cap-start',0,0],['cap-start',.013,23000]],[['cap-end',0,0],['cap-end',-.013,23000]],[['side',.013,43700],['side',.025,53700]],[['cap-start',.013,980000],['side',.013,10000]],[['cap-end',-.013,980000],['side',.013,1590000]],[['side',Math.PI-.013,800000],['side',-Math.PI+.013,810000]],[['side',.013,43700],['side',.07,53700]]];
for(const n of[64,128,256])for(const tool of['raise','lower','smooth','flatten'])for(const[pathIndex,path]of paths.entries()){
 const identity={worldId:'p1b-golden',surfaceId:'exterior'},args={terrainId:'p1b',geometry:{identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:1000000,lengthMeters:1600000},resolution:{angularSamples:n,axialCells:n/2,radialCells:n/4}};
 const t=createCylindricalTerrain(args),ref=oldTerrain.createCylindricalTerrain(args);
 for(let i=0;i<t.sampleCount;i++){let v=(i*13%17-8)*20;if(i===1)v=-0;t.write(t.keyAt(i),v);ref.write(ref.keyAt(i),v);}
 const radius=pathIndex===6?377100:83700;
 const point=p=>({...identity,patchId:p[0],u:p[1],v:p[2]}),settings={version:1,tool,radiusMeters:radius,...(tool==='raise'||tool==='lower'?{strengthMeters:237}:{intensity:.65,...(tool==='flatten'?{targetElevation:-250}:{})})},options={spacingMeters:radius*.2371,dabLimits:CYLINDER_PREVIEW_DAB_LIMITS,maxDabs:2048};
 const rh=oldHistory.createCylindricalHistory(ref),s=baseline.beginCylindricalStroke(ref,rh,point(path[0]),settings,options);s.move(point(path[1]));s.release();while(s.status==='draining')s.pump(16);
 const h=createCylindricalHistory(t),op=h.beginOperation(t),scheduled=[];let final,proposals=0;
 const runtime=createCylinderWorkRuntime(m=>{if(m.type==='prepared'){assert.equal(m.sourceRevision,t.revision);op.commitDab(cylinderPreparedPatch(t,m));proposals++;scheduled.push(()=>runtime.receive({type:'ack',task:1,sequence:m.sequence,revision:t.revision}));}else if(m.type==='done'){final=m;op.finish('released');}else if(m.type==='error')throw Error(m.message);},fn=>scheduled.push(fn));
 const at=performance.now();runtime.receive({type:'start',task:1,metadata:t.metadata,revision:t.revision,values:t.copyElevations(),center:point(path[0]),settings,options});runtime.receive({type:'move',task:1,ordinal:2,point:point(path[1])});runtime.receive({type:'release',task:1});
 let iterations=0;while(scheduled.length){assert.ok(++iterations<100000);scheduled.shift()();}assert.ok(final);
 const words=new Uint32Array(t.copyElevations().buffer),expected=new Uint32Array(ref.copyElevations().buffer);assert.deepEqual(words,expected);assert.deepEqual(h.operations,rh.operations);
 const actualHistory=h.operations.map((_,i)=>[...h.changes(i)]),expectedHistory=rh.operations.map((_,i)=>[...rh.changes(i)]);assert.deepEqual(actualHistory,expectedHistory);
 const after=t.copyElevations();if(h.canUndo){h.undo();rh.undo();assert.deepEqual(new Uint32Array(t.copyElevations().buffer),new Uint32Array(ref.copyElevations().buffer));h.redo();assert.deepEqual(new Uint32Array(t.copyElevations().buffer),new Uint32Array(after.buffer));}
 records.push({n,tool,pathIndex,path,proposals,wordsCompared:words.length,wordMismatches:0,completeHistoryMismatches:0,wordSha256:hash(Buffer.from(words.buffer)),historySha256:hash(JSON.stringify(actualHistory)),operations:h.operations,referenceStatistics:s.statistics,workerStatistics:final.stats,elapsedMs:performance.now()-at});
}
writeFileSync('docs/evidence/a7-p1b-golden-equivalence.json',JSON.stringify({base,method:'Verbatim accepted Git source imported separately. All canonical UInt32 words and complete operation records plus every before/after history word compared directly. Signed zero included. Undo and Redo compared. Six connected boundary paths plus a large rim footprint for each of four brushes at three details.',cases:records.length,records},null,2));console.log({cases:records.length,wordMismatches:0,completeHistoryMismatches:0});
