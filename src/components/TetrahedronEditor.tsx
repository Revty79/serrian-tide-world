import {useMemo,useRef,useImperativeHandle,useEffect,type ReactNode,type Ref} from 'react';
import type {TetrahedronSession} from '../editor/tetrahedron-session.ts';
import {ConnectedWorkspace,type ConnectedViewportHandle,type ConnectedWorkspaceView} from './ConnectedWorkspace.tsx';
import {tetrahedronWorkspaceAdapter} from './tetrahedron-workspace-adapter.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
declare global{interface Window{__tetrahedronEditor?:{view():CylinderView|undefined;setView(view:CylinderView):void}}}
export function TetrahedronEditor({session,workspace,handleRef}:{session:TetrahedronSession;workspace:(view:ConnectedWorkspaceView)=>ReactNode;handleRef?:Ref<ConnectedViewportHandle>}){const adapter=useMemo(()=>tetrahedronWorkspaceAdapter(session.terrain),[session]),handle=useRef<ConnectedViewportHandle>(null);useImperativeHandle(handleRef,()=>({finishInteraction:()=>handle.current?.finishInteraction(),stop:()=>handle.current?.stop(),undo:()=>handle.current?.undo(),redo:()=>handle.current?.redo()}),[]);useEffect(()=>{if(!import.meta.env.DEV)return;window.__tetrahedronEditor={view:()=>handle.current?.getView?.(),setView:view=>handle.current?.restoreView?.(view)};return()=>{delete window.__tetrahedronEditor;};},[session]);return<ConnectedWorkspace session={session} adapter={adapter} handleRef={handle} workspace={workspace}/>;}
