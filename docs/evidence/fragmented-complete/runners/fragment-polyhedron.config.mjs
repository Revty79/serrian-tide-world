import base from '../playwright.polyhedron-smoke.config.mjs';
export default{...base,testDir:'../tests',use:{...base.use,baseURL:'http://127.0.0.1:5275'},webServer:undefined,reporter:[['list'],['json',{outputFile:'D:/serrian-tide-world/.local/fragmented-c-polyhedron.json'}]]};
