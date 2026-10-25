import base from './playwright.spiral.config.mjs';
export default {...base,testMatch:['ribbon-*.spec.ts'],use:{...base.use,baseURL:'http://127.0.0.1:5296'},reporter:[['list'],['json',{outputFile:process.env.RIBBON_REPORT??'.local/ribbon-browser.json'}]]};
