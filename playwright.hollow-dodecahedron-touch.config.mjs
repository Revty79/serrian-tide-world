import base from './playwright.dodecahedron-touch.config.mjs';
export default{...base,testMatch:['hollow-dodecahedron-touch.spec.ts'],reporter:[['list'],['json',{outputFile:'.local/hollow-dodecahedron-touch.json'}]]};
