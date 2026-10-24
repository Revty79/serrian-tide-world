import base from './playwright.ringworld.config.mjs';
export default{...base,testMatch:['horseshoe-*.spec.ts'],use:{...base.use,baseURL:'http://127.0.0.1:5279'},reporter:[['list'],['json',{outputFile:process.env.HORSESHOE_REPORT??'.local/horseshoe-browser.json'}]]};
