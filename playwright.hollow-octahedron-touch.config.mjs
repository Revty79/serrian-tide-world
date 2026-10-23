import base from './playwright.octahedron.config.mjs';import {devices} from '@playwright/test';
export default{...base,testMatch:['hollow-octahedron-touch.spec.ts'],projects:[{name:'mobile-emulation',use:{...devices['Pixel 7'],channel:'chrome'}}],reporter:[['list'],['json',{outputFile:'.local/hollow-octahedron-touch.json'}]]};
