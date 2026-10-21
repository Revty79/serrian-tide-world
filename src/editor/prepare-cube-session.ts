import type {SolidCubeTerrain} from '../terrain/solid-cube.ts';
import {CubeEditorSession} from './cube-editor-session.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';
export async function prepareCubeSession(terrain:SolidCubeTerrain,name:string,saved:boolean,work:PersistenceWork={}){
 const started=performance.now();await workStep(work,'Preparing cube editor',0);const editor=new CubeEditorSession(terrain,name,saved);
 try{await workStep(work,'Preparing cube editor',1);return{terrain,editor,preparationMs:performance.now()-started};}
 catch(error){editor.dispose();throw error;}
}
