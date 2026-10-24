import {useMemo,useRef,useImperativeHandle,useEffect,type ReactNode,type Ref} from 'react';
import type {TorusSession} from '../editor/torus-session.ts';
import {ConnectedWorkspace,type ConnectedViewportHandle,type ConnectedWorkspaceView} from './ConnectedWorkspace.tsx';
import {torusWorkspaceAdapter} from './torus-workspace-adapter.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
declare global{interface Window{__torusEditor?:{view():CylinderView|undefined;setView(view:CylinderView):void}}}
export function TorusEditor({session,workspace,handleRef}:{session:TorusSession;workspace:(view:ConnectedWorkspaceView)=>ReactNode;handleRef?:Ref<ConnectedViewportHandle>}){const adapter=useMemo(()=>torusWorkspaceAdapter(session.terrain),[session]),handle=useRef<ConnectedViewportHandle>(null);useImperativeHandle(handleRef,()=>({finishInteraction:()=>handle.current?.finishInteraction(),stop:()=>handle.current?.stop(),undo:()=>handle.current?.undo(),redo:()=>handle.current?.redo()}),[]);useEffect(()=>{if(!import.meta.env.DEV)return;window.__torusEditor={view:()=>handle.current?.getView?.(),setView:view=>handle.current?.restoreView?.(view)};return()=>{delete window.__torusEditor;};},[session]);return<ConnectedWorkspace session={session} adapter={adapter} handleRef={handle} workspace={workspace}/>;}
