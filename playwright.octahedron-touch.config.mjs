import base from './playwright.octahedron.config.mjs';import {devices} from '@playwright/test';
export default{...base,testMatch:['octahedron-touch.spec.ts'],projects:[{name:'mobile-emulation',use:{...devices['Pixel 7'],channel:'chrome'}}],reporter:[['list'],['json',{outputFile:'.local/octahedron-touch.json'}]]};
