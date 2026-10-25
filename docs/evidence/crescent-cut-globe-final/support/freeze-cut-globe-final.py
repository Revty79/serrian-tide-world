import hashlib, json, zipfile
from pathlib import Path

ROOT = Path.cwd()
DEST = Path('docs/evidence/crescent-cut-globe-final')
assert not (DEST/'receipt.json').exists(), 'A completed receipt is frozen once; do not replace it.'
Path('docs/CRESCENT-CUT-GLOBE-WORLDS.md').write_bytes(Path('.local/crescent-cut-final-report.md').read_bytes().replace(b'\r\n', b'\n'))

def normalized(p):
    data = p.read_bytes()
    return data if p.suffix.lower() in {'.png', '.zip'} else data.replace(b'\r\n', b'\n')

def digest(data):
    return hashlib.sha256(data).hexdigest()

def copy(src, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(normalized(src))

sources = sorted(set(p for folder in ['src', 'tests', 'dev', 'public'] for p in Path(folder).rglob('*') if p.is_file()) | set(Path('.').glob('playwright*.mjs')) | {
    Path(p) for p in ['AGENTS.md', 'docs/ATLAS-RENDERING-STANDARD.md', 'docs/ATLAS-SHAPES-FIRST-2026-10-23.md',
                     'docs/CRESCENT-CUT-GLOBE-WORLDS.md', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', '.gitattributes', 'index.html', 'playwright.config.ts', 'README.md', '.gitignore']})
source_hashes = {p.as_posix(): digest(normalized(p)) for p in sources}
runs = ['cut-globe-final-browser', 'cut-globe-final-source', 'cut-globe-final-performance', 'cut-globe-final-build', 'cut-globe-final-production']
for name in runs:
    m = json.loads(Path('.local', name+'-manifest.json').read_text())
    assert m['exitCode'] == 0 and m['inputsUnchanged']
    assert all(source_hashes[p] == h for p,h in m['sourceHashes'].items()), name+' source mismatch'
    for suffix in ['.log', '-manifest.json', '-report.json']:
        p = Path('.local', name+suffix)
        if p.exists(): copy(p, DEST/'runs'/p.name)
copy(Path('.local/cut-globe-final-source-files.txt'), DEST/'runs/source-files.txt')
for name in ['cut-globe-configuration-before-pixel-alignment', 'cut-globe-configuration-targeted', 'cut-globe-deep-pixels']:
    for suffix in ['.log', '-manifest.json', '-report.json']:
        p = Path('.local', name+suffix)
        if p.exists(): copy(p, DEST/'development-reports'/p.name)

measurements = []
for folder in ['cut-globe-configuration', 'cut-globe-configuration-pixels', 'cut-globe-pixels', 'cut-globe-touch']:
    measurements += list(Path('.local', folder).glob('*.json'))
measurements += [Path('.local/cut-globe-lifecycle/n256-'+backend+'.json') for backend in ['hardware','canvas']]
measurements += [Path('.local/cut-globe-workflow/n256-canvas.json')]
for p in measurements: copy(p, DEST/'measurements'/p.parent.name/p.name)

pixel_rows = [row for folder in ['cut-globe-configuration-pixels','cut-globe-pixels'] for p in Path('.local',folder).glob('*.json') for row in json.loads(p.read_text())]
configs = [json.loads(p.read_text()) for p in Path('.local/cut-globe-configuration').glob('*.json')]
summary = {
    'sourceTests': 219, 'sourceFiles': 29, 'finalBrowserCases': 41, 'finalPerformanceCases': 3,
    'configurationWorkflows': len(configs), 'matchedPixelPoses': len(pixel_rows),
    'pixelMaxima': {k:max(row[k] for row in pixel_rows) for k in ['stableMax','referenceMax','nativeMax','quarterAlphaMax','canvasQuarterAlphaMax','gpuOracleMax','gpuOracleAlphaMax','missing','outside']},
    'configurationWorstP95Ms': max(o['timing']['summary']['p95InputToPixels'] for o in configs),
    'configurationWorstFirstMs': max(o['timing']['latencies'][0]['inputToPixels'] for o in configs),
    'finalLifecycle': {},
    'provenance': 'Configuration, pixels, touch and responsive checks: final-browser. N256 hardware/Canvas lifecycle and N256 Canvas four-tool workflow: final-performance. Other default N128/N256 workflows and six shared browser regressions are in frozen B, not rerun or relabeled here.',
    'touchQualification': 'Trusted CDP touch/pen and coarse-pointer emulation in installed Chrome; no physical device.',
    'coastalReferenceQualification': 'Independent double physical-hit coverage; GPU-precision boundary color oracle uses accepted field/color functions. Direct double coastal RGB can differ by one quarter-ray class, also observed on accepted native Sphere.'
}
for backend in ['hardware','canvas']:
    o=json.loads(Path('.local/cut-globe-lifecycle/n256-'+backend+'.json').read_text())
    summary['finalLifecycle'][backend] = {
        'p95InputToPixelsMs': o['timing']['summary']['p95InputToPixels'],
        'firstPixelMs': o['timing']['latencies'][0]['inputToPixels'],
        'navigationMaxMs': max(o['navigation']),
        'numericalMismatches': o['comparison']['mismatches'],
        'largeBrushBackend': o['large']['state']['work']['backend']}
assert len(pixel_rows)==72 and len(configs)==20
(DEST/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')

pngs = [p for folder in ['cut-globe-configuration','cut-globe-configuration-pixels','cut-globe-pixels','cut-globe-touch'] for p in Path('.local',folder).glob('*.png')]
pngs += list(Path('.local/cut-globe-lifecycle').glob('n256-*.png'))
pngs += list(Path('.local/cut-globe-workflow').glob('n256-canvas*.png'))
representatives = [
    '.local/cut-globe-configuration-pixels/deep-n256-oblique-rim-gpu.png',
    '.local/cut-globe-configuration-pixels/deep-n256-oblique-rim-cpu.png',
    '.local/cut-globe-configuration-pixels/small-n128-overview-gpu.png',
    '.local/cut-globe-configuration-pixels/small-n128-overview-cpu.png',
    '.local/cut-globe-configuration-pixels/polar-n128-concave-cut-cpu.png',
    '.local/cut-globe-configuration-pixels/shallow-n256-connected-map-gpu.png',
    '.local/cut-globe-touch/hardware.png', '.local/cut-globe-touch/canvas.png',
    '.local/cut-globe-configuration/deep-n256-hardware.png',
    '.local/cut-globe-configuration/shallow-n256-canvas.png']
for name in representatives:
    p=Path(name);copy(p,DEST/'screenshots'/p.parent.name/p.name)

for name in ['run-cut-globe.py','verify-receipt.py','vite-cut-globe.config.mjs','freeze-cut-globe-final.py']:
    copy(Path('.local',name),DEST/'support'/name)
copy(Path('.local/pass15-brief.txt'),DEST/'support/pass15-brief.txt')
(DEST/'README.md').write_text('''# Crescent-Cut Globe final checkpoint C

See ../../CRESCENT-CUT-GLOBE-WORLDS.md for the engineering report and summary.json for final measurements.
The commit containing receipt.json is C. A and B are named in the receipt and retain their own frozen artifacts.

reproduction.zip contains the complete normalized source/config snapshot, every final measurement and pixel image, and commands/manifests/logs. Extract source/, install its locked dependencies, copy support/vite-cut-globe.config.mjs to source/.local/, then run Vite with --config .local/vite-cut-globe.config.mjs --host 127.0.0.1 --port 5298 from source/. Copy support/run-cut-globe.py into source/.local/ to preserve command logs. Run commands from runs/ manifests in source/; source-files.txt lists the 29 selected source tests. Browser config uses installed Chrome, workers=1, retries=0; run heavy commands serially. Adapt paths and availability to the reproduction machine. No owner tabs or saved maps are needed.

Source hashes normalize CRLF to LF to match repository Git blobs. PNG and ZIP artifacts are hashed as raw binary. The receipt excludes itself, avoiding a recursive hash. Verify a published checkpoint using support/verify-receipt.py SHA docs/evidence/crescent-cut-globe-final from its repository. Check earlier receipts against their own commit SHAs.

development-reports/ preserves original failed aggregates and the targeted intermediate resolution. Those runs used their recorded earlier source hashes; they are not final-source passing reports. Final browser 41/41 and performance 3/3 runs include their unchanged-input manifests.

Touch/pen evidence is browser emulation, not physical-device acceptance. Direct double coastal RGB and accepted GPU precision are distinguished in the report. Owner visual acceptance remains separate.
''',encoding='utf-8')

with zipfile.ZipFile(DEST/'reproduction.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in sources: z.writestr('source/'+p.as_posix(),normalized(p))
    for p in pngs: z.writestr('all-pixels/'+p.relative_to('.local').as_posix(),p.read_bytes())
    for p in sorted(DEST.rglob('*')):
        if p.is_file() and p.suffix!='.zip':z.writestr(p.relative_to(DEST).as_posix(),normalized(p))

receipt = {
    'checkpoint':'C', 'foundation':'764ca1659fa4ce5e690d9e0f7511ab1ba6c0f00f',
    'operational':'d0393ecd43bf2e4006558f5d1043477e8eee7590',
    'finalCommitIdentity':'The commit containing this receipt; exact SHA is provided in the delivery message.',
    'claims':'Pass 15 technical verification complete. Linked equal-curvature family; owner visual and physical-device acceptance separate. No next pass or deployment.',
    'summary':summary, 'sourceHashes':source_hashes,
    'artifacts':{p.as_posix():digest(normalized(p)) for p in sorted(DEST.rglob('*')) if p.is_file()}
}
(DEST/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'sources':len(sources),'artifacts':len(receipt['artifacts']),'zipBytes':(DEST/'reproduction.zip').stat().st_size,'summary':summary},indent=2))
