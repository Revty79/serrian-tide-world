import base from './playwright.arc.config.mjs';
import {devices} from '@playwright/test';
export default {...base,testMatch:['arc-touch.spec.ts'],projects:[{name:'pixel-7-emulation',use:{...devices['Pixel 7']}}],reporter:[['list'],['json',{outputFile:process.env.ARC_REPORT??'.local/arc-mobile-browser.json'}]]};
