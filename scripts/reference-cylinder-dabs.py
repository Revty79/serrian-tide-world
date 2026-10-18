"""Independent 65-digit full-small-grid dab fixtures. Python standard library only.
Loads only definitions from the preserved B1 reference, never its receipt-writing main.
No production TypeScript geometry, candidate, smoothing or brush code is executed.
"""
import ast
from decimal import Decimal as D
from pathlib import Path
import hashlib, json, struct, time

root=Path(__file__).resolve().parent.parent
reference=root/'scripts/reference-cylinder-distance.py'
tree=ast.parse(reference.read_text(encoding='utf8')); prefix=[]
for node in tree.body:
    if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='cases' for t in node.targets): break
    prefix.append(node)
namespace={'__name__':'cylinder_decimal_reference'}
exec(compile(ast.Module(body=prefix,type_ignores=[]),str(reference),'exec'),namespace)
PI=namespace['PI']; sin=namespace['sin']; optimize=namespace['optimize']; side=namespace['side']
A,Z,P=5,3,2; L=D('1.6'); TAU=2*PI; dr=D(1)/P; dz=L/Z; da=TAU/A
S=A*(Z+1); C=1+A*(P-1); count=S+2*C
samples=[]
for row in range(Z+1):
    for col in range(A): samples.append({'region':'side','angle':TAU*col/A,'coordinate':L*row/Z,'row':row,'column':col})
for region in ['start','end']:
    samples.append({'region':region,'angle':D(0),'coordinate':D(0),'row':0,'column':0})
    for row in range(1,P):
        for col in range(A): samples.append({'region':region,'angle':(1 if region=='start' else -1)*TAU*col/A,'coordinate':D(row)/P,'row':row,'column':col})
def canonical(p):
    q=dict(p)
    if q['region']=='side' and q['coordinate'] in [D(0),L]: q['region']='start' if q['coordinate']==0 else 'end'; q['coordinate']=D(1)
    return q
def distance(p,q):
    p,q=canonical(p),canonical(q)
    delta=abs(p['angle']-q['angle'])%TAU; delta=min(delta,TAU-delta)
    if p['region']!='side' and p['coordinate']==0 or q['region']!='side' and q['coordinate']==0: delta=D(0)
    if p['region']==q['region'] and p['region']!='side':
        x,y=p['coordinate'],q['coordinate']; return ((x-y)**2+4*x*y*sin(delta/2)**2).sqrt()
    if p['region']=='side' and q['region']=='side':
        return min(side(abs(p['coordinate']-q['coordinate']),delta),optimize(p['coordinate']+q['coordinate'],D(1),D(1),delta,False)[0],optimize(2*L-p['coordinate']-q['coordinate'],D(1),D(1),delta,False)[0])
    if q['region']=='side': p,q=q,p
    if p['region']=='side': return optimize(abs(p['coordinate']-(0 if q['region']=='start' else L)),q['coordinate'],D(1),delta,False)[0]
    return optimize(L,p['coordinate'],q['coordinate'],delta,True)[0]
def key(region,row,col):
    col%=A
    if region=='side': return row*A+col
    if row==P: return (0 if region=='start' else Z*A)+(col if region=='start' else (-col)%A)
    return S+(0 if region=='start' else C)+(0 if row==0 else 1+(row-1)*A+col)
graph=[{} for _ in samples]
def edge(i,j,g):
    assert i!=j
    assert j not in graph[i]
    graph[i][j]=g;graph[j][i]=g
for row in range(Z+1):
    for col in range(A): edge(key('side',row,col),key('side',row,col+1),(dz+dr)/(2*da) if row in [0,Z] else dz/da)
for row in range(Z):
    for col in range(A): edge(key('side',row,col),key('side',row+1,col),da/dz)
for region in ['start','end']:
    for col in range(A): edge(key(region,0,0),key(region,1,col),da/2)
    for row in range(1,P):
        for col in range(A):
            edge(key(region,row,col),key(region,row,col+1),D(1)/(row*da))
            edge(key(region,row,col),key(region,row+1,col),da*(D(row)+D('.5')))
before=[D((i*13)%17-8)*20 for i in range(count)]
smooth=[sum((g*(before[j]-before[i]) for j,g in neighbors.items()),D(0))/(2*sum(neighbors.values())) for i,neighbors in enumerate(graph)]
centers=[
    ('side-start',{'region':'side','angle':D('.13'),'coordinate':D('.09')},D('1.37')),
    ('side-end',{'region':'side','angle':D('-.22'),'coordinate':D('1.51')},D('1.37')),
    ('center-fan',{'region':'start','angle':D('1.7'),'coordinate':D(0)},D('1.13')),
    ('opposite-center-route-tie',{'region':'start','angle':D(0),'coordinate':D(0)},D('3.713')),
    ('cap-end-rim',{'region':'end','angle':D('2.7'),'coordinate':D('.91')},D('.77')),
    ('all-regions',{'region':'side','angle':D('.17'),'coordinate':D('.8')},D('4.17')),
]
start=time.perf_counter(); records=[]; distances={}
for name,center,radius in centers:
    print('reference',name,flush=True)
    values=[distance(center,p) for p in samples]; distances[name]=values
    records.append((name,center,radius,values,None))
for sign in [1,-1]:
    index=23; radius=distances['side-start'][index]*(1+D(sign)*D('1e-9'))
    records.append(('boundary-inside' if sign==1 else 'boundary-outside',centers[0][1],radius,distances['side-start'],index))
def word(value): return struct.unpack('<I',struct.pack('<f',float(value)))[0]
maximum=D('3.4028234663852886e38')
cases=[]
for name,center,radius,values,sensitive in records:
    results=[]
    for i,d in enumerate(values):
        w=D(0) if d>=radius else (1-d/radius)**2*(1+2*d/radius)
        ideal={'raise':before[i]+160*w,'lower':before[i]-160*w,'smooth':before[i]+D('.65')*w*smooth[i],'flatten':(1-D('.65')*w)*before[i]+D('.65')*w*D(-250)}
        results.append({'index':i,'distance':str(d),'falloff':str(w),'before':str(before[i]),'expected':{tool:{'real':str(max(-maximum,min(maximum,v))),'float32Word':word(max(-maximum,min(maximum,v)))} for tool,v in ideal.items()}})
    cases.append({'name':name,'center':{k:str(v) if isinstance(v,D) else v for k,v in center.items()},'radius':str(radius),'sensitiveIndex':sensitive,'samples':results})
output={'method':'65-digit Decimal continuous route reference; independent symbolic finite-volume edge conductances and one immutable source field; no production brush/geometry code','referenceDefinitionSha256':hashlib.sha256(ast.unparse(ast.Module(body=prefix,type_ignores=[])).encode()).hexdigest(),'geometry':{'radius':'1','length':str(L),'angularSamples':A,'axialCells':Z,'radialCells':P},'strength':'160','intensity':'.65','flattenTarget':'-250','sampleCount':count,'cases':cases}
payload=json.dumps(output,indent=2)+'\n'
(root/'src/terrain/fixtures').mkdir(exist_ok=True)
(root/'src/terrain/fixtures/cylinder-dab-reference.json').write_text(payload,encoding='utf8')
(root/'docs/evidence/a7-b2a-independent-reference.json').write_text(payload,encoding='utf8')
print('complete',count,len(cases),'seconds',time.perf_counter()-start)
