import { createCylinderWorkRuntime } from './cylinder-work-runtime.ts';
import type { CylinderWorkInput } from './cylinder-work-protocol.ts';
const runtime = createCylinderWorkRuntime(m => {
  const transfer = m.type === 'prepared' ? [m.indices.buffer, m.before.buffer, m.after.buffer] : [];
  postMessage(m, { transfer });
}, fn => setTimeout(fn, 0));
self.onmessage = (event: MessageEvent<CylinderWorkInput>) => runtime.receive(event.data);
