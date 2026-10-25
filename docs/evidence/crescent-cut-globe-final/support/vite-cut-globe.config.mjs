import base from '../vite.config.ts';
const root=process.cwd().replaceAll('\\','/');
export default {...base,server:{...base.server,watch:{ignored:[root+'/.local/**',root+'/docs/evidence/**']}}};
