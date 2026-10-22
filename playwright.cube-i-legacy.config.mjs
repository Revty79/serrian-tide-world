import {tmpdir} from 'node:os';
import {defineConfig,devices} from '@playwright/test';
import {join} from 'node:path';
const root=import.meta.dirname;
export default defineConfig({
 testDir:join(root,'tests'),testMatch:['atlas.spec.ts','cube-corrective.spec.ts','cube-editor.spec.ts','cube-world.spec.ts','cube-visual.spec.ts','cube-responsive.spec.ts','cylinder-workspace.spec.ts','unified-workspace.spec.ts','workspace.spec.ts','wrapping.spec.ts','sculpting.spec.ts','refinement.spec.ts','focused-view.spec.ts','navigation-stabilization.spec.ts','spherical-editing.spec.ts','spherical-persistence.spec.ts','spherical-limb-workspace.spec.ts','surface-compatibility.spec.ts','cylinder-rims.spec.ts','cylinder-painting.spec.ts'],
 workers:1,retries:0,reporter:[['list'],['json',{outputFile:process.env.CUBE_I_REGRESSION_REPORT??join(root,'.local/cube-i-regression.json')}]],outputDir:join(tmpdir(),'serrian-atlas-cube-i','legacy'),
 use:{baseURL:process.env.ATLAS_PREVIEW_URL??'http://127.0.0.1:5173',launchOptions:{args:process.platform==='win32'?['--use-angle=default']:[]}},
 projects:[{name:'desktop',use:{viewport:{width:1440,height:950}}},{name:'mobile',use:{...devices['Pixel 7']}}],
 webServer:{command:'npm run dev',url:process.env.ATLAS_PREVIEW_URL??'http://127.0.0.1:5173',reuseExistingServer:true,cwd:root},
});
