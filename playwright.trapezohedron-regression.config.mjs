import base from './playwright.trapezohedron.config.mjs';
export default{...base,testMatch:['pyramid-workflow.spec.ts','tetrahedron-workflow.spec.ts','octahedron-workflow.spec.ts'],grep:/N128 (auto|canvas): sharp/,reporter:[['list'],['json',{outputFile:'.local/trapezohedron-regression.json'}]]};
