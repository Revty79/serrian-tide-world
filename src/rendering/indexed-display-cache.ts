import {elevationToColor} from './elevation-colors.ts';
export interface IndexedDisplayTerrain<Key extends{readonly index:number}>{readonly sampleCount:number;readonly revision:number;readonly metadata:{readonly seaLevel:number};keyAt(index:number):Key;read(key:Key):number;samples():Iterable<Key>;copyElevations():Float32Array}
export function terrainPackedColor(elevation:number,seaLevel:number){const c=elevationToColor(elevation,seaLevel);return(c[0]|c[1]<<8|c[2]<<16|255<<24)>>>0;}
/** Accepted cylinder's coherent derived display cache, with an explicit
 * provider capacity. It never becomes another numerical terrain authority. */
export class IndexedDisplayCache<T extends IndexedDisplayTerrain<{readonly index:number}>>{
 readonly terrain:T;private colors:Uint32Array;sourceRevision:number;
 constructor(terrain:T,maxSamples:number,message:string){this.terrain=terrain;if(terrain.sampleCount>maxSamples)throw RangeError(message);this.colors=new Uint32Array(terrain.sampleCount);this.sourceRevision=terrain.revision;}
 get byteLength(){return this.colors.byteLength;}
 *prepare(){const revision=this.terrain.revision;if(revision===0){this.colors.fill(terrainPackedColor(this.terrain.read(this.terrain.keyAt(0)),this.terrain.metadata.seaLevel));return;}for(const key of this.terrain.samples()){if(this.terrain.revision!==revision)throw Error('Cylinder changed during display preparation.');this.colors[key.index]=terrainPackedColor(this.terrain.read(key),this.terrain.metadata.seaLevel);if(key.index%512===511)yield;}this.sourceRevision=revision;}
 snapshot(){return this.colors.slice();}
 elevationSnapshot(){if(this.sourceRevision!==this.terrain.revision)throw Error('Cylinder display epoch is not prepared.');return this.terrain.copyElevations();}
 apply(indices:Uint32Array,packed:Uint32Array,revision:number){for(let i=0;i<indices.length;i++)this.colors[indices[i]!]=packed[i]!;this.sourceRevision=revision;}
 refresh(indices:Iterable<number>){for(const index of indices)this.colors[index]=terrainPackedColor(this.terrain.read(this.terrain.keyAt(index)),this.terrain.metadata.seaLevel);this.sourceRevision=this.terrain.revision;}
 dispose(){this.colors=new Uint32Array(0);this.sourceRevision=-1;}
}
