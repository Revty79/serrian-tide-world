import {defineConfig,devices} from '@playwright/test';

const baseURL=process.env.ATLAS_PREVIEW_URL??'http://127.0.0.1:5173';
export default defineConfig({
 testDir:'./tests',testMatch:['hollow-cube-editor.spec.ts','hollow-cube.spec.ts'],
 workers:1,retries:0,reporter:'list',
 use:{baseURL,launchOptions:{args:process.platform==='win32'?['--use-angle=default']:[]}},
 projects:[{name:'desktop',use:{viewport:{width:1440,height:950}}},{name:'mobile',use:{...devices['Pixel 7']}}],
 webServer:{command:'npm run dev',url:baseURL,reuseExistingServer:!process.env.CI},
});
