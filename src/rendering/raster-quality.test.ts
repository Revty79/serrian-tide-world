import test from 'node:test';import assert from 'node:assert/strict';
import {settledRasterBudget,rasterEdgeCoverage,cutDisplayDimensions} from './raster-quality.ts';
test('settled display resolves existing geography at bounded backing density, independent of terrain resolution',()=>{
 assert.equal(settledRasterBudget({width:1000,height:800},1),800000);assert.equal(settledRasterBudget({width:1000,height:800},2),1500000);assert.equal(settledRasterBudget({width:1000,height:800},2,true),650000);assert.equal(settledRasterBudget({width:200,height:100},1),20000);
});
test('paired physical coverage preserves the ordinary terrain contribution and subtracts only real cut coverage',()=>{
 const pixels=new Uint8ClampedArray(8),mask=new Uint8ClampedArray(8),job=rasterEdgeCoverage(pixels,new Uint8Array([255,1]),2,1,(x,_y,out)=>{if(x<.5){out.set([160,120,80,1,1]);return 1;}out.fill(0);return 255;},mask);while(!job.next().done){}
 assert.deepEqual([...pixels.slice(0,4)],[160,120,80,128]);assert.equal(mask[3],128);
 // destination-out followed by additive premultiplied color gives exactly the
 // covered rock plus the remaining accepted terrain, including fractional alpha.
 const accepted=[40,80,120],coverage=mask[3]!/255,alpha=pixels[3]!/255;
 assert(Math.abs((1-coverage)+alpha-1)<1e-12);for(let k=0;k<3;k++)assert(Math.abs(accepted[k]!*(1-coverage)+pixels[k]!*alpha-(accepted[k]!+pixels[k]!)/2)<.25);
});
test('analytic cut backing gains subpixel coverage within the existing bounded display policy',()=>{assert.deepEqual(cutDisplayDimensions({width:400,height:300},1,false),{width:400,height:300});assert.deepEqual(cutDisplayDimensions({width:400,height:300},1,true),{width:600,height:450});const large=cutDisplayDimensions({width:3440,height:1440},2,true);assert(large.width*large.height<=3000000);});
test('coverage samples actual boundary rays, preserves uniform pixels and averages alpha before unpremultiplying',()=>{
 const pixels=new Uint8ClampedArray(3*4),labels=new Uint8Array([1,1,0]);pixels.set([80,90,100,255],0);pixels.set([100,50,25,255],4);let calls=0;
 const job=rasterEdgeCoverage(pixels,labels,3,1,(x,_y,out)=>{calls++;if(x<2){out.set([100,50,25,1]);return 1;}return 0;});while(!job.next().done){}assert.equal(calls,8);assert.deepEqual([...pixels.slice(0,4)],[80,90,100,255]);assert.deepEqual([...pixels.slice(4,8)],[100,50,25,255]);assert.deepEqual([...pixels.slice(8)],[0,0,0,0]);
 const half=new Uint8ClampedArray(8),split=rasterEdgeCoverage(half,new Uint8Array([0,1]),2,1,(x,_y,out)=>{if(x<.5){out.set([200,100,50,1]);return 1;}return 0;});while(!split.next().done){}assert.deepEqual([...half.slice(0,4)],[200,100,50,128]);
 const ramp=new Uint8ClampedArray([71,83,95,255,0,0,0,0]),preserve=rasterEdgeCoverage(ramp,new Uint8Array([1,0]),2,1,(x,_y,out)=>{out.set([100+x*x,80,90,1]);return 1;});while(!preserve.next().done){}assert.deepEqual([...ramp.slice(0,4)],[71,83,95,255]);
});
