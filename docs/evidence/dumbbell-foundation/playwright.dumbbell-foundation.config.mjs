import base from '../playwright.arc.config.mjs';
export default {...base,testDir:'../tests',testMatch:['arc-pilot.spec.ts','arc-pixels.spec.ts'],grep:/Arc N128 .*normal creator|Arc N128 default:/,use:{...base.use,baseURL:'http://127.0.0.1:5290'},reporter:[['list'],['json',{outputFile:'.local/dumbbell-foundation-browser.json'}]]};
