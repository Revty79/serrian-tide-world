import base from './playwright.floating-islands.config.mjs';import {devices} from '@playwright/test';
export default{...base,testMatch:['floating-islands-touch.spec.ts'],projects:[{name:'mobile-emulation',use:{...devices['Pixel 7'],channel:'chrome'}}],reporter:[['list'],['json',{outputFile:'.local/islands-c-touch.json'}]]};
