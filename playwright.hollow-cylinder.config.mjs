import base from './playwright.hollow-worlds.config.mjs';
/** Reproducible capped-cylinder review suite. All artifacts stay in .local/tmp. */
export default {...base,testDir:'./tests',testMatch:[
 'hollow-cylinder-workflow.spec.ts','hollow-cylinder-view-proof.spec.ts',
 'hollow-cylinder-holes.spec.ts','hollow-cylinder-hole-pixels.spec.ts','hollow-cylinder-hole-input.spec.ts',
 'hollow-cylinder-connections.spec.ts','hollow-cylinder-network-guide.spec.ts','hollow-cylinder-network-upgrade.spec.ts',
 'hollow-cylinder-map-links.spec.ts','hollow-cylinder-network-position.spec.ts',
],reporter:[['list'],['json',{outputFile:process.env.HOLLOW_CYLINDER_REPORT??'.local/hollow-cylinder-browser.json'}]]};
