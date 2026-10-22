import base from './playwright.hollow-worlds.config.mjs';
export default {...base,testMatch:['open-cylinder-render.spec.ts'],projects:[{name:'desktop',use:{viewport:{width:1440,height:1080},deviceScaleFactor:1.5}}],reporter:[['list'],['json',{outputFile:process.env.OPEN_RENDER_REPORT??'.local/open-render-browser.json'}]]};
