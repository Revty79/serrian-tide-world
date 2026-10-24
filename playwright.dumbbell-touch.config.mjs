import base from './playwright.dumbbell.config.mjs';
import {devices} from '@playwright/test';
export default {...base,testMatch:['dumbbell-touch.spec.ts'],projects:[{name:'pixel-7-emulation',use:{...devices['Pixel 7']}}],reporter:[['list'],['json',{outputFile:process.env.DUMBBELL_REPORT??'.local/dumbbell-mobile-browser.json'}]]};
