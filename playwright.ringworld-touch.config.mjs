import{devices}from'@playwright/test';import base from'./playwright.ringworld.config.mjs';
export default{...base,testMatch:['ringworld-touch.spec.ts'],projects:[{name:'chrome-touch-emulation',use:{...devices['Pixel 7'],defaultBrowserType:'chromium',channel:'chrome'}}],reporter:[['list'],['json',{outputFile:'.local/ringworld-touch-browser.json'}]]};
