import test from 'node:test';import assert from 'node:assert/strict';
import {assertInteractiveRibbon} from './ribbon-configuration.ts';
import {RIBBON_DEFAULT_DIMENSIONS,RIBBON_PRESETS} from '../surfaces/ribbon.ts';
for(const[name,patch]of Object.entries(RIBBON_PRESETS))for(const detail of[128,256] as const)test(`Ribbon ${name} ${detail}: useful creator profile or explicit capacity rejection`,()=>{
 if(detail===128&&(name==='Thin'||name==='Wide')){assert.throws(()=>assertInteractiveRibbon({...RIBBON_DEFAULT_DIMENSIONS,...patch},detail),/Higher detail/);return;}
 const p=assertInteractiveRibbon({...RIBBON_DEFAULT_DIMENSIONS,...patch},detail);assert.ok(p.wellSampled);assert.ok(p.defaultRadius>=3*p.maxSpacing);assert.ok(p.defaultRadius<p.maximum);assert.ok(p.maximum>p.minimum);
});
test('Ribbon undersampled aspect ratios and unsupported detail reject without terrain allocation',()=>{
 assert.throws(()=>assertInteractiveRibbon({...RIBBON_DEFAULT_DIMENSIONS,lengthRatio:.5,widthRatio:.35},128));assert.throws(()=>assertInteractiveRibbon(RIBBON_DEFAULT_DIMENSIONS,512 as 128));
});
