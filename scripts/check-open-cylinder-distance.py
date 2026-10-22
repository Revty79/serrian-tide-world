from decimal import Decimal as D, localcontext
import json, subprocess

with localcontext() as ctx:
 ctx.prec=85
 def atan(x):
  if not x:return D(0)
  flip=x>1
  if flip:x=1/x
  for _ in range(6):x=x/(1+(1+x*x).sqrt())
  power=x;answer=x;square=x*x
  for j in range(1,110):
   power*=-square;answer+=power/D(2*j+1)
  answer*=64
  return PI/2-answer if flip else answer
 PI=16*atan(D(1)/5)-4*atan(D(1)/239)
 def angle(k,r):return PI/2 if not k else atan(((r-k)*(r+k)).sqrt()/k)
 def annulus(ri,a,b,d):
  qa=((a-ri)*(a+ri)).sqrt();qb=((b-ri)*(b+ri)).sqrt();beta=angle(ri,a)+angle(ri,b)
  if d>=beta:return qa+qb+ri*(d-beta)
  # The independent angle computation avoids sharing production pathTrig.
  x=d/2;power=x;sine=x
  for n in range(1,100):power*=-(x*x)/D((2*n)*(2*n+1));sine+=power
  return ((a-b)**2+4*a*b*sine*sine).sqrt()
 def inner(ri,b,d,z):
  if not z:return annulus(ri,ri,b,d)
  if b==ri:return (z*z+(ri*d)**2).sqrt()
  low=D(0);high=d
  for _ in range(250):
   phi=(low+high)/2;k=ri*(ri*phi/(z*z+(ri*phi)**2).sqrt())
   if phi+angle(k,b)-angle(k,ri)<d:low=phi
   else:high=phi
  phi=(low+high)/2
  return (z*z+(ri*phi)**2).sqrt()+annulus(ri,ri,b,d-phi)
 program="import {createAnnularDistance} from './src/surfaces/open-cylinder-annular-distance.ts';const rows=[];for(const scale of [1,1000,625000])for(const theta of [0,.001,.31,1.7,Math.PI])for(const z of [0,31,700]){const ri=800*scale,ro=1000*scale,L=1600*scale,m=createAnnularDistance(ri,ro,L),b=970*scale,axial=z*scale;rows.push({ri,ro,L,b,theta,axial,q:m.innerToRim(b,theta,axial)});}console.log(JSON.stringify(rows));"
 rows=json.loads(subprocess.check_output(['node','--input-type=module','-e',program],text=True))
 worst=D(0);goldens=[]
 for row in rows:
  ri,b,t,z=map(lambda k:D.from_float(float(row[k])),['ri','b','theta','axial']);truth=inner(ri,b,t,z);lo=D.from_float(row['q']['lower']);hi=D.from_float(row['q']['upper'])
  assert lo<=truth<=hi,(row,str(truth),str(lo),str(hi))
  worst=max(worst,(hi-lo)/max(D(1),truth));goldens.append({**{k:row[k] for k in ['ri','ro','L','b','theta','axial']},'expectedDistanceMeters':str(truth)})
 meridian_program="""import {createOpenCylinderGeometry} from './src/surfaces/open-cylinder.ts';import {openCylinderMeridianDistance} from './src/surfaces/open-cylinder-meridian.ts';const rows=[];for(const [ro,ri,L]of [[1000.3,800.2,1600.1],[625000000.13,500000000.27,1000000000],[1.125,1,1.3]]){const g=createOpenCylinderGeometry({identity:{worldId:'oracle',surfaceId:'boundary'},provider:'physical-open-cylinder',version:1,configuration:'both-open',outerRadiusMeters:ro,innerRadiusMeters:ri,lengthMeters:L});for(const a of ['outer-wall','rim-end','inner-wall','rim-start'])for(const b of ['outer-wall','rim-end','inner-wall','rim-start']){const p={...g.identity,patchId:a,u:0,v:(a.endsWith('wall')?L:ro-ri)*.313},q={...g.identity,patchId:b,u:0,v:(b.endsWith('wall')?L:ro-ri)*.731};rows.push({ro,ri,L,a,b,vA:p.v,vB:q.v,q:openCylinderMeridianDistance(g,p,q,ro*1e-6)});}}console.log(JSON.stringify(rows));"""
 meridian_rows=json.loads(subprocess.check_output(['node','--input-type=module','-e',meridian_program],text=True));meridian_goldens=[]
 for row in meridian_rows:
  ro,ri,L,vA,vB=map(lambda k:D.from_float(float(row[k])),['ro','ri','L','vA','vB'])
  def prefix(patch,v):return {'outer-wall':v,'rim-end':L+v,'inner-wall':L+ro-ri+v,'rim-start':2*L+ro-ri+v}[patch]
  delta=abs(prefix(row['b'],vB)-prefix(row['a'],vA));truth=min(delta,2*L+2*ro-2*ri-delta)
  assert D.from_float(row['q']['lower'])<=truth<=D.from_float(row['q']['upper']),(row,str(truth))
  meridian_goldens.append({**{k:row[k] for k in ['ro','ri','L','a','b','vA','vB']},'expectedDistanceMeters':str(truth)})
 print(json.dumps({'annularCases':len(rows),'meridianCases':len(meridian_rows),'independentDecimalDigits':ctx.prec,'allEnclosed':True,'worstAnnularRelativeWidth':str(worst)}))

# Optional committed independent reference fixture; normal reruns write only .local.
from pathlib import Path
import sys
output=Path(sys.argv[1] if len(sys.argv)>1 else '.local/open-annular-distance-oracle.json')
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps({'independentDecimalDigits':85,'method':'Decimal tangent/arc geometry and Fermat bisection; independent trigonometric series and exact meridian dimensional sums','cases':goldens,'meridianCases':meridian_goldens},indent=2)+'\n',encoding='utf-8')
