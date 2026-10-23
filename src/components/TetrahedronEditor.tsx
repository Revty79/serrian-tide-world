import {useMemo,useRef,useImperativeHandle,useEffect,type ReactNode,type Ref} from 'react';
import type {SolidTetrahedronSession} from '../editor/tetrahedron-session.ts';
import type {ConnectedViewportHandle,ConnectedWorkspaceView} from './ConnectedWorkspace.tsx';
import {PolyhedronConnectionWorkspace} from './PolyhedronConnectionWorkspace.tsx';
import {tetrahedronWorkspaceAdapter} from './tetrahedron-workspace-adapter.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
declare global{interface Window{__tetrahedronEditor?:{view():CylinderView|undefined;setView(view:CylinderView):void}}}
export function TetrahedronEditor({session,workspace,handleRef}:{session:SolidTetrahedronSession;workspace:(view:ConnectedWorkspaceView)=>ReactNode;handleRef?:Ref<ConnectedViewportHandle>}){
 const handle=useRef<ConnectedViewportHandle>(null),banks=useMemo(()=>({exterior:session}),[session]);useImperativeHandle(handleRef,()=>({finishInteraction:()=>handle.current?.finishInteraction(),stop:()=>handle.current?.stop(),undo:()=>handle.current?.undo(),redo:()=>handle.current?.redo()}),[]);
 useEffect(()=>{if(!import.meta.env.DEV)return;window.__tetrahedronEditor={view:()=>handle.current?.getView?.(),setView:v=>handle.current?.restoreView?.(v)};return()=>{delete window.__tetrahedronEditor;};},[session]);
 return<PolyhedronConnectionWorkspace adapterFor={tetrahedronWorkspaceAdapter} store={session.connectionStore} banks={banks} role="exterior" title="Solid tetrahedron" handleRef={handle} workspace={workspace} notes={<p className="hint">One continuous exterior terrain covers all four real faces. A solid bore has two exterior mouths; physical tunnel graphs run inside the actual solid body.</p>}/>;
}
