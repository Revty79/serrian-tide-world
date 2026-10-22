import base from './playwright.hollow-worlds.config.mjs';
export default {...base,testMatch:['hollow-cylinder-holes.spec.ts','hollow-cylinder-connections.spec.ts','hollow-cylinder-map-links.spec.ts'],grep:/cylinder holes N128|cylinder connections N128|cylinder links/,reporter:[['list'],['json',{outputFile:process.env.OPEN_COMPAT_REPORT??'.local/open-cylinder-compat.json'}]]};
