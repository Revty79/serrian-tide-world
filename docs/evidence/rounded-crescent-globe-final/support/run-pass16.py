import subprocess,os,json,hashlib,sys,datetime
from pathlib import Path
name=sys.argv[1];args=sys.argv[2:];env=os.environ.copy();env['RIBBON_REPORT']='.local/'+name+'-report.json'
paths=[*Path('src').rglob('*'),*Path('tests').rglob('*'),*Path('.').glob('playwright*.mjs'),Path('package.json'),Path('package-lock.json'),Path('tsconfig.json'),Path('vite.config.ts')]
def hashes():
 return {p.as_posix():hashlib.sha256(p.read_bytes().replace(b'\r\n',b'\n')).hexdigest() for p in paths if p.is_file()}
manifest={'name':name,'command':args,'started':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceHashes':hashes(),'heavyExecution':'one serial process; BelowNormalPriority; Chrome workers=1/retries=0'}
Path('.local/'+name+'-manifest.json').write_text(json.dumps(manifest,indent=2))
with Path('.local/'+name+'.log').open('w',encoding='utf-8') as f:
 f.write('Command: '+json.dumps(args)+'\n');f.flush();p=subprocess.Popen(args,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.BELOW_NORMAL_PRIORITY_CLASS,env=env);code=p.wait();f.write('\nExit: '+str(code)+'\n')
manifest.update(exitCode=code,ended=datetime.datetime.now(datetime.timezone.utc).isoformat(),inputsUnchanged=hashes()==manifest['sourceHashes']);Path('.local/'+name+'-manifest.json').write_text(json.dumps(manifest,indent=2));print(name,code,'inputs unchanged',manifest['inputsUnchanged'],flush=True);raise SystemExit(code)
