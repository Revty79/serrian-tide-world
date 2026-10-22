import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:['cube-long-sculpting.spec.ts','hollow-cube-long.spec.ts'],grep:/corner|fast sweep/,
 workers:1,retries:0,reporter:[['list'],['json',{outputFile:'.local/cube-i-long.json'}]],outputDir:join(tmpdir(),'serrian-atlas-cube-i','long'),
 use:{baseURL:process.env.ATLAS_PREVIEW_URL??'http://127.0.0.1:5173'},
 webServer:{command:'npm run dev',url:process.env.ATLAS_PREVIEW_URL??'http://127.0.0.1:5173',reuseExistingServer:true,cwd:import.meta.dirname},
});
