// Reproduce P1's controlled UI workload without creating a branch or changing tracked source.
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { createHash } from 'node:crypto';
const args=process.argv.slice(2),option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
if(args.includes('--help')){console.log('node scripts/measure-spherical-workspace.mjs --label NAME [--baseline FULL_SHA] [--project desktop|mobile] [--grep REGEX] [--cpu-profile]');process.exit(0);}
const label=option('--label','candidate'),baseline=option('--baseline'),project=option('--project'),grep=option('--grep');
if(!/^[a-z0-9-]+$/.test(label)||baseline&&!/^[0-9a-f]{40}$/.test(baseline)||project&&!['desktop','mobile'].includes(project))throw Error('Invalid benchmark arguments');
const workspace=resolve('.'),git=(...a)=>execFileSync('git',a,{cwd:workspace,maxBuffer:64*1024*1024}),hash=b=>createHash('sha256').update(b).digest('hex');
mkdirSync('.local',{recursive:true});let root=workspace;
if(baseline){root=resolve('.local',`p1-reference-${baseline}`);if(!root.startsWith(workspace+sep))throw Error('Reference must stay in workspace');const names=git('ls-tree','-r','--name-only',baseline).toString().trim().split('\n').filter(p=>/^(src\/|index\.html$|package(-lock)?\.json$|vite\.config\.ts$|tsconfig\.json$|tests\/fixtures\/sphere-storage\.ts$)/.test(p));for(const p of names){const target=resolve(root,p);if(!target.startsWith(root+sep))throw Error(p);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,git('show',`${baseline}:${p}`));}copyFileSync('tests/fixtures/spherical-performance.ts',resolve(root,'tests/fixtures/spherical-performance.ts'));}
const names=git('ls-files','--cached','--others','--exclude-standard').toString().trim().split('\n').filter(p=>/^(src\/|tests\/|package(-lock)?\.json|vite\.config|playwright\.config|tsconfig)/.test(p)).sort();
const snapshot=()=>Object.fromEntries(names.map(p=>[p,hash(readFileSync(p))]));const before=snapshot();
const quote=s=>process.platform==='win32'?`"${s.replaceAll('"','""')}"`:`'${s.replaceAll("'","'\\''")}'`;
const command=[process.execPath,resolve('node_modules/vite/bin/vite.js'),root,'--host','127.0.0.1','--port','5189','--strictPort'].map(quote).join(' ');
const config=resolve('.local',`a6-p1-${label}.config.ts`);
writeFileSync(config,`import base from '../playwright.config.ts';\nexport default {...base,testDir:'../tests',outputDir:${JSON.stringify(`../test-results/a6-p1-${label}`)},workers:1,retries:0,use:{...base.use,baseURL:'http://127.0.0.1:5189'},webServer:{cwd:${JSON.stringify(workspace)},command:${JSON.stringify(command)},url:'http://127.0.0.1:5189',reuseExistingServer:false}};\n`);
const cli=['node_modules/@playwright/test/cli.js','test','tests/spherical-performance.spec.ts','--config',config,'--reporter=list,json'];if(project)cli.push('--project',project);if(grep)cli.push('--grep',grep);
const child=spawn(process.execPath,cli,{cwd:workspace,windowsHide:true,stdio:'inherit',env:{...process.env,ATLAS_PERF_LABEL:label,ATLAS_PERF_REPEATS:'3',ATLAS_CPU_PROFILE:args.includes('--cpu-profile')?'1':'',PLAYWRIGHT_JSON_OUTPUT_FILE:resolve('docs/evidence',`a6-p1-${label}-browser-results.json`)}});
child.on('exit',code=>{const after=snapshot(),unchanged=JSON.stringify(before)===JSON.stringify(after);writeFileSync(`docs/evidence/a6-p1-${label}-conditions.json`,JSON.stringify({baseline:baseline??null,head:git('rev-parse','HEAD').toString().trim(),label,workers:1,repeats:3,retries:0,tracing:'on',sourceRoot:baseline?'exact Git export':'current workspace',unchanged,before,after},null,2));process.exitCode=code||(!unchanged?1:0);});
