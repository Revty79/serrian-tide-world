import base from '../playwright.fragmented.config.mjs';
export default{...base,testDir:'../tests',testMatch:['fragmented-final.spec.ts'],reporter:[['list'],['json',{outputFile:'D:/serrian-tide-world/.local/fragmented-c-final.json'}]]};
