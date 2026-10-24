import base from './playwright.torus.config.mjs';
export default{...base,testMatch:['polyhedron-regression-smoke.spec.ts','hollow-ocean-start.spec.ts','wrapping.spec.ts'],grep:/Prior |normal ocean start|real (raise|lower|smooth|flatten) pointer strokes/,reporter:[['list'],['json',{outputFile:'.local/torus-regression-browser.json'}]]};
