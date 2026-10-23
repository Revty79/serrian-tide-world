import {useMemo,useRef,useImperativeHandle,useEffect,type ReactNode,type Ref} from 'react';
import type {IcosahedronSession} from '../editor/icosahedron-session.ts';
import {ConnectedWorkspace,type ConnectedViewportHandle,type ConnectedWorkspaceView} from './ConnectedWorkspace.tsx';
import {icosahedronWorkspaceAdapter} from './icosahedron-workspace-adapter.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
declare global{interface Window{__icosahedronEditor?:{view():CylinderView|undefined;setView(view:CylinderView):void}}}
export function IcosahedronEditor({session,workspace,handleRef}:{session:IcosahedronSession;workspace:(view:ConnectedWorkspaceView)=>ReactNode;handleRef?:Ref<ConnectedViewportHandle>}){const adapter=useMemo(()=>icosahedronWorkspaceAdapter(session.terrain),[session]),handle=useRef<ConnectedViewportHandle>(null);useImperativeHandle(handleRef,()=>({finishInteraction:()=>handle.current?.finishInteraction(),stop:()=>handle.current?.stop(),undo:()=>handle.current?.undo(),redo:()=>handle.current?.redo()}),[]);useEffect(()=>{if(!import.meta.env.DEV)return;window.__icosahedronEditor={view:()=>handle.current?.getView?.(),setView:view=>handle.current?.restoreView?.(view)};return()=>{delete window.__icosahedronEditor;};},[session]);return<ConnectedWorkspace session={session} adapter={adapter} handleRef={handle} workspace={workspace}/>;}
