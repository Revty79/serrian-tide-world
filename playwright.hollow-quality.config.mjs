import base from './playwright.hollow-worlds.config.mjs';
export default {...base,testMatch:['hollow-render-quality.spec.ts'],reporter:[['list'],['json',{outputFile:process.env.HOLLOW_QUALITY_REPORT??'.local/hollow-quality-browser.json'}]]};
