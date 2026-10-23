import argparse,hashlib,json,subprocess
from pathlib import Path
root=Path('D:/serrian-tide-world');out=root/'docs/evidence/pyramid-connections'
parser=argparse.ArgumentParser();parser.add_argument('--paths',action='store_true');parser.add_argument('--tree',default='');args=parser.parse_args()
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));sha=lambda b:hashlib.sha256(b).hexdigest()
r=read(out/'receipt.json');expected=dict(r['sourceSha256']);expected.update({'docs/evidence/pyramid-connections/'+p:h for p,h in r['artifactSha256'].items()});expected['docs/evidence/pyramid-connections/receipt.json']=sha((out/'receipt.json').read_bytes())
if args.paths:
 assert not subprocess.check_output(['git','diff','--cached','--name-only'],cwd=root).strip(),'Unexpected preexisting staged work'
 changed=subprocess.check_output(['git','ls-files','-m','-o','--exclude-standard','-z'],cwd=root).decode().split('\0');changed=[p for p in changed if p]
 assert all(p in expected for p in changed),('Unrelated changes require preservation',[p for p in changed if p not in expected])
 (root/'.local/pyramid-connections-stage-paths.txt').write_bytes(('\0'.join(changed)+'\0').encode())
 print(json.dumps({'ownedPaths':len(changed)}));raise SystemExit()
paths=list(expected);prefix=args.tree+':' if args.tree else ':'
rsp=subprocess.run(['git','cat-file','--batch'],cwd=root,input=''.join(prefix+p+'\n' for p in paths).encode(),stdout=subprocess.PIPE,check=True).stdout;at=0
for p in paths:
 end=rsp.index(b'\n',at);header=rsp[at:end].split();at=end+1
 assert header[-1]!=b'missing',('Missing staged object',p)
 assert header[1]==b'blob',header
 size=int(header[2]);blob=rsp[at:at+size];at+=size+1
 assert sha(blob)==expected[p],('Source/evidence mismatch',p)
assert at==len(rsp)
changed=subprocess.check_output(['git','diff','--cached','--name-only'],cwd=root,text=True).splitlines()
assert all(p in expected for p in changed),('Unreviewed staged paths',[p for p in changed if p not in expected])
print(json.dumps({'verifiedBlobs':len(paths),'frozenSourceInputs':len(r['sourceSha256']),'evidenceArtifacts':len(r['artifactSha256']),'tree':args.tree or 'staged index'}))
