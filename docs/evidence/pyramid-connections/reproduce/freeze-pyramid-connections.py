import hashlib,json,subprocess
from pathlib import Path
root=Path.cwd()
paths=subprocess.check_output(['rg','--files','--hidden','-g','!.git','-g','!node_modules','-g','!.local','-g','!dist','-g','!docs/evidence','-g','!test-results','-g','!playwright-report'],cwd=root,text=True).splitlines()
paths=sorted(p.replace('\\','/') for p in paths if p.startswith(('src/','src\\','tests/','tests\\')) or p.endswith(('.json','.mjs','.ts','.md')) and not p.startswith(('docs/','docs\\')) or p.replace('\\','/') in ['docs/ATLAS-PHASE2-COURSE-CORRECTION.md','docs/ATLAS-UNIVERSAL-EXCAVATION.md','docs/ATLAS-RENDERING-STANDARD.md','docs/PYRAMID-CONNECTIONS.md'])
hashes={p:hashlib.sha256((root/p).read_bytes().replace(b'\r\n',b'\n')).hexdigest() for p in paths}
p=root/'.local/pyramid-connections-final-source.json'
p.write_text(json.dumps({'baseCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'canonicalLF':hashes},separators=(',',':'))+'\n',encoding='utf-8')
print(json.dumps({'sourceInputs':len(hashes),'manifest':str(p)}))
