import base from './playwright.tetrahedron.config.mjs';
export default{...base,testMatch:['hollow-tetrahedron-workflow.spec.ts','hollow-tetrahedron-pixels.spec.ts','hollow-tetrahedron-navigation.spec.ts','hollow-tetrahedron-context.spec.ts'],reporter:[['list'],['json',{outputFile:process.env.HOLLOW_TETRAHEDRON_REPORT??'.local/hollow-tetrahedron-browser.json'}]]};
