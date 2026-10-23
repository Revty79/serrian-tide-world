import type {ReactNode,Ref} from 'react';
import type {PyramidSession} from '../editor/pyramid-session.ts';
import type {PyramidTerrain} from '../terrain/pyramid.ts';
import type {PolyhedronConnectionStore} from '../editor/polyhedron-connection-store.ts';
import type {PolyhedronRole} from '../surfaces/polyhedron-material.ts';
import type {ConnectedViewportHandle,ConnectedWorkspaceView} from './ConnectedWorkspace.tsx';
import {PolyhedronConnectionWorkspace} from './PolyhedronConnectionWorkspace.tsx';
import {pyramidWorkspaceAdapter} from './pyramid-workspace-adapter.ts';
/** Compatibility entry point; authoring and history chrome are shared. */
export function PyramidConnectionWorkspace(props:{store:PolyhedronConnectionStore;banks:Partial<Record<PolyhedronRole,PyramidSession>>;role:PolyhedronRole;select?:(role:PolyhedronRole)=>Promise<void>;title:string;notes?:ReactNode;workspace:(view:ConnectedWorkspaceView)=>ReactNode;handleRef?:Ref<ConnectedViewportHandle>}){return<PolyhedronConnectionWorkspace<PyramidTerrain> {...props} adapterFor={pyramidWorkspaceAdapter}/>;}
