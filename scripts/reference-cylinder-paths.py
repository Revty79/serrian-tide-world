"""Independent 65-digit audit of actual reconstructed physical routes and samples.
Run after: node --expose-gc scripts/measure-cylinder-paths.mjs
Only B1's independent Decimal definitions are loaded, never its receipt-writing main.
No production TypeScript numerical/path/interpolation code is executed here.
"""
import ast, hashlib, json
from decimal import Decimal as D
from pathlib import Path

root=Path(__file__).resolve().parent.parent
tree=ast.parse((root/'scripts/reference-cylinder-distance.py').read_text(encoding='utf8')); prefix=[]
for node in tree.body:
    if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='cases' for t in node.targets): break
    prefix.append(node)
ns={'__name__':'decimal_physical_path_audit'}
exec(compile(ast.Module(body=prefix,type_ignores=[]),'independent-decimal-definitions','exec'),ns)
sin,cos=ns['sin'],ns['cos']
def dec(x): return D(str(x))
def norm(v): return sum((x*x for x in v),D(0)).sqrt()
def diff(a,b): return norm([x-y for x,y in zip(a,b)])
def physical(p,R,L):
    theta=dec(p['u'])*(-1 if p['patchId']=='cap-end' else 1)
    rho=R if p['patchId']=='side' else dec(p['v'])
    z=dec(p['v']) if p['patchId']=='side' else D(0) if p['patchId']=='cap-start' else L
    return [rho*cos(theta),rho*sin(theta),z]

path=root/'docs/evidence/a7-b2b1-path-measurements.json'; raw=path.read_bytes(); data=json.loads(raw); proofs=[]
for record in data['records']:
    p=record['path']; R=dec(record['R']); L=dec(record['L']); bound=dec(p['positionErrorBoundMeters']); length_bound=dec(p['lengthErrorBoundMeters']); tolerance=dec(p['requestedToleranceMeters'])
    parts=p['pieces']; lengths=[]
    for piece in parts:
        a=physical(piece['start'],R,L); b=physical(piece['end'],R,L)
        lengths.append(norm([R*dec(piece['angleDelta']),dec(piece['end']['v'])-dec(piece['start']['v'])]) if piece['kind']=='side-geodesic' else diff(a,b))
    real_length=sum(lengths,D(0)); nominal=dec(p['lengthMeters']); length_error=abs(real_length-nominal)
    assert length_error<=length_bound,(record['name'],'length enclosure',length_error,length_bound)
    gap=max(D(0),real_length-dec(p['distance']['lowerBoundMeters']))
    assert gap<=tolerance,(record['name'],'shortest certificate',gap,tolerance)
    endpoint_error=D(0); join_error=D(0); maximum=D(0); max_polar=D(0)
    if parts:
        endpoint_error=max(diff(physical(p['start'],R,L),physical(parts[0]['start'],R,L)),diff(physical(p['end'],R,L),physical(parts[-1]['end'],R,L)))
        for a,b in zip(parts,parts[1:]): join_error=max(join_error,diff(physical(a['end'],R,L),physical(b['start'],R,L)))
    for sample in record['samples']:
        index=sample['pieceIndex']
        if index==-1: expected=physical(p['start'],R,L)
        else:
            piece=parts[index]; t=(dec(sample['distanceMeters'])-dec(piece['fromMeters']))/dec(piece['lengthMeters']); t=max(D(0),min(D(1),t))
            if piece['kind']=='side-geodesic':
                theta=dec(piece['startAngle'])+t*dec(piece['angleDelta'])
                expected=[R*cos(theta),R*sin(theta),(1-t)*dec(piece['start']['v'])+t*dec(piece['end']['v'])]
            else:
                a=physical(piece['start'],R,L); b=physical(piece['end'],R,L); expected=[(1-t)*x+t*y for x,y in zip(a,b)]
        actual=[dec(x) for x in sample['referencePosition']]
        maximum=max(maximum,diff(actual,expected)); max_polar=max(max_polar,diff(actual,physical(sample['position'],R,L)))
        assert sample['position']['worldId']==p['start']['worldId'] and sample['position']['surfaceId']==p['start']['surfaceId']
        assert D(0)<=dec(sample['position']['v'])<=(L if sample['position']['patchId']=='side' else R)
    assert max(maximum,max_polar,endpoint_error,join_error)<=bound,(record['name'],'position enclosure',maximum,bound)
    reference=dec(record['reference']) if 'reference' in record else None
    if reference is not None: assert abs(real_length-reference)<=tolerance,(record['name'],'independent ideal comparison')
    proofs.append({'name':record['name'],'routeClass':p['routeClass'],'pieceCount':len(parts),'samples':len(record['samples']),'realPieceLengthSumMeters':str(real_length),'nominalLengthErrorMeters':str(length_error),'nominalLengthErrorBoundMeters':str(length_bound),'shortestExcessFromGlobalLowerMeters':str(gap),'requestedToleranceMeters':str(tolerance),'maxInterpolationErrorMeters':str(maximum),'maxPolarRepresentationErrorMeters':str(max_polar),'maxEndpointErrorMeters':str(endpoint_error),'maxRimJoinErrorMeters':str(join_error),'positionErrorBoundMeters':str(bound),'maxPositionErrorOverBound':str(max(maximum,max_polar,endpoint_error,join_error)/bound),'independentIdealLengthMeters':str(reference) if reference is not None else None,'realLengthErrorVsIdealMeters':str(real_length-reference) if reference is not None else None})
output={'method':'65-digit Decimal Taylor sine/cosine and Euclidean norms; independent piece integration, exact disk chords and unwrapped side geodesics; independent B1 ideal lengths plus analytic fixtures','measurementSha256':hashlib.sha256(raw).hexdigest(),'definitionSha256':hashlib.sha256(ast.unparse(ast.Module(body=prefix,type_ignores=[])).encode()).hexdigest(),'precisionDigits':65,'limitation':'Receipt Numbers are read from their shortest decimal strings; Float64-to-decimal representation differences are covered by the declared reconstruction guards. Proof checks actual feasible paths, including alternative near-tie routes; it does not certify uniqueness. B1 supplies the global lower enclosure. No browser/mobile or elevated-relief claim.','cases':proofs,'totalSamples':sum(p['samples'] for p in proofs),'passed':len(proofs),'failed':0}
(root/'docs/evidence/a7-b2b1-independent-path-proof.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf8')
print('Independent Decimal path audit:',len(proofs),'cases,',output['totalSamples'],'samples; all guards and shortest-gap certificates pass.')
