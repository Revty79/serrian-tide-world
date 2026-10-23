import base from './playwright.trapezohedron.config.mjs';import {devices} from '@playwright/test';
export default{...base,testMatch:['trapezohedron-touch.spec.ts'],projects:[{name:'mobile-emulation',use:{...devices['Pixel 7'],channel:'chrome'}}],reporter:[['list'],['json',{outputFile:'.local/trapezohedron-touch.json'}]]};
