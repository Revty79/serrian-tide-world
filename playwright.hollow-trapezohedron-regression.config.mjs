import base from './playwright.trapezohedron-regression.config.mjs';
export default{...base,reporter:[['list'],['json',{outputFile:'.local/hollow-trapezohedron-regression.json'}]]};
