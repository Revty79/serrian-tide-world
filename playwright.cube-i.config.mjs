import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:['cube-family.spec.ts','hole-workflow.spec.ts','hollow-cube-editor.spec.ts','hollow-cube.spec.ts'],workers:1,retries:0,
 reporter:'list',outputDir:join(tmpdir(),'serrian-atlas-cube-i','focus'),
 use:{baseURL:process.env.ATLAS_PREVIEW_URL??'http://127.0.0.1:5173',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'desktop',use:{viewport:{width:1440,height:950}}},{name:'mobile',use:{...devices['Pixel 7']}}],
 webServer:{command:'npm run dev',url:process.env.ATLAS_PREVIEW_URL??'http://127.0.0.1:5173',reuseExistingServer:true,cwd:import.meta.dirname},
});
