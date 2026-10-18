"""Independent Decimal stationary-point/edge reference, not the production bound algorithm.
Run with Python 3 (standard library only). Writes frozen fixtures and a reference receipt.
Multistart Newton and dense sign-bracketing are reference observations, not the completeness
proof: production continuous lower/upper bounds independently enclose the global minimum.
"""
from decimal import Decimal as D, getcontext
from pathlib import Path
import json, math, time

getcontext().prec = 65
PI = D('3.1415926535897932384626433832795028841971693993751058209749445923078164')
EPS = D('1e-48')

def sin(x):
    term = total = x
    for n in range(1, 100):
        term *= -x*x / D((2*n)*(2*n+1)); total += term
        if abs(term) < D('1e-70'): break
    return total

def cos(x): return sin(PI/2-x)
def disk(q,x):
    if q == 1: return 2*sin(x/2)
    return ((1-q)**2+4*q*sin(x/2)**2).sqrt()
def dp(q,x):
    if q == 1: return cos(x/2)
    if q == 0: return D(0)
    return q*sin(x)/disk(q,x)
def ddp(q,x):
    if q == 1: return -sin(x/2)/2
    if q == 0: return D(0)
    d = disk(q,x)
    return q*cos(x)/d-q*q*sin(x)**2/d**3
def side(h,t): return (h*h+t*t).sqrt()
def evaluate(h,q0,q1,delta,x,y): return disk(q0,x)+disk(q1,y)+side(h,delta-x-y)

def roots(fn, lo, hi):
    """Locate stationary roots independently with 1024 bins, then 170 Decimal bisections."""
    if hi == lo: return []
    found=[]; x=lo; fx=fn(x)
    for j in range(1,1025):
        y=lo+(hi-lo)*D(j)/1024; fy=fn(y)
        if fx == 0: found.append(x)
        if fx*fy < 0:
            a,b,fa=x,y,fx
            for _ in range(170):
                m=(a+b)/2; fm=fn(m)
                if fa*fm <= 0: b=m
                else: a=m; fa=fm
            found.append((a+b)/2)
        x,fx=y,fy
    return found

def optimize(h,q0,q1,delta,two):
    if delta == 0: return evaluate(h,q0,q1,delta,D(0),D(0)),(D(0),D(0)),0
    candidates=[(D(0),D(0)),(delta,D(0))]
    def derivative_x(x):
        t=delta-x; v=side(h,t)
        return dp(q0,x)-(t/v if v else D(1))
    candidates += [(x,D(0)) for x in roots(derivative_x,D(0),delta)]
    if two:
        candidates.append((D(0),delta))
        def derivative_y(y):
            t=delta-y; return dp(q1,y)-t/side(h,t)
        candidates += [(D(0),y) for y in roots(derivative_y,D(0),delta)]
        candidates += [(x,delta-x) for x in roots(lambda x: dp(q0,x)-dp(q1,delta-x),D(0),delta)]
        # Interior roots from independent high-precision Newton systems, no branch bounds.
        seeds=[(delta*D(i)/8,delta*D(j)/8) for i in range(1,8) for j in range(1,8-i)]
        # Independent Clairaut/straight-chord impact-parameter branches locate thin
        # interior basins that uniform angle seeds can miss. Refine with Decimal Newton.
        qf0,qf1,hf,df=map(float,[q0,q1,h,delta]); limit=min(qf0,qf1,1-1e-14)
        if limit>0:
            for sign0 in [-1,1]:
                for sign1 in [-1,1]:
                    def angles(b): return (math.acos(b)+sign0*math.acos(min(1,b/qf0)),math.acos(b)+sign1*math.acos(min(1,b/qf1)))
                    def residual(b):
                        x,y=angles(b); return x+y+hf*b/math.sqrt(1-b*b)-df
                    last=0.; flast=residual(last)
                    for k in range(1,2049):
                        current=limit*k/2048; fcurrent=residual(current)
                        if flast*fcurrent<0:
                            lo,hi=last,current
                            for _ in range(60):
                                mid=(lo+hi)/2
                                if residual(lo)*residual(mid)<=0: hi=mid
                                else: lo=mid
                            x,y=angles((lo+hi)/2)
                            if x>0 and y>0 and x+y<float(delta): seeds.append((D(str(x)),D(str(y))))
                        last,flast=current,fcurrent
        for x,y in seeds:
                for _ in range(70):
                    t=delta-x-y; v=side(h,t); c=h*h/v**3
                    gx=dp(q0,x)-t/v; gy=dp(q1,y)-t/v
                    if max(abs(gx),abs(gy)) < EPS:
                        if x>0 and y>0 and x+y<delta: candidates.append((x,y))
                        break
                    aa=ddp(q0,x)+c; bb=ddp(q1,y)+c; det=aa*bb-c*c
                    if abs(det)<D('1e-60'): break
                    dx=(gx*bb-gy*c)/det; dy=(gy*aa-gx*c)/det
                    step=D(1)
                    while step>D('1e-16') and not (0<x-step*dx<delta and 0<y-step*dy<delta and x+y-step*(dx+dy)<delta): step/=2
                    if step<=D('1e-16'): break
                    x-=step*dx; y-=step*dy
    values=[(evaluate(h,q0,q1,delta,x,y),x,y) for x,y in candidates]
    best=min(values)
    return best[0],(best[1],best[2]),len(candidates)

