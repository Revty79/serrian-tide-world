import {useEffect,useImperativeHandle,useRef,useState,type Ref,type ReactNode} from 'react';
import {CubeEditor} from './CubeEditor.tsx';
import {HOLLOW_ROLES,type HollowCubeDocument} from '../editor/hollow-cube-document.ts';
import type {SphericalViewportHandle,SphericalWorkspaceView} from './SphericalViewport.tsx';
import './HollowCubeEditor.css';

/** One Atlas chrome, two cached instances of its accepted surface editor. */
export function HollowCubeEditor({editor,workspace,handleRef}:{editor:HollowCubeDocument;workspace:(view:SphericalWorkspaceView)=>ReactNode;handleRef?:Ref<SphericalViewportHandle>}){
 const [,update]=useState(0),handles=useRef<Partial<Record<'exterior'|'interior',SphericalViewportHandle>>>({});
 const run=(job:Promise<unknown>)=>{void job.catch(error=>{editor.error=error instanceof Error?error.message:String(error);}).finally(()=>update(v=>v+1));};
 useEffect(()=>{editor.changed=()=>update(v=>v+1);return()=>{editor.changed=()=>{};};},[editor]);
 useImperativeHandle(handleRef,()=>({finishInteraction:()=>handles.current[editor.selectedSurface]?.finishInteraction(),stop:()=>handles.current[editor.selectedSurface]?.stop(),undo:()=>run(editor.replay()),redo:()=>run(editor.replay(true))}),[editor]);
 const chrome=(view:SphericalWorkspaceView)=>workspace({...view,canUndo:editor.canUndo,canRedo:editor.canRedo,processing:editor.processing,tools:<><div className="hollow-controls"><h3>Hollow World</h3><div className="hollow-row">{HOLLOW_ROLES.map(role=><button key={role} aria-pressed={editor.selectedSurface===role} disabled={editor.processing||editor.locked} onClick={()=>run(editor.select(role))}>{role==='exterior'?'Paint Outside':'Paint Inside'}</button>)}</div><p className="hint">Independent geography on each side. Inside is shown as a far-wall cutaway. Both sides start at 0 m.</p></div>{view.tools}</>,navigation:<><span className="hollow-surface-label">{editor.selectedSurface==='exterior'?'Outside':'Inside'}</span>{view.navigation}</>});
 return <div className="hollow-editor" data-selected-surface={editor.selectedSurface}>
  {HOLLOW_ROLES.map(role=><CubeEditor key={role} session={editor.sessions[role]} active={editor.selectedSurface===role} adapter={{geometry:editor.world.surfaces[role].geometry,outerSideLengthMeters:editor.world.dimensions.outerSideLengthMeters}} handleRef={handle=>{if(handle)handles.current[role]=handle;else delete handles.current[role];}} workspace={editor.selectedSurface===role?chrome:()=>null}/>)}
  {editor.error&&<div className="hollow-notice" role="alert">{editor.error}<button onClick={()=>{editor.error='';update(v=>v+1);}}>Dismiss</button></div>}
 </div>;
}
