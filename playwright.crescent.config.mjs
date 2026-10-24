import base from './playwright.ringworld.config.mjs';
export default{...base,testMatch:['crescent-*.spec.ts'],use:{...base.use,baseURL:'http://127.0.0.1:5278'},reporter:[['list'],['json',{outputFile:process.env.CRESCENT_REPORT??'.local/crescent-browser.json'}]]};
