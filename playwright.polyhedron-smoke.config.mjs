import base from './playwright.icosahedron.config.mjs';
export default{...base,testMatch:['polyhedron-regression-smoke.spec.ts'],reporter:[['list'],['json',{outputFile:process.env.POLYHEDRON_SMOKE_REPORT??'.local/hollow-icosa-regression.json'}]]};
