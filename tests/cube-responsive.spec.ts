import {test,expect} from '@playwright/test';
const proof=(value:unknown)=>JSON.stringify(value,(_key,item)=>typeof item==='bigint'?{$bigint:item.toString()}:Object.is(item,-0)?{$float64:'-0'}:item);
test.use({trace:'on'});
test.describe('Cube-C2B2 isolated native worker execution (no cube renderer)',()=>{
 test.setTimeout(180_000);
 for(const n of[128,256])for(const tool of['raise','lower','smooth','flatten'] as const)test(`N${n} ${tool}: every canonical word, epoch and history`,async({page},info)=>{
  await page.goto('/dev/cube-work.html');const result=await page.evaluate(async options=>(await import(/* @vite-ignore */new URL('/tests/fixtures/cube-worker-exercise.ts',location.origin).href)).exercise(options),{scenario:'normal',n,tool});
  expect(result.status).toBe('complete');expect(result.nativeWorkers).toBe(2);expect(result.diagnostics?.sourceElevationCopies).toBe(0);expect(result.exactWords).toBe(true);
  await info.attach('native-worker-proof',{body:proof(result),contentType:'application/json'});
 });
 for(const scenario of['construction','timeout','unavailable','disabled','stale','corrupt','duplicate','order','external','cancel-queued','cancel-startup','cancel-waiting','cancel-preparing','cancel-collecting','cancel-reserved','cancel-published','crash-preparing','crash-collecting','crash-reserved','dispose','rapid'])test(`${scenario}: exact prefix and bounded lifecycle`,async({page},info)=>{
  await page.goto('/dev/cube-work.html');const result=await page.evaluate(async scenario=>(await import(/* @vite-ignore */new URL('/tests/fixtures/cube-worker-exercise.ts',location.origin).href)).exercise({scenario}),scenario);
  expect(result.exactWords).toBe(true);expect(result.allWorkersTerminated).toBe(true);if(scenario.startsWith('crash-'))expect(result.nativeErrors).toBeGreaterThan(0);
  await info.attach('native-worker-proof',{body:proof(result),contentType:'application/json'});
  if(scenario==='rapid'){await page.screenshot({path:info.outputPath('cube-numerical-native-workers.png')});}
 });
});
