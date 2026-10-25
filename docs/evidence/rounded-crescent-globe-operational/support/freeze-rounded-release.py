import json,hashlib,zipfile,shutil,sys,subprocess
from pathlib import Path
stage=sys.argv[1]
assert stage in ['B','C']
folder=Path('docs/evidence/rounded-crescent-globe-'+('operational' if stage=='B' else 'final'))
assert not folder.exists(),f'Refusing to overwrite frozen evidence: {folder}'
folder.mkdir(parents=True)
def read(p):
 b=p.read_bytes()
 return b.replace(b'\r\n',b'\n') if p.suffix.lower() not in ['.zip','.png','.jpg','.webp','.woff2'] else b
def sha(b):return hashlib.sha256(b).hexdigest()
sources=sorted({Path(p) for p in subprocess.check_output(['git','ls-files','-z']).decode().split('\0') if p.startswith(('src/','tests/','dev/'))}|set(Path('.').glob('playwright*.*'))|{Path(p) for p in ['AGENTS.md','docs/ATLAS-RENDERING-STANDARD.md','docs/ATLAS-SHAPES-FIRST-2026-10-23.md','docs/ROUNDED-CRESCENT-GLOBE-WORLDS.md','package.json','package-lock.json','docs/evidence/a7-p1c-saved-geography-n128.json','docs/evidence/a7-p1c-saved-geography-n256.json','index.html','tsconfig.json','vite.config.ts','.gitattributes']})
hashes={p.as_posix():sha(read(p)) for p in sources}
runs= ['rounded-final-root-tools','rounded-final-life-touch','rounded-idle-field-navigation-pixels','rounded-root-coherent-dpi','rounded-fine-observer-calibration'] if stage=='B' else ['rounded-final-root-profiles','rounded-terminal-warm-stiff','rounded-final-framed-pixels','rounded-final-root-configuration','rounded-release-source','rounded-release-types','rounded-release-build','rounded-release-bundle-verified','rounded-final-config-list','rounded-shared-remaining-browser','rounded-final-shared-sampling','rounded-shared-cut-long-stroke']
rundata=[]
for name in runs:
 m=json.loads(Path('.local',name+'-manifest.json').read_text());assert m['exitCode']==0 and m['inputsUnchanged'],name
 diffs=[p for p,h in m['sourceHashes'].items() if hashes.get(p)!=h]
 rundata.append({'name':name,'command':m['command'],'sourceDifferencesSinceRun':diffs,'exitCode':0,'inputsUnchangedDuringRun':True})
 for suffix in ['.log','-manifest.json','-report.json']:
  options=[Path('.local',name+suffix),Path('.local/.local',name+suffix)]
  p=next((p for p in options if p.exists()),None)
  if p:(folder/p.name).write_bytes(read(p))
dirs=['rounded-tools','rounded-lifecycle','rounded-touch','rounded-current-output','rounded-navigation-pixels'] if stage=='B' else ['rounded-profile-response','rounded-pixels','rounded-configuration-pixels','rounded-configuration','rounded-shared-native-evidence','cut-globe-long-stroke']
for directory in dirs:
 p=Path('.local',directory);assert p.exists(),directory
 for f in p.rglob('*'):
  if f.is_file():
   dest=folder/'raw'/directory/f.relative_to(p);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(read(f))
if stage=='C':
 for p in Path('.local/cut-globe-workflow').glob('n128-canvas*'):
  if p.is_file():
   d=folder/'raw'/'cut-globe-workflow'/p.name;d.parent.mkdir(parents=True,exist_ok=True);d.write_bytes(read(p))
 for glob in ['rounded-built-*.png','rounded-built-smoke.json']:
  for p in Path('.local').glob(glob):(folder/p.name).write_bytes(read(p))
 # Keep failed diagnostics distinct from successful qualification.
 for name in ['rounded-release-bundle','rounded-final-root-pixels','rounded-final-root-lifecycle','rounded-shared-cut-canvas-isolated','rounded-cut-canvas-observer-control','rounded-shared-cut-scheduler-browser','rounded-fresh-shared-browser','rounded-final-shared-browser']:
  for suffix in ['.log','-manifest.json']:
   p=Path('.local',name+suffix)
   if p.exists():
    d=folder/'diagnostics'/p.name;d.parent.mkdir(parents=True,exist_ok=True);d.write_bytes(read(p))
 for name in ['rounded-pixel-thin-before-framing.json','cut-canvas-sampling-control.json']:
  p=Path('.local',name);(folder/p.name).write_bytes(read(p))
for name in ['rounded-release-metrics.json','run-pass16.py','freeze-rounded-release.py','smoke-rounded-built.mjs','rounded-release-checks.py','rounded-shared.config.mjs','vite-rounded-final.config.mjs','rounded-shared-source-selection.json']:
 p=Path('.local',name);d=folder/'support'/name;d.parent.mkdir(parents=True,exist_ok=True);d.write_bytes(read(p))
with zipfile.ZipFile(folder/'reproduction.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sources:z.writestr(p.as_posix(),read(p))
 for p in (folder/'support').rglob('*'):
  if p.is_file():z.writestr('.local/'+p.name,read(p))
receipt={'checkpoint':stage,'date':'2026-10-25','foundation':'e1c0d3eeb542d1ea307d0c6f32fe1a33810ffe91','baseline':'ecee5d9df8eb2a59b92c306924fa05d9f0cd617e','sourceParent':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'claims':('Operational Rounded Crescent editor, ordinary all-tool response, held input, navigation, DPR current-frame parity, history and graphics recovery.' if stage=='B' else 'Supported configuration, independent pixels, numerical distance qualification, strict v46 persistence, affected-family regression, typecheck, production build and built-bundle workflow.'),'ownerAcceptance':'Pending; browser touch/pen is emulation, not physical device evidence. No server deployment. Filled-Torus not started.','testRuns':rundata,'evidenceInterpretation':'Manifests identify exact inputs at each run. Listed sourceDifferencesSinceRun are explicit; tests were not all executed at this final revision. The final source/build/default pixel/configuration runs use current app source. Earlier tool/profile/DPR runs preceded Rounded-only idle worker-field warmup, which has independent byte-exact navigation and complete held/context recovery coverage. The difficult Canvas profile also preceded the GPU default-buffer clear, which does not execute in forced Canvas. Later whitespace removal in the navigation module has no behavior effect. The Rounded Playwright default URL now uses the normal 5262 preview; recorded browser runs explicitly used ATLAS_TEST_URL=5301 against the same checkout, so that later config-only default does not change their effective URL. Shared native families retain native paths. Diagnostic failures are not successful tests.','sourceHashes':hashes,'artifactHashes':{p.relative_to(folder).as_posix():sha(read(p)) for p in sorted(folder.rglob('*')) if p.is_file()}}
(folder/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Frozen',stage,len(hashes),'source blobs',len(receipt['artifactHashes']),'artifacts',sum(p.stat().st_size for p in folder.rglob('*') if p.is_file()),'bytes')
