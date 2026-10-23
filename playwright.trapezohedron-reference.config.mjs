import base from './playwright.trapezohedron.config.mjs';
export default{...base,testMatch:['octahedron-performance.spec.ts'],grep:/solid/,reporter:[['list'],['json',{outputFile:'.local/trapezohedron-octahedron-reference.json'}]]};
