import base from './playwright.icosahedron-touch.config.mjs';
export default{...base,testMatch:['hollow-icosahedron-touch.spec.ts'],reporter:[['list'],['json',{outputFile:'.local/hollow-icosahedron-touch.json'}]]};
