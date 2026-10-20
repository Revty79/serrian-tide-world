"""Cube-C1 independent certificate. Fraction reflected-square geometry + physical neighbor stencils.

Reuses the accepted Cube-B *Python* oracle, not TypeScript, fast footprint code,
Cube-A frame tables, candidate bounds, canonical-neighbor code or prepared patch code.
"""
from decimal import Decimal, localcontext
from fractions import Fraction as F
import importlib.util
from pathlib import Path
import json
import math
import struct
import sys
import time

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('cube_b_reference', Path(__file__).with_name('cube-route-reference.py'))
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)
cache = {}
FLOAT_MAX = struct.unpack('<f', struct.pack('<I', 0x7f7fffff))[0]

def float_word(value):
    return struct.unpack('<I', struct.pack('<f', max(-FLOAT_MAX, min(FLOAT_MAX, value))))[0]

def word_float(word):
    return struct.unpack('<f', struct.pack('<I', word))[0]

def number(value):
    return F.from_float(float(value))

def cart(position, side):
    return reference.cart(position['patchId'], number(position['u']), number(position['v']), side/2)

def distance(first, second, side):
    key = (first, second, side)
    if key not in cache:
        cache[key] = reference.oracle(first, second, side)
    return cache[key]

def check_case(case):
    side, radius = number(case['sideLengthMeters']), number(case['radiusMeters'])
    first, second = cart(case['center'], side), cart(case['position'], side)
    squared, ties, sequences, _ = distance(first, second, side)
    inside = squared < radius*radius
    assert case['inside'] == inside, case['label']
    result = {'label': case['label'], 'inside': inside, 'squaredNumerator': str(squared.numerator),
              'squaredDenominator': str(squared.denominator), 'physicalShortestRoutes': ties, 'oracleSequences': sequences}
    if not inside:
        assert case['squared'] is None
        return result
    actual = F(int(case['squared'])) * reference.pow2(2*case['gridExponent'])
    assert actual == squared, case['label']
    ratio = squared/(radius*radius)
    lower, upper = case['root']['lower'], case['root']['upper']
    assert number(lower)**2 <= ratio <= number(upper)**2
    if lower == upper:
        assert number(lower)**2 == ratio
    else:
        assert math.nextafter(lower, math.inf) == upper
    tail = 1-lower
    expected_weight = max(0.0, min(1.0, tail*tail*(1+2*lower)))
    weight = case['weight']
    assert weight['value'] == expected_weight
    with localcontext() as context:
        context.prec = 1600
        exact_t = (Decimal(ratio.numerator)/Decimal(ratio.denominator)).sqrt()
        ideal = (1-exact_t)*(1-exact_t)*(1+2*exact_t)
        assert Decimal.from_float(float(weight['lower'])) <= ideal <= Decimal.from_float(float(weight['upper'])), case['label']
        error = abs(Decimal.from_float(float(weight['value']))-ideal)
        assert error <= Decimal.from_float(float(weight['error'])), case['label']
    result['ratioFloor'] = lower
    result['weight'] = expected_weight
    return result

