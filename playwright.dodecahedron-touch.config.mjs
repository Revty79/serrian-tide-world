import base from './playwright.dodecahedron.config.mjs';import {devices} from '@playwright/test';
export default{...base,testMatch:['dodecahedron-touch.spec.ts'],projects:[{name:'mobile-emulation',use:{...devices['Pixel 7'],channel:'chrome'}}],reporter:[['list'],['json',{outputFile:'.local/dodecahedron-touch.json'}]]};
