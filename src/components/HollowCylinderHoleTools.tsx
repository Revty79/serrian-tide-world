import {useMemo} from 'react';
import type {HollowCylinderDocument} from '../editor/hollow-cylinder-document.ts';
import type {CylinderThroughHole} from '../surfaces/hollow-cylinder-holes.ts';
import {PhysicalHoleTools} from './PhysicalHoleTools.tsx';
import {closedCylinderConnectionTools} from './cylinder-connection-tools-adapter.ts';
type Props=Omit<Parameters<typeof PhysicalHoleTools<CylinderThroughHole>>[0],'geometry'|'editor'>&{editor:HollowCylinderDocument};
export function HollowCylinderHoleTools(props:Props){const geometry=useMemo(()=>closedCylinderConnectionTools(props.editor.world),[props.editor.world]);return <PhysicalHoleTools {...props} geometry={geometry}/>;}
