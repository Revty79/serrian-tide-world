import base from './playwright.flat-disc.config.mjs';
export default {...base,testMatch:['flat-ring-*.spec.ts'],use:{...base.use,baseURL:'http://127.0.0.1:5294'},reporter:[['list'],['json',{outputFile:process.env.RING_REPORT??'.local/flat-ring-browser.json'}]]};
