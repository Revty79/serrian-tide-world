import subprocess,sys,json,hashlib
sha,folder=sys.argv[1:];raw=subprocess.check_output(['git','show',sha+':'+folder+'/receipt.json']);receipt=json.loads(raw);expected={**receipt.get('sourceHashes',{}),**receipt.get('artifacts',{}),**{folder+'/'+p:h for p,h in receipt.get('artifactHashes',{}).items()}};requests=[sha+':'+p for p in expected];out=subprocess.check_output(['git','cat-file','--batch'],input=('\n'.join(requests)+'\n').encode());at=0;errors=[]
for path,hash in expected.items():
 end=out.index(b'\n',at);header=out[at:end].split();size=int(header[-1]);body=out[end+1:end+1+size];at=end+2+size
 if hashlib.sha256(body).hexdigest()!=hash:errors.append(path)
print(json.dumps({'commit':sha,'receipt':folder,'verifiedBlobs':len(expected),'errors':errors}));raise SystemExit(bool(errors))
