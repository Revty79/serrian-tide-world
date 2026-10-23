import base from './playwright.trapezohedron-touch.config.mjs';
export default{...base,testMatch:['hollow-trapezohedron-touch.spec.ts'],reporter:[['list'],['json',{outputFile:'.local/hollow-trapezohedron-touch.json'}]]};
