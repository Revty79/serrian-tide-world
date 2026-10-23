import base from './playwright.pyramid.config.mjs';import {devices} from '@playwright/test';
export default{...base,testMatch:['pyramid-touch.spec.ts'],projects:[{name:'mobile-emulation',use:{...devices['Pixel 7'],channel:'chrome'}}],reporter:[['list'],['json',{outputFile:'.local/pyramid-touch.json'}]]};
