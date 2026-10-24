import base from './playwright.arc.config.mjs';
export default {...base,testMatch:['dumbbell-*.spec.ts'],use:{...base.use,baseURL:'http://127.0.0.1:5290'},reporter:[['list'],['json',{outputFile:process.env.DUMBBELL_REPORT??'.local/dumbbell-browser.json'}]]};
