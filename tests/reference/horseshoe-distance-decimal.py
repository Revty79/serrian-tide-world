"""Independent 70-digit cone metric reference, with no production TS arithmetic.

Reconstruct exact binary64 chart inputs as Decimal affine combinations. Unfold
the three physical sectors at a prism boundary vertex. A cone's shortest route
is the smaller angular lift, or the actual apex when both lifts exceed pi.
The generated points stay strictly inside the local physical cone neighborhood.
Run after: node tests/reference/horseshoe-distance-corpus.mts
"""
from decimal import Decimal, getcontext
from pathlib import Path
import json
import math

getcontext().prec = 70
PI = Decimal('3.141592653589793238462643383279502884197169399375105820974944592307816406')
TWO = Decimal(2)

def exact(value):
    return Decimal.from_float(float(value))

def sincos(x):
    sine, cosine, st, ct = x, Decimal(1), x, Decimal(1)
    xx = x*x
    for k in range(1, 80):
        st = -st*xx/Decimal(2*k*(2*k+1))
        ct = -ct*xx/Decimal((2*k-1)*2*k)
        sine += st
        cosine += ct
    return sine, cosine

def angle(y, x):
    trial = Decimal(str(math.atan2(float(y), float(x))))
    for _ in range(6):
        s, c = sincos(trial)
        trial -= (y*c-x*s)/(-y*s-x*c)
    return trial if trial >= 0 else trial+2*PI

def sub(a, b):
    return [x-y for x, y in zip(a, b)]

def dot(a, b):
    return sum((x*y for x, y in zip(a, b)), Decimal(0))

def cross(a, b):
    return a[0]*b[1]-a[1]*b[0]

def position(sample):
    a, b, c = [[exact(x) for x in p] for p in sample['vertices']]
    u, v = exact(sample['u']), exact(sample['v'])
    return [x+u*(y-x)+v*(z-x) for x, y, z in zip(a, b, c)]

data = json.loads(Path('.local/horseshoe-reference/corpus.json').read_text())
methods, maximum_width, minimum_slack = {}, Decimal(0), Decimal('Infinity')
for item in data['cases']:
    origin, nxt, prev = [[exact(x) for x in p] for p in item['outline']]
    outgoing, back = sub(nxt, origin), sub(prev, origin)
    beta = angle(cross(outgoing, back), dot(outgoing, back))
    first, last = position(item['first']), position(item['last'])
    a = sub([first[0], first[2]], origin)
    b = sub([last[0], last[2]], origin)
    theta = angle(cross(outgoing, a), dot(outgoing, a))
    along = dot(outgoing, b)/dot(outgoing, outgoing).sqrt()
    down = exact(item['thickness'])/2-last[1]
    phi = beta+PI-angle(down, along)
    ra, rb = dot(a, a).sqrt(), (along*along+down*down).sqrt()
    delta = abs(phi-theta)
    delta = min(delta, beta+PI-delta)
    expected = ra+rb if delta >= PI else (ra*ra+rb*rb-2*ra*rb*sincos(delta)[1]).sqrt()
    certificate = item['certificate']
    lo, hi = exact(certificate['lowerBoundMeters']), exact(certificate['upperBoundMeters'])
    assert lo <= expected <= hi, (item['profile'], item['vertex'], item['fraction'], str(expected), certificate)
    maximum_width = max(maximum_width, hi-lo)
    minimum_slack = min(minimum_slack, expected-lo, hi-expected)
    methods[certificate['method']] = methods.get(certificate['method'], 0)+1
summary = {'cases': len(data['cases']), 'precisionDigits': 70, 'failures': 0,
           'maximumEnclosureWidthMeters': str(maximum_width),
           'minimumBoundarySlackMeters': str(minimum_slack), 'methods': methods}
Path('.local/horseshoe-reference/decimal-result.json').write_text(json.dumps(summary, indent=2)+'\n')
print(json.dumps(summary, indent=2))
