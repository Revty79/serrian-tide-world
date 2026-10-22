import test from 'node:test';import assert from 'node:assert/strict';
import {surfaceGraphicsInfo} from './surface-webgl.ts';
test('optional renderer query errors are recorded before resource checks, while subsequent allocation errors remain observable',()=>{
 let pending=0;const gl={NO_ERROR:0,CONTEXT_LOST_WEBGL:0x9242,RENDERER:0x1f01,getError(){const code=pending;pending=0;return code;},getExtension(){pending=0x501;return{UNMASKED_RENDERER_WEBGL:0x9246};},getParameter(){return'ANGLE (AMD, AMD Radeon RX 6600, D3D11)';},getContextAttributes(){return{antialias:true};}};
 const info=surfaceGraphicsInfo(gl as unknown as WebGL2RenderingContext);assert.deepEqual(info.probeErrors,[0x501]);assert.equal(info.software,false);assert.equal(gl.getError(),0);pending=0x505;assert.equal(gl.getError(),0x505);
 pending=0x9242;assert.throws(()=>surfaceGraphicsInfo(gl as unknown as WebGL2RenderingContext),/context lost/);
});
