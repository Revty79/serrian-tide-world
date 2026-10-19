import{test}from'node:test';import assert from'node:assert/strict';
import{surfaceDisplayDimensions}from'./surface-renderer.ts';
test('display backing preserves scale and bounds memory over desktop, ultrawide and mobile sizes',()=>{
 for(const s of [{width:1440,height:900},{width:3440,height:1440},{width:800,height:800},{width:390,height:844},{width:10000,height:20000}])for(const dpr of[1,2,3]){const d=surfaceDisplayDimensions(s,dpr);assert.ok(d.width*d.height<=3000000);assert.ok(Math.abs(d.width/s.width-d.height/s.height)<1/Math.min(s.width,s.height));assert.ok(d.width<=s.width*1.5);}
});
test('invalid display sizes cannot allocate a backing store',()=>{for(const n of[0,-1,Infinity,NaN])assert.throws(()=>surfaceDisplayDimensions({width:n,height:900},1));});
