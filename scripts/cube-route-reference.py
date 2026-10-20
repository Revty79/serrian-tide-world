"""Independent Cube-B oracle: Fraction, labelled corners, reflection and box slabs.

No TypeScript implementation, tangent matrix or runtime edge table is imported.
Input/output JSON on stdin/stdout; Python standard library only, verification only.
"""
from fractions import Fraction as F
from itertools import product
import json
import math
import sys
import time

FACES = {
    'px': ((1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1)),
    'nx': ((0, 1, 0), (0, 0, 0), (0, 0, 1), (0, 1, 1)),
    'py': ((1, 1, 0), (0, 1, 0), (0, 1, 1), (1, 1, 1)),
    'ny': ((0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)),
    'pz': ((0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)),
    'nz': ((0, 1, 0), (1, 1, 0), (1, 0, 0), (0, 0, 0)),
}
ADJ = {a: [b for b in FACES if len(set(FACES[a]) & set(FACES[b])) == 2] for a in FACES}
def fraction(x):
    return F.from_float(x) if isinstance(x, float) else F(x)
def pow2(e):
    return F(1 << e) if e >= 0 else F(1, 1 << -e)
def exact(r):
    return F(int(r['n']), int(r['d'])) * pow2(r['exponent'])
def world(p):
    return tuple(F(int(n), int(p['denominator'])) * pow2(p['exponent']) for n in p['numerator'])
def cart(face, u, v, h):
    return {'px': (h, u, v), 'nx': (-h, -u, v), 'py': (-u, h, v),
            'ny': (u, -h, v), 'pz': (u, v, h), 'nz': (u, -v, -h)}[face]
def local(face, q):
    x, y, z = q
    return {'px': (y, z), 'nx': (-y, z), 'py': (-x, z), 'ny': (x, z), 'pz': (x, y), 'nz': (x, -y)}[face]
def aliases(q, h):
    x, y, z = q
    return [f for f, fixed in [('px', x), ('nx', -x), ('py', y), ('ny', -y), ('pz', z), ('nz', -z)] if fixed == h]
def sequences(a, b, path=None):
    path = [a] if path is None else path
    if a == b:
        yield path
    else:
        for n in ADJ[a]:
            if n not in path:
                yield from sequences(n, b, path + [n])
def unfold(path, side):
    images = [{v: p for v, p in zip(FACES[path[0]], [(F(0), F(0)), (side, F(0)), (side, side), (F(0), side)])}]
    for before, after in zip(path, path[1:]):
        previous = images[-1]
        shared = list(set(FACES[before]) & set(FACES[after]))
        midpoint = tuple((previous[shared[0]][i] + previous[shared[1]][i]) / 2 for i in range(2))
        center = tuple(sum(p[i] for p in previous.values()) / 4 for i in range(2))
        outward = tuple(2 * (midpoint[i] - center[i]) for i in range(2))
        image = {v: previous[v] for v in shared}
        for vertex in set(FACES[after]) - set(shared):
            near = next(v for v in shared if sum(abs(a-b) for a,b in zip(v, vertex)) == 1)
            image[vertex] = tuple(previous[near][i] + outward[i] for i in range(2))
        images.append(image)
    return images
def image_point(face, image, q, side):
    u, v = local(face, q)
    a, b, _, d = [image[k] for k in FACES[face]]
    return tuple(a[i] + (u / side + F(1, 2)) * (b[i] - a[i]) + (v / side + F(1, 2)) * (d[i] - a[i]) for i in range(2))
def world_point(face, image, p, h, side):
    a, b, _, d = [image[k] for k in FACES[face]]
    # Orthonormal square axes of length side; inverse via dot products.
    u = sum((p[i]-a[i]) * (b[i]-a[i]) for i in range(2)) / side - h
    v = sum((p[i]-a[i]) * (d[i]-a[i]) for i in range(2)) / side - h
    return cart(face, u, v, h)
def slab_interval(image, p, delta):
    lo, hi = F(0), F(1)
    for i in range(2):
        minimum, maximum = min(q[i] for q in image.values()), max(q[i] for q in image.values())
        if delta[i] == 0:
            if not minimum <= p[i] <= maximum:
                return None
        else:
            a, b = sorted(((minimum-p[i])/delta[i], (maximum-p[i])/delta[i]))
            lo, hi = max(lo, a), min(hi, b)
    return (lo, hi) if lo <= hi else None
