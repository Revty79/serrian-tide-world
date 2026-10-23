import hashlib,json,re,shutil,subprocess
from pathlib import Path
root=Path('D:/serrian-tide-world');out=root/'docs/evidence/pyramid-connections'
sha=lambda b:hashlib.sha256(b).hexdigest()
def read(p):return json.loads((root/p).read_text(encoding='utf-8-sig'))
def write(p,d):
 q=out/p;q.parent.mkdir(parents=True,exist_ok=True);q.write_text(json.dumps(d,separators=(',',':'),ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
def log(p):
 b=(root/'.local'/p).read_bytes();return b.decode('utf-16' if b.startswith(b'\xff\xfe') else 'utf-8-sig')
source=read('.local/pyramid-connections-final-source.json')
for p,h in source['canonicalLF'].items():assert sha((root/p).read_bytes().replace(b'\r\n',b'\n'))==h,('Source drift',p)
reports={'connections':('.local/pyramid-connections-browser.json',18),'pyramid':('.local/pyramid-connections-final-pyramid.json',23),'touch':('.local/pyramid-connections-final-touch.json',4),'previous':('.local/pyramid-connections-final-previous.json',20),'polyhedra':('.local/pyramid-connections-final-polyhedra.json',28)}
validation={}
for name,(p,n) in reports.items():
 d=read(p);s=d['stats'];assert (n is None or s['expected']==n) and all(s[k]==0 for k in ['unexpected','flaky','skipped']) and not d['errors'],(name,s,d['errors'])
 validation[name]=s;write('reports/'+name+'.json',d)
s=log('pyramid-connections-final-units.log');counts={k:int(re.search(r'^[#\u2139]\s*'+k+r' (\d+)\s*$',s,re.M)[1]) for k in ['tests','pass','fail','cancelled','skipped']};assert counts['tests']==counts['pass'] and counts['fail']==counts['cancelled']==counts['skipped']==0
assert 'built in' in log('pyramid-connections-final-build.log')
workflows=[]
for hollow in [False,True]:
 for n in [128,256]:
  for backend in ['auto','canvas']:
   p=f'.local/pyramid-connections-browser/{"hollow" if hollow else "solid"}-n{n}-{backend}.json';d=read(p);assert not d['errors']
   for field in ['timings','physicalTimings']:assert d[field]['summary']['commits']>=5 and d[field]['summary']['p95InputToPixels']<300
   if backend=='canvas':
    stats=d['physicalDisplay']['renderer'];assert stats['geometryCacheBytes']<=2600000 and stats['geometryCacheSamples']<=100000 and stats['geometryCacheHits']>0
   assert d['terrainBefore']['exterior']!=d['painted']['exterior'] and d['terrainBefore'].get('interior')==d['painted'].get('interior')
   assert [t['tool'] for t in d['terrainTools']]==['Lower','Smooth','Flatten'] and all(t['before']['exterior']!=t['after']['exterior'] for t in d['terrainTools'])
   workflows.append({'hollow':hollow,'n':n,'backend':backend,'mapTimingMs':d['timings']['summary'],'physicalTimingMs':d['physicalTimings']['summary'],'guideTimings':d['guideTimings'],'terrainBefore':d['terrainBefore'],'terrainAfter':d['painted'],'rockPixel':d['rockPixel']})
pixels=[]
for p in sorted((root/'.local/pyramid-connection-pixels').glob('*.json')):
 d=read(p.relative_to(root));assert d['before']==d['after'] and 'AMD Radeon RX 6600' in d['graphics']['renderer'] and not d['graphics']['software']
 for c in d['cases']:assert c['unchanged']>100000 and c['unchangedViolations']==c['violations']==0 and c['stable']>30 and c['maxDifference']<=5
 pixels.append({k:d[k] for k in ['hollow','n','cases','graphics','before','after']})
for folder in ['pyramid-connections-browser','pyramid-connection-pixels','pyramid-connection-boundaries','pyramid-connection-storage','pyramid-browser','hollow-pyramid-browser','pyramid-pixels','hollow-pyramid-pixels','pyramid-navigation','pyramid-context','pyramid-touch','pyramid-connections-legacy']:
 src=root/'.local'/folder
 if not src.exists():continue
 for p in sorted(src.rglob('*')):
  if not p.is_file() or p.suffix not in ['.png','.json'] or 'failure' in p.name:continue
  if folder not in ['pyramid-connections-browser','pyramid-connection-pixels','pyramid-connection-boundaries','pyramid-connection-storage','pyramid-connections-legacy'] and p.stat().st_mtime<(root/'.local/pyramid-connections-final-source.json').stat().st_mtime:continue
  rel='/'.join('local-artifacts' if part=='.local' else part for part in p.relative_to(src).parts);q=out/'raw'/folder/rel;q.parent.mkdir(parents=True,exist_ok=True)
  if p.suffix=='.json':write('raw/'+folder+'/'+rel,read(p.relative_to(root)))
  else:shutil.copyfile(p,q)
logs=['pyramid-connections-final.log']+['pyramid-connections-final-'+x+'.log' for x in ['pyramid','touch','previous','polyhedra','units','build']]
for name in logs:
 q=out/'logs'/(name+'.txt');q.parent.mkdir(parents=True,exist_ok=True);q.write_text('\n'.join(line.rstrip() for line in log(name).splitlines()).strip()+'\n',encoding='utf-8',newline='\n')
for name in ['pyramid-connections-regressions.config.mjs','freeze-pyramid-connections.py','collect-pyramid-connections.py','check-pyramid-connections-stage.py']:
 q=out/'reproduce'/name;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes((root/'.local'/name).read_bytes().replace(b'\r\n',b'\n'))
receipt={'checkpoint':'Solid and Hollow Pyramid basic physical connections; technical review, not owner acceptance','baseCommit':source['baseCommit'],'sourceSha256':source['canonicalLF'],'sourceFingerprintPolicy':'SHA256 of each source text with CRLF canonicalized to LF; all current src/tests/configuration and referenced policies; evidence excluded to avoid a circular digest','validation':{'units':counts,'typecheckAndBuild':'passed; existing nonblocking bundle-size warning','finalBrowserCases':sum(s['expected'] for s in validation.values()),**validation},'ordinaryPaintingWithCuts':workflows,'physicalPixels':pixels,'supported':['Real through-bores with preview, placement, movement, resize and removal','Actual solid-body or hollow-shell material containment and sphere/capsule subtraction','Certified routes with junction positions, branches, chambers, multiple portals and relocation','Guided inspection through visible physical volume','Reciprocal local and unresolved external map links','Exact independent terrain/connection Undo/Redo and persisted connection journal','Explicit Save versions21/22 with strict legacy15/16 migration and atomic IDB replacement guards'],'limitations':['Exactly0m opening support; no displaced-terrain CSG','Fitted Inside editor and Surface map show entrance markers; Outside and cavity/passage Physical inspection show cuts','At least two portals per passage network; blind openings and enclosed networks remain later work','No full manual Tunnel Network Designer, arbitrary cross-sections/irregular rooms, sectional editing or free collision-aware flight','External link destination identity preserved; standalone host does not resolve other maps','Browser mobile/touch evidence is emulation; no physical-device or owner-session acceptance claim'],'bounds':{'cutPrimitives':48,'networks':8,'mapLinks':128,'connectionWordsBytes':262144,'journalBytes':4194304,'journalEntries':64,'physicalRayCacheSamples':100000,'physicalRayCacheTypedBytes':2600000},'architecture':'One accepted polyhedral terrain/field/presentation system with geometry-specific real material and CSG adapters. Existing accepted capsule query and ordinary render shader preserved. No fake solid interior bank or cylindrical dimensions. Prepared capsule queries match accepted intervals exactly. No AABB ray cull or primitive compaction shipped.','environment':{'preview':'127.0.0.1:5265','owner5173':'untouched','browser':'Installed Chrome on development PC','graphics':'AMD Radeon RX6600 ANGLE/D3D11; paired forced Canvas','priority':'Heavy suites serial BelowNormal','touch':'Pixel7 browser emulation, not physical device'},'reproduce':'Run the checked-in Playwright Pyramid connections config; place reproduced local regression config under .local (its root is one directory up), set PYRAMID_CONNECTION_GROUP to pyramid/touch/previous/polyhedra. Run previous group from an isolated .local/pyramid-connections-legacy cwd to preserve historical captures. Use full serial node unit command and npm run build. See logs and exact configuration artifacts.','next':'Tetrahedron then Octahedron basic connections; independently measured Icosahedron and bounded Dodecahedron; preserve authorized queues and stop after Queue3 owner review. Full universal manual excavation designer is later work.'}
unchanged=['src/terrain/connected-brush.ts','src/terrain/connected-stroke.ts','src/terrain/brush-math.ts','src/terrain/connected-smoothing.ts','src/terrain/indexed-float32.ts','src/editor/terrain-history.ts','src/editor/connected-history.ts','src/editor/pyramid-work.ts','src/surfaces/pyramid.ts','src/surfaces/polyhedron-path.ts','src/surfaces/polyhedron-distance-prepared.ts','src/surfaces/polyhedron-local-domain.ts','src/persistence/pyramid-format.ts','src/persistence/hollow-pyramid-format.ts','src/persistence/tetrahedron-format.ts','src/persistence/hollow-tetrahedron-format.ts','src/persistence/octahedron-format.ts','src/persistence/hollow-octahedron-format.ts']
for p in unchanged:assert sha(subprocess.check_output(['git','show',source['baseCommit']+':'+p],cwd=root))==source['canonicalLF'][p],('Accepted engine/legacy format changed',p)
receipt['unchangedAcceptedNumericalAuthorityHistoryAndLegacyFormats']=unchanged
prior=read('.local/pyramid-connections-before-gradient-fixture-source.json')['canonicalLF']
assert [p for p in source['canonicalLF'] if prior[p]!=source['canonicalLF'][p]]==['src/editor/polyhedron-connections.test.ts','tests/pyramid-connections.spec.ts']
receipt['verificationCorrections']={'cavityReturn':'The broad original workflow caught a missing Return to editing control. Restored the accepted return handler; focused original workflow and complete final broad regression prove exact pose restoration and Save/Open.','smoothFixture':'Two earlier N256 cases assumed one Smooth dab always changes numerical words. Corrected fixture crosses a real height boundary for Lower/Smooth/Flatten at unchanged default radius/strength and retains changed-word plus exact whole-gesture Undo/Redo gates. Only the fixture changed after that run; all final cases reran.','diagnosticReportsAreNotPassingValidation':True}
for name in ['pyramid-connections-before-gradient-fixture.json','pyramid-connections-return-control-fix.json']:
 write('diagnostics/'+name,read('.local/'+name))
for name in ['pyramid-connections-before-gradient-fixture.log','pyramid-connections-return-control-regression.log','pyramid-connections-return-control-fix.log']:
 q=out/'diagnostics'/(name+'.txt');q.parent.mkdir(parents=True,exist_ok=True);q.write_text('\n'.join(line.rstrip() for line in log(name).splitlines()).strip()+'\n',encoding='utf-8',newline='\n')
cleanup=read('.local/pyramid-connections-post-validation-cleanup.json');beforeCleanup=read('.local/pyramid-connections-before-eof-cleanup-source.json')['canonicalLF'];path=cleanup['path']
assert [p for p in source['canonicalLF'] if beforeCleanup[p]!=source['canonicalLF'][p]]==[path]
assert sha(cleanup['beforeText'].encode())==beforeCleanup[path]==cleanup['beforeSha256']
assert cleanup['beforeText'].rstrip('\n')+'\n'==(root/path).read_text(encoding='utf-8')
assert source['canonicalLF'][path]==cleanup['afterSha256']
focusedLog=log('pyramid-connections-post-validation-cleanup.log');assert re.search(r'^[#\u2139]\s*pass 5\s*$',focusedLog,re.M) and re.search(r'^[#\u2139]\s*fail 0\s*$',focusedLog,re.M)
write('reproduce/post-validation-cleanup.json',cleanup)
q=out/'logs/post-validation-cleanup.log.txt';q.write_text('\n'.join(line.rstrip() for line in focusedLog.splitlines()).strip()+'\n',encoding='utf-8',newline='\n')
receipt['validation']['postValidationCleanup']={'path':path,'reason':cleanup['reason'],'exactFullValidationSourceOverride':{path:cleanup['beforeSha256']},'onlyTrailingNewlineChanged':True,'focusedUnitsRerunPassed':5,'originalSourceReconstruction':'reproduce/post-validation-cleanup.json beforeText; all other full-validation source inputs match the final sourceSha256. Production code and browser fixtures unchanged.'}
receipt['artifactSha256']={p.relative_to(out).as_posix():sha(p.read_bytes()) for p in sorted(out.rglob('*')) if p.is_file() and p!=out/'receipt.json'}
write('receipt.json',receipt);print(json.dumps({'units':counts['pass'],'browserCases':receipt['validation']['finalBrowserCases'],'sourceInputs':len(source['canonicalLF']),'artifacts':len(receipt['artifactSha256'])}))
