import base from './playwright.hollow-dodecahedron.config.mjs';
export default{...base,testMatch:['polyhedron-regression-smoke.spec.ts','hollow-trapezohedron-performance.spec.ts'],grep:/Prior |stage profile N256 canvas hollow/,reporter:[['list'],['json',{outputFile:'.local/hollow-dodecahedron-regression.json'}]]};