def oracle(first, second, side):
    h = side/2
    if first == second:
        return F(0), 1, 0, 0
    best, directions, examined, feasible = None, set(), 0, 0
    for a, b in product(aliases(first, h), aliases(second, h)):
        for path in sequences(a, b):
            examined += 1
            images = unfold(path, side)
            p, q = image_point(a, images[0], first, side), image_point(b, images[-1], second, side)
            delta = tuple(q[i]-p[i] for i in range(2))
            intervals = [slab_interval(image, p, delta) for image in images]
            if any(t is None for t in intervals):
                continue
            times, valid = [F(0)], True
            for x, y in zip(intervals, intervals[1:]):
                t, end = max(times[-1], x[0], y[0]), min(x[1], y[1])
                if t > end:
                    valid = False
                    break
                times.append(t)
            if not valid:
                continue
            times.append(F(1)); feasible += 1
            square = sum(d*d for d in delta)
            if best is not None and square > best:
                continue
            if best is None or square < best:
                best, directions = square, set()
            # Deduplicate by physical initial direction, independently of TS polyline hashing.
            for i, (start, end) in enumerate(zip(times, times[1:])):
                if start != end:
                    point = world_point(path[i], images[i], tuple(p[j]+end*delta[j] for j in range(2)), h, side)
                    tangent = tuple(point[j]-first[j] for j in range(3))
                    factor = abs(next(v for v in tangent if v))
                    directions.add(tuple(v/factor for v in tangent))
                    break
    assert best is not None
    return best, len(directions), examined, feasible
def bounds(interval, square):
    lower, upper = float(interval['lower']), float(interval['upper'])
    assert math.isfinite(lower) and math.isfinite(upper) and 0 <= lower <= upper
    assert F.from_float(lower)**2 <= square <= F.from_float(upper)**2
    if lower == upper:
        assert F.from_float(lower)**2 == square
    else:
        assert math.nextafter(lower, math.inf) == upper
def verify(case):
    side = fraction(case['sideLengthMeters']); h = side/2
    points = [cart(p['patchId'], fraction(p['u']), fraction(p['v']), h) for p in (case['first'], case['second'])]
    best, count, examined, feasible = oracle(*points, side)
    result = case['result']; assert exact(result['distanceSquared']) == best, case['label']
    assert len(result['routes']) == count, (case['label'], count, len(result['routes']))
    assert result['unique'] == (count == 1)
    assert result['certificate']['candidateSequences'] == examined
    bounds(result['distanceMeters'], best)
    segments_checked, crossings_checked = 0, 0
    for route in result['routes']:
        assert route['faces'] == [s['face'] for s in route['segments']] or not route['segments']
        assert len(set(route['faces'])) == len(route['faces']) <= 6
        vertices = [world(v) for v in route['vertices']]
        assert vertices[0] == points[0] and vertices[-1] == points[1]
        previous, direction_keys = F(0), []
        for i, segment in enumerate(route['segments']):
            face = segment['face']; p, q = world(segment['fromWorld']), world(segment['toWorld'])
            assert p == vertices[i] and q == vertices[i+1]
            assert segment['from']['patchId'] == face and segment['to']['patchId'] == face
            for field, actual in [('from', p), ('to', q)]:
                uv = tuple(exact(segment[field][k]) for k in ('u', 'v'))
                assert all(-h <= v <= h for v in uv)
                assert cart(face, *uv, h) == actual
            start, end = [F(int(segment[k]['n']), int(segment[k]['d'])) for k in ('startParameter', 'endParameter')]
            assert start == previous and start < end <= 1
            previous = end
            segment_squared = sum((q[j]-p[j])**2 for j in range(3))
            assert segment_squared == best * (end-start)**2
            bounds(segment['lengthMeters'], segment_squared)
            du, dv = (exact(segment['direction'][k]) for k in ('du', 'dv'))
            assert du*du + dv*dv == best
            puv, quv = local(face, p), local(face, q)
            assert (quv[0]-puv[0], quv[1]-puv[1]) == (du*(end-start), dv*(end-start))
            direction_keys.append((du, dv)); segments_checked += 1
        if route['segments']:
            assert previous == 1
        for i, crossing in enumerate(route['crossings']):
            p = world(crossing['point']); assert p == vertices[i+1]
            assert not all(abs(v) == h for v in p)  # corner may be endpoint, never internal
            before, after = route['faces'][i:i+2]; assert after in ADJ[before]
            for chart_name, face, edge in [('from', before, crossing['fromEdge']), ('to', after, crossing['toEdge'])]:
                uv = [exact(crossing[chart_name][k]) for k in ('u', 'v')]
                assert cart(face, *uv, h) == p
                assert uv[0 if edge.startswith('u') else 1] == (-h if edge.endswith('min') else h)
            du, dv = direction_keys[i]; eu, ev = direction_keys[i+1]; t = crossing['transport']
            assert (t['uu']*du+t['uv']*dv, t['vu']*du+t['vv']*dv) == (eu, ev)
            crossings_checked += 1
    return {'label': case['label'], 'shortestSquaredNumerator': str(best.numerator), 'shortestSquaredDenominator': str(best.denominator),
            'physicalShortestPaths': count, 'referenceSequences': examined, 'referenceFeasibleIncludingNonminimalCornerPaths': feasible,
            'segmentsChecked': segments_checked, 'crossingsChecked': crossings_checked}

if __name__ == '__main__':
    start = time.perf_counter()
    cases = json.load(sys.stdin)
    results = [verify(case) for case in cases]
    print(json.dumps({'oracle': 'Python Fraction labelled-corner reflection + whole-square slab clipping; no TS import',
                      'python': sys.version, 'cases': len(results), 'elapsedMs': (time.perf_counter()-start)*1000,
                      'results': results}, indent=2))
