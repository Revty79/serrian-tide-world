import base from './playwright.pyramid.config.mjs';
// Open Cylinder's accepted 1.49M-pixel gate requires its original desktop size.
export default{...base,projects:[{name:'installed-chrome',use:{viewport:{width:1920,height:1080},deviceScaleFactor:1}}],testMatch:['cube-family.spec.ts','cylinder-workspace.spec.ts','spherical-editing.spec.ts','open-cylinder-correction.spec.ts'],grep:/I3 one brush|I4\/I5 |normal Atlas creates|all four tools on globe|correction Open N128 (auto|canvas) exterior:/,reporter:[['list'],['json',{outputFile:'.local/pyramid-solid-regression.json'}]]};
