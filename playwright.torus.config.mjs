import base from './playwright.floating-islands.config.mjs';
export default{...base,testMatch:['torus-workflow.spec.ts','torus-pixels.spec.ts','torus-navigation.spec.ts','torus-recovery.spec.ts'],use:{...base.use,baseURL:'http://127.0.0.1:5276',actionTimeout:15000},webServer:undefined,reporter:[['list'],['json',{outputFile:process.env.TORUS_REPORT??'.local/torus-browser.json'}]]};
