import base from './playwright.hourglass.config.mjs';
export default{...base,testMatch:['spiral-*.spec.ts'],use:{...base.use,baseURL:'http://127.0.0.1:5292'},reporter:[['list'],['json',{outputFile:process.env.SPIRAL_REPORT??'.local/spiral-browser.json'}]]};
