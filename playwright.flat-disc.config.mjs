import base from './playwright.spiral.config.mjs';
export default {...base,testMatch:['flat-disc-*.spec.ts','torus-input.spec.ts'],
  use:{...base.use,baseURL:'http://127.0.0.1:5293'},
  reporter:[['list'],['json',{outputFile:process.env.DISC_REPORT??'.local/flat-disc-browser.json'}]]};
