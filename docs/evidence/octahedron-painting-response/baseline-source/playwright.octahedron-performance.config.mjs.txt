import base from './playwright.octahedron.config.mjs';
export default{...base,testMatch:['octahedron-performance.spec.ts'],reporter:[['list'],['json',{outputFile:process.env.OCTA_PERF_REPORT??'.local/octa-performance.json'}]]};
