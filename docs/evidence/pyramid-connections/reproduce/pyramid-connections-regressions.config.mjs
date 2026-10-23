import base from '../playwright.pyramid.config.mjs';
import {devices} from '@playwright/test';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
const root=resolve(import.meta.dirname,'..'),group=process.env.PYRAMID_CONNECTION_GROUP??'pyramid';
const groups={
 pyramid:['pyramid-workflow.spec.ts','pyramid-pixels.spec.ts','hollow-pyramid-workflow.spec.ts','hollow-pyramid-pixels.spec.ts','hollow-pyramid-navigation.spec.ts','hollow-pyramid-context.spec.ts'],
 touch:['pyramid-touch.spec.ts'],
 previous:['hollow-cylinder-connections.spec.ts','hollow-cylinder-network-guide.spec.ts','open-cylinder-workflow.spec.ts','hollow-sphere-connections.spec.ts','hollow-cube-editor.spec.ts','cube-family.spec.ts','cylinder-workspace.spec.ts','spherical-editing.spec.ts'],
 polyhedra:['tetrahedron-workflow.spec.ts','hollow-tetrahedron-workflow.spec.ts','tetrahedron-pixels.spec.ts','hollow-tetrahedron-pixels.spec.ts','octahedron-workflow.spec.ts','hollow-octahedron-workflow.spec.ts','octahedron-pixels.spec.ts','hollow-octahedron-pixels.spec.ts'],
};
const grep=group==='previous'?/cylinder connections N128|cylinder network |Open (canvas|auto): real wall hole|sphere connections N128|hollow cube |H3 |H4 |I4 network authoring|I4 (auto|canvas): two picked|I3 one brush|I4\/I5 |normal Atlas creates|all four tools on globe/:group==='polyhedra'?/N128|N256.*(physical edge|true four|four-face|pixels|presentation)/:undefined;
export default{...base,testDir:resolve(root,'tests'),testMatch:groups[group],grep,workers:1,fullyParallel:false,retries:0,timeout:300000,projects:group==='touch'?[{name:'mobile-emulation',use:{...devices['Pixel 7'],channel:'chrome'}}]:base.projects,reporter:[['list'],['json',{outputFile:resolve(root,`.local/pyramid-connections-final-${group}.json`)}]],webServer:{...base.webServer,cwd:root},outputDir:join(tmpdir(),'serrian-atlas-pyramid-connections-regressions',group)};
