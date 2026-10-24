import base from './playwright.fragmented.config.mjs';import {devices} from '@playwright/test';
export default{...base,testMatch:['fragmented-touch.spec.ts'],projects:[{name:'mobile-emulation',use:{...devices['Pixel 7'],channel:'chrome'}}],reporter:[['list'],['json',{outputFile:'.local/fragmented-touch.json'}]]};
