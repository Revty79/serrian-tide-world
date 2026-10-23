import {useMemo,useRef,useImperativeHandle,useEffect,type ReactNode,type Ref} from 'react';
import type {SolidPyramidSession} from '../editor/pyramid-session.ts';
import type {ConnectedViewportHandle,ConnectedWorkspaceView} from './ConnectedWorkspace.tsx';
import {PyramidConnectionWorkspace} from './PyramidConnectionWorkspace.tsx';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
declare global{interface Window{__pyramidEditor?:{view():CylinderView|undefined;setView(view:CylinderView):void}}}
export function PyramidEditor({session,workspace,handleRef}:{session:SolidPyramidSession;workspace:(view:ConnectedWorkspaceView)=>ReactNode;handleRef?:Ref<ConnectedViewportHandle>}){
 const handle=useRef<ConnectedViewportHandle>(null),banks=useMemo(()=>({exterior:session}),[session]);useImperativeHandle(handleRef,()=>({finishInteraction:()=>handle.current?.finishInteraction(),stop:()=>handle.current?.stop(),undo:()=>handle.current?.undo(),redo:()=>handle.current?.redo()}),[]);
 useEffect(()=>{if(!import.meta.env.DEV)return;window.__pyramidEditor={view:()=>handle.current?.getView?.(),setView:v=>handle.current?.restoreView?.(v)};return()=>{delete window.__pyramidEditor;};},[session]);
 return<PyramidConnectionWorkspace store={session.connectionStore} banks={banks} role="exterior" title="Solid pyramid" handleRef={handle} workspace={workspace} notes={<p className="hint">One continuous exterior terrain covers all five real faces. A solid bore has two exterior mouths; physical tunnel graphs run inside the actual solid body.</p>}/>;
}
