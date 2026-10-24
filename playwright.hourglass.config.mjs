import base from './playwright.arc.config.mjs';
export default {...base,testMatch:['hourglass-*.spec.ts'],use:{...base.use,baseURL:'http://127.0.0.1:5290'},reporter:[['list'],['json',{outputFile:process.env.HOURGLASS_REPORT??'.local/hourglass-browser.json'}]]};
