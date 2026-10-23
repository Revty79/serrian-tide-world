import base from './playwright.octahedron.config.mjs';
export default{...base,testMatch:['hollow-octahedron-workflow.spec.ts','hollow-octahedron-pixels.spec.ts','hollow-octahedron-navigation.spec.ts','hollow-octahedron-context.spec.ts'],reporter:[['list'],['json',{outputFile:process.env.HOLLOW_OCTAHEDRON_REPORT??'.local/hollow-octahedron-browser.json'}]]};
