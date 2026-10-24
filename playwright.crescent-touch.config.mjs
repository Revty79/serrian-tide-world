import base from './playwright.crescent.config.mjs';
import {devices} from '@playwright/test';
export default {...base,testMatch:['crescent-touch.spec.ts'],projects:[{name:'pixel-7-emulation',use:{...devices['Pixel 7']}}],reporter:[['list'],['json',{outputFile:process.env.CRESCENT_REPORT??'.local/crescent-mobile-browser.json'}]]};
