import {useMemo,useRef,useImperativeHandle,useEffect,type ReactNode,type Ref} from 'react';
import type {OctahedronSession} from '../editor/octahedron-session.ts';
import {ConnectedWorkspace,type ConnectedViewportHandle,type ConnectedWorkspaceView} from './ConnectedWorkspace.tsx';
import {octahedronWorkspaceAdapter} from './octahedron-workspace-adapter.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
declare global{interface Window{__octahedronEditor?:{view():CylinderView|undefined;setView(view:CylinderView):void}}}
export function OctahedronEditor({session,workspace,handleRef}:{session:OctahedronSession;workspace:(view:ConnectedWorkspaceView)=>ReactNode;handleRef?:Ref<ConnectedViewportHandle>}){const adapter=useMemo(()=>octahedronWorkspaceAdapter(session.terrain),[session]),handle=useRef<ConnectedViewportHandle>(null);useImperativeHandle(handleRef,()=>({finishInteraction:()=>handle.current?.finishInteraction(),stop:()=>handle.current?.stop(),undo:()=>handle.current?.undo(),redo:()=>handle.current?.redo()}),[]);useEffect(()=>{if(!import.meta.env.DEV)return;window.__octahedronEditor={view:()=>handle.current?.getView?.(),setView:view=>handle.current?.restoreView?.(view)};return()=>{delete window.__octahedronEditor;};},[session]);return<ConnectedWorkspace session={session} adapter={adapter} handleRef={handle} workspace={workspace}/>;}
