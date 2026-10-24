import base from './playwright.arc-regression.config.mjs';
export default {...base,testMatch:[...base.testMatch,'arc-pilot.spec.ts','arc-pixels.spec.ts'],grep:new RegExp(base.grep.source+'|Arc N128 .*normal creator|Arc N128 default'),use:{...base.use,baseURL:'http://127.0.0.1:5290'},reporter:[['list'],['json',{outputFile:process.env.DUMBBELL_REPORT??'.local/dumbbell-regression-browser.json'}]]};
