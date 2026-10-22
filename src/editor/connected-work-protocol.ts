import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings,ConnectedDabStatistics} from '../terrain/connected-brush.ts';
import type {ConnectedStrokeStatistics} from '../terrain/connected-stroke.ts';
import type {paintingMetrics} from './painting-metrics.ts';
/** Chart-neutral prepared words/progress. A worker's source metadata and
 * topology adapter remain provider-specific and are never fabricated. */
export type ConnectedPreparedPatch={type:'prepared';task:number;sequence:number;sourceRevision:number;center:SurfacePosition;settings:CylindricalBrushSettings;indices:Uint32Array;before:Float32Array;after:Float32Array;affectedSamples:number;stats?:ConnectedStrokeStatistics;dabStatistics?:ConnectedDabStatistics;previewStages?:ReturnType<typeof paintingMetrics>};
export type ConnectedWorkOutput=ConnectedPreparedPatch
 |{type:'progress';task:number;stats:ConnectedStrokeStatistics}
 |{type:'done';task:number;stats?:ConnectedStrokeStatistics;stages:ReturnType<typeof paintingMetrics>}
 |{type:'error';task:number;message:string;stats?:ConnectedStrokeStatistics;stages:ReturnType<typeof paintingMetrics>};
export type ConnectedWorkerInput<Metadata,Options,View=unknown>=
 |{type:'start';task:number;metadata:Metadata;revision:number;values:Float32Array;center:SurfacePosition;settings:CylindricalBrushSettings;options:Omit<Options,'commitReady'>;preview?:View;measure?:boolean}
 |{type:'move';task:number;point:SurfacePosition;ordinal:number}
 |{type:'release';task:number}
 |{type:'ack';task:number;sequence:number;revision:number};
