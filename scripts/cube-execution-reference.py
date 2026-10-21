"""Cube-C2B1 verification-only oracle. No new TypeScript executor/history import.
Small complete dabs use the accepted independent Fraction/Float32 C1 oracle.
Large complete-word streams compare a separately written sequential C1 executor;
this independently verifies composition/history, not a new large-grid math oracle.
"""
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import sys
import time
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('cube_c1', Path(__file__).with_name('cube-dab-reference.py'))
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)

def history(case, initial, final, undo, redo):
    expected = [{'index': i, 'beforeWord': a, 'afterWord': b} for i, (a,b) in enumerate(zip(initial,final)) if a != b]
    assert case['changes'] == expected, case['label']
    assert len(case['operations']) == (1 if expected else 0)
    if expected:
        assert undo == initial and redo == final
        op = case['operations'][0]
        assert op['samples'] == len(expected)
        assert op['dabs'] == case['committedDabs']
        assert op['termination'] == {'complete':'released','cancelled':'cancelled','failed':'failed'}[case['status']]
    else:
        assert initial == final
    assert case['statistics']['committedDabs'] == case['committedDabs']
    assert case['statistics']['history']['activeBytes'] == 0
    assert case['statistics']['history']['draftBytes'] == 0
    if case['status'] == 'complete':
        assert case['committedDabs'] == case['expectedCenterCount']
        assert case['statistics']['uncompletedInputs'] == 0
    return len(expected)

if __name__ == '__main__':
    at=time.perf_counter()
    payload=json.load(sys.stdin)
    geometry=[reference.check_case(c) for c in payload['geometryCases']]
    small_results=[]
    for case in payload['smallCases']:
        previous=case['initialWords']
        checked=0
        for dab in case['dabs']:
            assert dab['beforeWords'] == previous
            result=reference.check_dab(dab,geometry)
            checked += result['samples']
            previous=dab['afterWords']
        assert previous == case['finalWords']
        changed=history(case,case['initialWords'],case['finalWords'],case['undoWords'],case['redoWords'])
        small_results.append({'label':case['label'],'dabs':len(case['dabs']),'independentlyCalculatedFloat32Words':checked,'historyWords':changed,'status':case['status']})
    large_results=[]
    for case in payload['largeCases']:
        proof=case['fullWords'];compressed=Path(proof['path']).read_bytes()
        assert hashlib.sha256(compressed).hexdigest() == proof['sha256']
        raw=gzip.decompress(compressed)
        assert len(raw) == proof['uncompressedBytes'] and hashlib.sha256(raw).hexdigest() == proof['uncompressedSha256']
        vectors={}
        for vector in proof['vectors']:
            start=vector['offsetBytes'];count=vector['wordCount'];block=raw[start:start+count*4]
            assert hashlib.sha256(block).hexdigest() == vector['sha256']
            vectors[vector['name']]=struct.unpack('<'+'I'*count,block)
        checks=0
        for i in range(case['committedDabs']):
            assert vectors[f'actual-{i}'] == vectors[f'reference-{i}']
            checks += len(vectors[f'actual-{i}'])
        assert vectors['final'] == vectors[f'reference-{case["committedDabs"]-1}']
        changed=history(case,vectors['initial'],vectors['final'],vectors['undo'],vectors['redo'])
        large_results.append({'label':case['label'],'n':case['n'],'dabs':case['committedDabs'],'completeSequentialWordComparisons':checks,'historyWords':changed,'allReplayWordsExact':True})
    fault_results=[]
    for case in payload['faultCases']:
        reference.check_dab(case['firstDab'],geometry)
        initial,prefix,current=case['initial'],case['prefix'],case['current']
        expected=prefix.copy()
        external=case.get('external')
        if external:
            expected[external['index']]=external['word']
        assert current == expected
        changes=[{'index':i,'beforeWord':a,'afterWord':b} for i,(a,b) in enumerate(zip(initial,prefix)) if a != b]
        assert case['changes'] == changes
        expected_undo,expected_redo=initial.copy(),prefix.copy()
        if external and not external['overlap']:
            expected_undo[external['index']]=external['word'];expected_redo[external['index']]=external['word']
        if external and external['overlap']:
            assert case['blockedReplay'] and case['blockedWords'] == current
        assert case['undo'] == expected_undo and case['redo'] == expected_redo
        assert case['statistics']['committedDabs'] == 1 and case['statistics']['pendingDabStage'] == 'none'
        fault_results.append({'kind':case['kind'],'allCanonicalWordsExact':len(initial),'historyWords':len(changes),'foreignWordsProtected':True})
    result={'oracle':'Small: accepted independent Python Fraction/C1 finite Float32 formulas. Large: complete-word sequential-composition and raw history oracle; reused accepted C1 primitive in a separate executor.',
      'python':sys.version,'smallGestures':len(small_results),'largeGestures':len(large_results),'geometryCases':len(geometry),
      'independentlyCalculatedSmallDabs':sum(r['dabs'] for r in small_results),'independentlyCalculatedSmallWords':sum(r['independentlyCalculatedFloat32Words'] for r in small_results),
      'largeSequentialWordComparisons':sum(r['completeSequentialWordComparisons'] for r in large_results),'historyWords':sum(r['historyWords'] for r in small_results+large_results),
      'faultCases':len(fault_results),'independentFaultDabWords':sum(r['allCanonicalWordsExact'] for r in fault_results),
      'elapsedMs':(time.perf_counter()-at)*1000,'smallResults':small_results,'largeResults':large_results,'faultResults':fault_results}
    print(json.dumps(result,indent=2))