def check_dab(dab, cases):
    side, cells = number(dab['sideLengthMeters']), dab['cellsPerEdge']
    h, spacing = side/2, side/cells
    assert len(dab['samples']) == 6*cells*cells+2
    positions = [cart(s['position'], side) for s in dab['samples']]
    assert len(set(positions)) == len(positions)
    # Independently verify the literal Cartesian boundary grid and supplied chart positions.
    for sample, q in zip(dab['samples'], positions):
        a = sample['address']
        assert number(sample['position']['u']) == -h+a['column']*spacing
        assert number(sample['position']['v']) == -h+a['row']*spacing
        assert max(abs(v) for v in q) == h
    before = [word_float(w) for w in dab['beforeWords']]
    settings = dab['settings']
    output, reads = [], 0
    for i, (current, sample) in enumerate(zip(before, dab['samples'])):
        geometry = cases[sample['caseIndex']]
        next_value = current
        if geometry['inside'] and (settings['tool'] in ['raise', 'lower'] or settings['intensity'] != 0):
            weight = geometry['weight']
            reads += 1
            if settings['tool'] in ['raise', 'lower']:
                delta = settings['strengthMeters']*weight*(1 if settings['tool'] == 'raise' else -1)
                next_value = current if delta == 0 else current+delta
            else:
                blend = settings['intensity']*weight
                if settings['tool'] == 'flatten':
                    target = -0.0 if dab.get('targetNegativeZero') else settings['targetElevation']
                    next_value = current if blend == 0 else target if blend == 1 else (1-blend)*current+blend*target
                else:
                    # Connected physical cardinal edges, not a face chart boundary or imported topology.
                    neighbors = []
                    for j, q in enumerate(positions):
                        differences = [abs(a-b) for a,b in zip(q,positions[i]) if a != b]
                        if len(differences) == 1 and differences[0] == spacing:
                            neighbors.append(j)
                    assert len(neighbors) in [3,4]
                    reads += len(neighbors)
                    delta = 0.0
                    for j in neighbors:
                        delta += before[j]-current
                    estimate = delta/(2*len(neighbors))
                    change = blend*estimate
                    next_value = current if change == 0 else current+change
        actual = float_word(next_value)
        if word_float(actual) == 0 and current == 0 and next_value != 0:
            explicit = settings['tool'] == 'flatten' and geometry['inside'] and settings['intensity']*geometry['weight'] == 1
            if not explicit:
                actual = dab['beforeWords'][i]
        output.append(actual)
    assert output == dab['afterWords'], dab['label']
    assert dab['dryRunWords'] == dab['beforeWords'], dab['label']
    assert dab['revisionAfterPrepare'] == dab['revisionBefore']
    changes = sum(a != b for a,b in zip(dab['beforeWords'], output))
    assert dab['writes'] == changes
    assert dab['revisionAfter'] == dab['revisionBefore']+changes
    assert dab['statistics']['sourceReads'] == reads
    return {'label': dab['label'], 'samples': len(output), 'changedWords': changes, 'expectedSourceReads': reads, 'allFloat32WordsExact': True}

def check_large_word(case, cases):
    geometry, settings = cases[case['caseIndex']], case['settings']
    side, cells = number(case['sideLengthMeters']), case['cellsPerEdge']
    h, spacing = side/2, side/cells
    q = cart(case['position'], side)
    expected_neighbors = set()
    for axis in range(3):
        for sign in [-1,1]:
            other = list(q); other[axis] += sign*spacing
            if all(abs(v) <= h for v in other) and max(abs(v) for v in other) == h:
                expected_neighbors.add(tuple(other))
    supplied = [cart(s['position'],side) for s in case['neighbors']]
    assert len(set(supplied)) == len(supplied) and set(supplied) == expected_neighbors
    current, next_value = word_float(case['beforeWord']), word_float(case['beforeWord'])
    if geometry['inside']:
        weight = geometry['weight']
        if settings['tool'] in ['raise','lower']:
            delta = settings['strengthMeters']*weight*(1 if settings['tool'] == 'raise' else -1)
            next_value = current if delta == 0 else current+delta
        elif settings['tool'] == 'flatten':
            blend = settings['intensity']*weight
            next_value = current if blend == 0 else settings['targetElevation'] if blend == 1 else (1-blend)*current+blend*settings['targetElevation']
        else:
            delta = 0.0
            for sample in case['neighbors']:
                delta += word_float(sample['word'])-current
            change = settings['intensity']*weight*(delta/(2*len(supplied)))
            next_value = current if change == 0 else current+change
    expected = float_word(next_value)
    if word_float(expected) == 0 and current == 0 and next_value != 0:
        if not (settings['tool'] == 'flatten' and geometry['inside'] and settings['intensity']*geometry['weight'] == 1):
            expected = case['beforeWord']
    assert expected == case['afterWord'], case['label']
    return {'label':case['label'], 'n':cells, 'tool':settings['tool'], 'neighborCount':len(supplied), 'Float32WordExact':True}

if __name__ == '__main__':
    start = time.perf_counter()
    payload = json.load(sys.stdin)
    cases = [check_case(case) for case in payload['geometryCases']]
    dabs = [check_dab(dab,cases) for dab in payload['dabs']]
    large_words = [check_large_word(case,cases) for case in payload['largeWordCases']]
    print(json.dumps({'oracle': 'Accepted independent Python Fraction reflected-square/slab routes; literal Cartesian connected stencils; raw Float32 words',
        'python':sys.version, 'geometryCases':len(cases), 'distinctGeographicQueries':len(cache), 'dabs':len(dabs),
        'verifiedFloat32Words':sum(d['samples'] for d in dabs), 'selectedLargeWords':len(large_words), 'elapsedMs':(time.perf_counter()-start)*1000,
        'cases':cases, 'dabResults':dabs, 'largeWordResults':large_words},indent=2))
