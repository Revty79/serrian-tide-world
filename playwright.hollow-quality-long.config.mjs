import base from './playwright.hollow-worlds-long.config.mjs';
export default {...base,testMatch:['hollow-sphere-long.spec.ts','hollow-cylinder-long.spec.ts','hollow-cube-long.spec.ts'],grepInvert:/I5 fast sweep/,reporter:[['list'],['json',{outputFile:process.env.HOLLOW_QUALITY_LONG_REPORT??'.local/hollow-quality-long-browser.json'}]]};
