import base from './playwright.tetrahedron.config.mjs';import {devices} from '@playwright/test';
export default{...base,testMatch:['tetrahedron-touch.spec.ts'],projects:[{name:'mobile-emulation',use:{...devices['Pixel 7'],channel:'chrome'}}],reporter:[['list'],['json',{outputFile:'.local/tetrahedron-touch.json'}]]};
