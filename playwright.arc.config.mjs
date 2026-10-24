import base from './playwright.ringworld.config.mjs';
export default{...base,testMatch:['arc-*.spec.ts'],use:{...base.use,baseURL:'http://127.0.0.1:5280'},reporter:[['list'],['json',{outputFile:process.env.ARC_REPORT??'.local/arc-browser.json'}]]};
