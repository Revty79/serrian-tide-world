import base from './playwright.hollow-worlds.config.mjs';
export default {...base,testMatch:['hollow-ocean-start.spec.ts'],reporter:[['list'],['json',{outputFile:process.env.HOLLOW_OCEAN_REPORT??'.local/hollow-ocean-browser.json'}]]};
