"""Cube-C2A independent verification, not runtime code.
Fraction labelled-square oracle for route certificates; Decimal(1600) arc sampling.
Uses no TypeScript stroke arithmetic, tie scoring, frame tables or spacing code.
"""
import importlib.util
import json
import math
from decimal import Decimal, localcontext
from fractions import Fraction as F
from pathlib import Path
import sys
import time

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('cube_b', Path(__file__).with_name('cube-route-reference.py'))
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)

def dec(q):
    return Decimal(q.numerator)/Decimal(q.denominator)

def frac(q):
    return F(int(q['n']), int(q['d']))

def check(case):
    side = F.from_float(float(case['sideLengthMeters']))
    spacing = F.from_float(float(case['spacingMeters']))
    route_checks = [reference.verify(q) for q in case['routeQueries']]
    total = F(0)
    decimal_total = Decimal(0)
    ordinal = 1
    initial = case['dabs'][0]['center']
    assert reference.cart(initial['patchId'], F(initial['u']), F(initial['v']), side/2) == reference.cart(
        case['inputs'][0]['patchId'], F(case['inputs'][0]['u']), F(case['inputs'][0]['v']), side/2)
    bounds_checked = 0
    for query, event in zip(case['routeQueries'], case['paths']):
        result = query['result']
        selected = result['routes'][event['route']['index']]
        assert selected == event['route']
        assert event['ambiguity'] == len(result['routes'])
        square = reference.exact(result['distanceSquared'])
        nr, dr = math.isqrt(square.numerator), math.isqrt(square.denominator)
        length = F(nr, dr) if nr*nr == square.numerator and dr*dr == square.denominator else None
        decimal_length = dec(square).sqrt()
        after = total+length if total is not None and length is not None else None
        decimal_after = decimal_total+decimal_length
        while (ordinal*spacing <= after if after is not None else dec(ordinal*spacing) <= decimal_after):
            dab = case['dabs'][ordinal]
            assert dab['ordinal'] == ordinal
            assert dab['inputSequence'] == event['inputSequence']
            parameter = (ordinal*spacing-total)/length if total is not None and length is not None else None
            dp = dec(parameter) if parameter is not None else (dec(ordinal*spacing)-decimal_total)/decimal_length
            segment = next((s for s in selected['segments'] if (parameter <= frac(s['endParameter']) if parameter is not None else dp <= dec(frac(s['endParameter'])))), None)
            assert segment is not None
            ideal = []
            for axis, direction in [('u','du'), ('v','dv')]:
                start, delta = reference.exact(segment['from'][axis]), reference.exact(segment['direction'][direction])
                exact = start+delta*(parameter-frac(segment['startParameter'])) if parameter is not None else None
                value = dec(exact) if exact is not None else dec(start)+dec(delta)*(dp-dec(frac(segment['startParameter'])))
                proof = dab['coordinateBounds'][axis]
                lo, hi = frac(proof['lower']), frac(proof['upper'])
                if exact is not None:
                    assert lo <= exact <= hi
                else:
                    # 1600-digit independent evaluation, not an algebraic proof.
                    assert dec(lo)-Decimal('1e-1500') <= value <= dec(hi)+Decimal('1e-1500')
                ideal.append(float(value))
                bounds_checked += 1
            assert dab['idealFace'] == segment['face']
            actual = dab['center']
            world = reference.cart(actual['patchId'], float(actual['u']), float(actual['v']), float(side/2))
            expected = reference.cart(segment['face'], *ideal, float(side/2))
            assert world == expected, (case['label'], ordinal, world, expected)
            assert max(abs(v) for v in world) == float(side/2)
            ordinal += 1
        total, decimal_total = after, decimal_after
    assert len(case['dabs']) == ordinal, (case['label'], len(case['dabs']), ordinal)
    return {'label': case['label'], 'paths': len(route_checks), 'dabs': ordinal, 'coordinateBoundsChecked': bounds_checked,
            'certifiedSegments':sum(q['segmentsChecked'] for q in route_checks), 'certifiedCrossings':sum(q['crossingsChecked'] for q in route_checks),
            'float64CentersExactAgainstIndependentEvaluation': True}

if __name__ == '__main__':
    started = time.perf_counter()
    with localcontext() as context:
        context.prec = 1600
        results = [check(case) for case in json.load(sys.stdin)]
    print(json.dumps({'oracle':'Python Fraction reflected squares plus independent Decimal(1600) arc sampler; exact rational sampling when available',
                      'python':sys.version,'cases':len(results),'paths':sum(r['paths'] for r in results),'dabs':sum(r['dabs'] for r in results),
                      'coordinateBoundsChecked':sum(r['coordinateBoundsChecked'] for r in results),'elapsedMs':(time.perf_counter()-started)*1000,'results':results},indent=2))
