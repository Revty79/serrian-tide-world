import base from './playwright.crescent.config.mjs';
export default {...base,
 testMatch:['polyhedron-regression-smoke.spec.ts','dodecahedron-pixels.spec.ts','hollow-dodecahedron-pixels.spec.ts','ringworld-pilot.spec.ts','torus-input.spec.ts'],
 grep:/Prior (pyramid|dodecahedron) N128|Dodecahedron N128 incremental|(?<!Hollow )Dodecahedron outside N128|Hollow Dodecahedron inside N128|Ringworld pilot|N256 torus/,
 reporter:[['list'],['json',{outputFile:process.env.CRESCENT_REPORT??'.local/crescent-regression-browser.json'}]]};
