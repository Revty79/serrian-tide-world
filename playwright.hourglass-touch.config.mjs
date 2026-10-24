import base from './playwright.hourglass.config.mjs';
import {devices} from '@playwright/test';
export default {...base,testMatch:['hourglass-touch.spec.ts'],projects:[{name:'pixel-7-emulation',use:{...devices['Pixel 7']}}],reporter:[['list'],['json',{outputFile:process.env.HOURGLASS_REPORT??'.local/hourglass-mobile-browser.json'}]]};
