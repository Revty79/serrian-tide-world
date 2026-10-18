"""Independent 65-digit continuous-stroke fixtures, standard library only.
Reuses only the preserved independent reference definitions/graph, never their main.
Analytic connected trajectories and Decimal spacing; immutable source per dab,
Float32 rounding between dabs. No production TypeScript code is executed.
"""
import ast, hashlib, json, struct
from pathlib import Path
from decimal import Decimal as D
root=Path(__file__).resolve().parent.parent; source=root/'scripts/reference-cylinder-dabs.py'
tree=ast.parse(source.read_text(encoding='utf8')); prefix=[]
for node in tree.body:
    if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='centers' for t in node.targets): break
    prefix.append(node)
definition=ast.unparse(ast.Module(body=prefix,type_ignores=[]))
def namespace(length):
    text=definition.replace("D('1.6')",f"D('{length}')")
    ns={'__file__':str(source),'__name__':'independent_stroke_reference'};exec(compile(text,str(source),'exec'),ns);ns['cos']=ns['namespace']['cos'];return ns
def pt(region,theta,v): return {'region':region,'angle':theta,'coordinate':v}
def disk_line(region,a,b,theta0,theta1,length): return {'kind':'disk','region':region,'a':a,'b':b,'theta0':theta0,'theta1':theta1,'length':length}
def axial(theta,a,b): return {'kind':'side','theta':theta,'a':a,'b':b,'length':abs(b-a)}
def word(x): return struct.unpack('<I',struct.pack('<f',float(x)))[0]
def f32(x): return D.from_float(struct.unpack('<f',struct.pack('<f',float(x)))[0])
def position(piece,t,ns):
    if piece['kind']=='side': return pt('side',piece['theta'],(1-t)*piece['a']+t*piece['b'])
    if piece['kind']=='angular': return pt('side',(1-t)*piece['a']+t*piece['b'],piece['z'])
    # All disk reference segments are one physical diameter/ray, in signed Cartesian radial coordinates.
    r=(1-t)*piece['a']+t*piece['b'];theta=piece['theta0'] if r>=0 else piece['theta1']
    return pt(piece['region'],theta,abs(r))
records=[]
for name in ['rims-round-trip','side-wrap','start-shortcut','end-shortcut','tied-end-preferred','near-tie-start-preferred']:
    L=D('.2') if 'preferred' in name else D('1.6');ns=namespace(str(L));PI=ns['PI'];theta=D('.13');spacing=D('.4');direction=None
    if name=='rims-round-trip':
        pieces=[disk_line('start',D(0),D(1),theta,theta,D(1)),axial(theta,D(0),L),disk_line('end',D(1),D(0),theta,theta,D(1)),disk_line('end',D(0),D(1),theta,theta,D(1)),axial(theta,L,D(0)),disk_line('start',D(1),D(0),theta,theta,D(1))]
    elif name=='side-wrap':
        spacing=D('.1');pieces=[{'kind':'angular','a':PI-D('.2'),'b':PI+D('.2'),'z':D('.8'),'length':D('.4')}]
    else:
        spacing=D('.2');region='end' if name in ['end-shortcut','tied-end-preferred'] else 'start';z0=L/2 if 'preferred' in name else L-D('.02') if region=='end' else D('.02');z1=z0+(D('1e-10') if name=='near-tie-start-preferred' else 0);capz=L if region=='end' else D(0);direction=[0,0,1 if region=='end' else -1]
        pieces=[axial(D(0),z0,capz),disk_line(region,D(1),D(-1),D(0),PI,D(2)),axial(PI,capz,z1)]
    start=position(pieces[0],D(0),ns);inputs=[start]+[position(p,D(1),ns) for p in pieces]
    sparse=[inputs[0],inputs[-1]] if name!='rims-round-trip' else inputs
    dense=[start]+[position(p,D(k)/4,ns) for p in pieces for k in range(1,5)]
    length=sum((p['length'] for p in pieces),D(0));count=int(length/spacing);centers=[start]
    for k in range(1,count+1):
        d=D(k)*spacing;offset=D(0)
        for p in pieces:
            if d<=offset+p['length']:
                centers.append(position(p,(d-offset)/p['length'],ns));break
            offset+=p['length']
    before=[D((i*13)%17-8)*20 for i in range(ns['count'])];before[1]=D('-0');graph=ns['graph'];B=D('.713');weights=[]
    xyz=lambda p:[(D(1) if p['region']=='side' else p['coordinate'])*ns['cos'](p['angle']),(D(1) if p['region']=='side' else p['coordinate'])*ns['sin'](p['angle']),p['coordinate'] if p['region']=='side' else D(0) if p['region']=='start' else L]
    for center in centers:
        cxyz=xyz(center);row=[]
        for sample in ns['samples']:
            chord=sum(((a-b)**2 for a,b in zip(cxyz,xyz(sample))),D(0)).sqrt()
            d=chord if chord>=B else ns['distance'](center,sample)
            row.append(D(0) if d>=B else (1-d/B)**2*(1+2*d/B))
        weights.append(row)
    results={}
    for tool in ['raise','lower','smooth','flatten']:
        field=before[:]
        for row in weights:
            next_field=field[:]
            for i,w in enumerate(row):
                if w==0:continue
                if tool=='raise': value=field[i]+D('43.7')*w
                elif tool=='lower': value=field[i]-D('43.7')*w
                elif tool=='flatten': value=(1-D('.65')*w)*field[i]+D('.65')*w*D(-250)
                else:
                    delta=sum((g*(field[j]-field[i]) for j,g in graph[i].items()),D(0))/(2*sum(graph[i].values()))
                    if delta==0:continue
                    value=field[i]+D('.65')*w*delta
                next_field[i]=f32(value)
            field=next_field
        results[tool]={'words':[word(v) for v in field],'values':[str(v) for v in field]}
    serialize=lambda p:{'region':p['region'],'angle':str(p['angle']),'coordinate':str(p['coordinate'])}
    records.append({'name':name,'length':str(L),'radius':'1','spacing':str(spacing),'brushRadius':str(B),'travelLength':str(length),'dabCount':len(centers),'initialDirection':direction,'inputs':[serialize(p) for p in sparse],'denseInputs':[serialize(p) for p in dense],'centers':[serialize(p) for p in centers],'beforeWords':[word(v) for v in before],'beforeValues':[str(v) for v in before],'expected':results})
    print('independent stroke',name,'dabs',len(centers),flush=True)
output={'method':'65-digit independent continuous surface distances and symbolic finite-volume graph; analytic connected paths and exact Decimal spacing; immutable source per dab and Float32 rounding between dabs; no production TypeScript','definitionSha256':hashlib.sha256(definition.encode()).hexdigest(),'resolution':{'angularSamples':5,'axialCells':3,'radialCells':2},'strength':'43.7','intensity':'.65','flattenTarget':'-250','cases':records}
payload=json.dumps(output,indent=2)+'\n'
(root/'src/terrain/fixtures/cylinder-stroke-reference.json').write_text(payload,encoding='utf8')
(root/'docs/evidence/a7-b2b2-independent-stroke-reference.json').write_text(payload,encoding='utf8')
