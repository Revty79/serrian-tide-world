import base from '../playwright.hollow-icosahedron.config.mjs';
export default{...base,testDir:'../tests',testMatch:['hollow-icosahedron-pixels.spec.ts'],use:{...base.use,baseURL:'http://127.0.0.1:5275'},webServer:undefined,reporter:[['list'],['json',{outputFile:'D:/serrian-tide-world/.local/fragmented-c-cavity.json'}]]};
