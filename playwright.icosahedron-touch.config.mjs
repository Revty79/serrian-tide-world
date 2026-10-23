import base from './playwright.icosahedron.config.mjs';import {devices} from '@playwright/test';
export default{...base,testMatch:['icosahedron-touch.spec.ts'],projects:[{name:'mobile-emulation',use:{...devices['Pixel 7'],channel:'chrome'}}],reporter:[['list'],['json',{outputFile:'.local/icosa-touch.json'}]]};
