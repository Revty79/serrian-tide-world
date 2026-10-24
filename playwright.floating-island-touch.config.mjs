import base from './playwright.floating-island.config.mjs';import {devices} from '@playwright/test';
export default{...base,testMatch:['floating-island-touch.spec.ts'],projects:[{name:'mobile-emulation',use:{...devices['Pixel 7'],channel:'chrome'}}],reporter:[['list'],['json',{outputFile:'.local/island-b-touch.json'}]]};
