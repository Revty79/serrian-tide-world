import base from './playwright.torus.config.mjs';
export default{...base,testMatch:['ringworld-*.spec.ts'],use:{...base.use,baseURL:'http://127.0.0.1:5277'},reporter:[['list'],['json',{outputFile:process.env.RINGWORLD_REPORT??'.local/ringworld-browser.json'}]]};
