import base from './playwright.hollow-worlds-long.config.mjs';
/** Run alone. CYLINDER_LONG_NETWORKS=1 authors a real wall/cap network first. */
export default {...base,testDir:'./tests',testMatch:['hollow-cylinder-long.spec.ts'],
 reporter:[['list'],['json',{outputFile:process.env.HOLLOW_CYLINDER_LONG_REPORT??'.local/hollow-cylinder-long-browser.json'}]],
};
