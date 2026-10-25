import base from './playwright.flat-ring.config.mjs';
export default {...base,projects:base.projects.map(p=>({...p,name:'flat-ring-regression-chrome',use:{...p.use,actionTimeout:120000}})),
 testMatch:['flat-disc-pilot.spec.ts','ringworld-pilot.spec.ts','open-cylinder-workflow.spec.ts','hollow-cylinder-workflow.spec.ts','torus-input.spec.ts','atlas-render-parity.spec.ts','open-cylinder-render.spec.ts','ringworld-pixels.spec.ts'],
 grep:/Flat Disc N128|Ringworld pilot|Open N128 (auto|canvas): normal selector|capped hollow cylinder 128|N256 (torus|cylinder) (auto|canvas): same|shared rendering cylinder N128|Open rendering N128 (outside|inside|map|axial):|Ringworld N128 (oblique|inner):/,
 reporter:[['list'],['json',{outputFile:'.local/flat-ring-c-regression-report.json'}]]};