cases=[
    ('side-shortcut','side', '.02', 'side', '.03', 'pi','2'),
    ('side-start-interior-minimum','side','.2','side','.4','2.6','3'),
    ('side-end-interior-minimum','side','2.7','side','2.8','2.8','3'),
    ('side-direct','side','.8','side','1.4','1.2','2'),
    ('side-cap-interior','side','.7','start','.8','2.2','2'),
    ('side-cap-near-rim','side','.04','start','.999','3.05','2'),
    ('side-cap-near-center','side','.7','start','.02','2.9','2'),
    ('opposite-interior','start','.7','end','.8','2.4','2'),
    ('opposite-squat','start','.93','end','.88','3.05','.15'),
    ('opposite-long','start','.4','end','.9','2.7','100'),
    ('opposite-near-rims','start','.99999','end','.9999','3.13','.02'),
    ('opposite-symmetric-tie','start','1','end','1','pi','.5'),
]
start=time.perf_counter(); records=[]
for name,region0,v0,region1,v1,angle,length in cases:
    delta=PI if angle=='pi' else D(angle); h0=D(v0); h1=D(v1); lengthD=D(length)
    choices=[]
    if region0=='side' and region1=='side':
        choices.append((side(abs(h0-h1),delta),'side',(D(0),D(0)),1))
        for h,kind in [(h0+h1,'via-start-cap'),(2*lengthD-h0-h1,'via-end-cap')]:
            value,xy,count=optimize(h,D(1),D(1),delta,False); choices.append((value,kind,xy,count))
    elif region0=='side':
        value,xy,count=optimize(h0,h1,D(1),delta,False); choices.append((value,'side-to-cap',xy,count))
    else:
        value,xy,count=optimize(lengthD,h0,h1,delta,True); choices.append((value,'opposite-caps',xy,count))
    value,kind,xy,count=min(choices)
    records.append({'name':name,'radius':'1','length':length,'region0':region0,'coordinate0':v0,'region1':region1,'coordinate1':v1,'angle':str(delta),'distance':str(value),'route':kind,'angles':[str(v) for v in xy],'stationaryAndBoundaryCandidates':count})
    print(name,str(value),flush=True)
receipt={'method':'65-digit Decimal Taylor trigonometry, 1024-bin edge derivative bracketing + 170 bisections, four impact-parameter branches (2048 bins) + constrained multistart Newton; independent of production affine branch-and-bound','precisionDigits':65,'referenceRoundingAllowanceNormalized':'1e-45','limitation':'Dense root bracketing/multistart alone is not a proof of global completeness; compare with independently justified production enclosures. Newton candidates must have residual <1e-48.','records':records}
root=Path(__file__).resolve().parent.parent
(root/'src/surfaces/fixtures').mkdir(exist_ok=True)
payload=json.dumps(receipt,indent=2)+'\n'
(root/'src/surfaces/fixtures/cylinder-distance-reference.json').write_text(payload,encoding='utf8')
(root/'docs/evidence/a7-b1-high-precision-reference.json').write_text(payload,encoding='utf8')
print('seconds',time.perf_counter()-start)
