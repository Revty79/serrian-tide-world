import json,hashlib,zipfile
from pathlib import Path
folder=Path('docs/evidence/rounded-crescent-globe-foundation')
assert not folder.exists()
folder.mkdir(parents=True)
def read(p):return p.read_bytes().replace(b'\r\n',b'\n')
def hash(data):return hashlib.sha256(data).hexdigest()
sources=sorted({p for parent in ['src','tests','dev'] for p in Path(parent).rglob('*') if p.is_file()}|set(Path('.').glob('playwright*.*'))|{Path(p) for p in ['AGENTS.md','docs/ATLAS-RENDERING-STANDARD.md','docs/ATLAS-SHAPES-FIRST-2026-10-23.md','docs/ROUNDED-CRESCENT-GLOBE-WORLDS.md','package.json','package-lock.json','index.html','tsconfig.json','vite.config.ts','.gitattributes']})
hashes={p.as_posix():hash(read(p)) for p in sources}
for name in ['rounded-foundation-final-source','rounded-foundation-build','rounded-foundation-production']:
 m=json.loads(Path('.local',name+'-manifest.json').read_text());assert m['exitCode']==0 and m['inputsUnchanged']
 assert all(hashes[p]==h for p,h in m['sourceHashes'].items())
 for suffix in ['.log','-manifest.json']:
  p=Path('.local',name+suffix);(folder/p.name).write_bytes(read(p))
for name in ['run-pass16.py','freeze-rounded-foundation.py','pass16-brief.txt']:
 (folder/name).write_bytes(read(Path('.local',name)))
with zipfile.ZipFile(folder/'reproduction.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sources:z.writestr(p.as_posix(),read(p))
 for p in folder.iterdir():
  if p.suffix!='.zip':z.writestr('evidence/'+p.name,read(p))
receipt={'checkpoint':'A','baseline':'ecee5d9df8eb2a59b92c306924fa05d9f0cd617e','claims':'Verified smooth physical body, induced metric, canonical topology and bounded numerical brush foundation. No operational editor/browser/persistence acceptance claimed.','sourceChecks':40,'sourceHashes':hashes,'artifacts':{p.as_posix():hash(p.read_bytes() if p.suffix=='.zip' else read(p)) for p in folder.iterdir()}}
(folder/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print('Frozen A:',len(hashes),'source blobs,',len(receipt['artifacts']),'artifacts')
