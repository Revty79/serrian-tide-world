import type {SphereFieldSnapshot,SphereAppearance} from './spherical-elevation.ts';
import type {SphericalView,Viewport} from './spherical-view.ts';
import type {RoundedRayGrid} from './rounded-crescent-grid.ts';
export interface RoundedRasterRequest {type:'render';id:number;view:SphericalView;size:Viewport;appearance:SphereAppearance;budget:number;backing:Viewport;grid:RoundedRayGrid;firstRow:number;rowCount:number;haloTop:number}
export type RoundedRasterInput=RoundedRasterRequest|{type:'field';field:SphereFieldSnapshot;view:SphericalView}|{type:'cancel';id:number};
export type RoundedRasterOutput={type:'ready'}|{type:'result';id:number;revision:number;firstRow:number;rowCount:number;columns:number;pixels:Uint8ClampedArray;computeMs:number}|{type:'error';id:number;message:string};
