import base from './playwright.pyramid.config.mjs';
export default{...base,testMatch:['hollow-pyramid-workflow.spec.ts','hollow-pyramid-pixels.spec.ts','hollow-pyramid-navigation.spec.ts','hollow-pyramid-context.spec.ts'],reporter:[['list'],['json',{outputFile:'.local/hollow-pyramid-browser.json'}]]};
