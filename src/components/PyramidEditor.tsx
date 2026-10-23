import {useMemo,useRef,useImperativeHandle,useEffect,type ReactNode,type Ref} from 'react';
import type {PyramidSession} from '../editor/pyramid-session.ts';
import {ConnectedWorkspace,type ConnectedViewportHandle,type ConnectedWorkspaceView} from './ConnectedWorkspace.tsx';
import {pyramidWorkspaceAdapter} from './pyramid-workspace-adapter.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
declare global{interface Window{__pyramidEditor?:{view():CylinderView|undefined;setView(view:CylinderView):void}}}
export function PyramidEditor({session,workspace,handleRef}:{session:PyramidSession;workspace:(view:ConnectedWorkspaceView)=>ReactNode;handleRef?:Ref<ConnectedViewportHandle>}){const adapter=useMemo(()=>pyramidWorkspaceAdapter(session.terrain),[session]),handle=useRef<ConnectedViewportHandle>(null);useImperativeHandle(handleRef,()=>({finishInteraction:()=>handle.current?.finishInteraction(),stop:()=>handle.current?.stop(),undo:()=>handle.current?.undo(),redo:()=>handle.current?.redo()}),[]);useEffect(()=>{if(!import.meta.env.DEV)return;window.__pyramidEditor={view:()=>handle.current?.getView?.(),setView:view=>handle.current?.restoreView?.(view)};return()=>{delete window.__pyramidEditor;};},[session]);return<ConnectedWorkspace session={session} adapter={adapter} handleRef={handle} workspace={workspace}/>;}
