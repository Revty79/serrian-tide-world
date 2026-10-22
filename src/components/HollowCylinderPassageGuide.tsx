import {useMemo} from 'react';
import type {HollowCylinderDocument} from '../editor/hollow-cylinder-document.ts';
import type {CylinderThroughHole} from '../surfaces/hollow-cylinder-holes.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {PhysicalPassageGuide} from './PhysicalPassageGuide.tsx';
import {closedCylinderConnectionTools} from './cylinder-connection-tools-adapter.ts';
type Props=Omit<Parameters<typeof PhysicalPassageGuide<CylinderThroughHole,CylinderView>>[0],'geometry'|'editor'>&{editor:HollowCylinderDocument};
export function HollowCylinderPassageGuide(props:Props){const geometry=useMemo(()=>closedCylinderConnectionTools(props.editor.world),[props.editor.world]);return <PhysicalPassageGuide {...props} geometry={geometry}/>;}
