import {useMemo} from 'react';
import type {HollowCylinderDocument} from '../editor/hollow-cylinder-document.ts';
import type {CylinderThroughHole} from '../surfaces/hollow-cylinder-holes.ts';
import {PhysicalTunnelTools} from './PhysicalTunnelTools.tsx';
import {closedCylinderConnectionTools} from './cylinder-connection-tools-adapter.ts';
type Props=Omit<Parameters<typeof PhysicalTunnelTools<CylinderThroughHole>>[0],'geometry'|'editor'>&{editor:HollowCylinderDocument};
export function HollowCylinderTunnelTools(props:Props){const geometry=useMemo(()=>closedCylinderConnectionTools(props.editor.world),[props.editor.world]);return <PhysicalTunnelTools {...props} geometry={geometry}/>;}
