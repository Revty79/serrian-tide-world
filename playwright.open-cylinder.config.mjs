import base from './playwright.hollow-worlds.config.mjs';
export default {...base,testMatch:['open-cylinder-workflow.spec.ts'],reporter:[['list'],['json',{outputFile:process.env.OPEN_CYLINDER_REPORT??'.local/open-cylinder-workflow.json'}]]};
