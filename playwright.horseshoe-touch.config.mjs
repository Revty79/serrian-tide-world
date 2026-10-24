import base from './playwright.horseshoe.config.mjs';
import {devices} from '@playwright/test';
export default {...base,testMatch:['horseshoe-touch.spec.ts'],projects:[{name:'pixel-7-emulation',use:{...devices['Pixel 7']}}],reporter:[['list'],['json',{outputFile:process.env.HORSESHOE_REPORT??'.local/horseshoe-mobile-browser.json'}]]};
