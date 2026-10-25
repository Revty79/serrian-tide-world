import {mergeConfig} from 'vite';
import base from '../vite.config.ts';
export default mergeConfig(base,{cacheDir:'.local/.vite-rounded-final-cache',server:{host:'127.0.0.1',port:5301,strictPort:true}});
