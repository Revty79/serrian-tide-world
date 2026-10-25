import subprocess,sys,os,json
from pathlib import Path
os.environ['ATLAS_TEST_URL']='http://127.0.0.1:5301'
os.environ['ATLAS_REQUIRE_SPHERE_GPU']='1'
base=['node','node_modules/@playwright/test/cli.js','test','--config','.local/rounded-shared.config.mjs']
jobs=[('rounded-final-shared-sampling',base+['--grep','shared (Sphere|Crescent) N128|hollow sphere N128|Crescent-Cut Globe N128 Canvas|spherical standards N128','--workers=1','--retries=0','--max-failures=1']),('rounded-release-source',['node','--test','--test-concurrency=1',*json.loads(Path('.local/rounded-shared-source-selection.json').read_text())]),('rounded-release-types',['node','node_modules/typescript/bin/tsc','--noEmit']),('rounded-release-build',['node','node_modules/vite/bin/vite.js','build']),('rounded-release-bundle-verified',['node','.local/smoke-rounded-built.mjs'])]
for name,args in jobs:
 if name=='rounded-release-bundle-verified':os.environ.pop('ATLAS_TEST_URL',None)
 print('START',name,flush=True)
 r=subprocess.run([sys.executable,'-X','utf8','.local/run-pass16.py',name,*args])
 if r.returncode:sys.exit(r.returncode)
