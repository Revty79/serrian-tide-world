import base from './playwright.open-cylinder.config.mjs';
export default {...base,testMatch:['open-cylinder-long.spec.ts'],projects:[{name:'desktop',use:{viewport:{width:1440,height:950}}}],reporter:[['list'],['json',{outputFile:process.env.OPEN_LONG_REPORT??'.local/open-cylinder-long-browser.json'}]]};
