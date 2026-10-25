import base from './playwright.spiral.config.mjs';
import {devices} from '@playwright/test';
export default {...base,testMatch:['spiral-touch.spec.ts'],projects:[{name:'pixel-7-emulation',use:{...devices['Pixel 7']}}],reporter:[['list'],['json',{outputFile:process.env.SPIRAL_REPORT??'.local/spiral-mobile-browser.json'}]]};
