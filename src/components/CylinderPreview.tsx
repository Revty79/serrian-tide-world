 'use client';
import {useEffect,useState,useMemo} from 'react';
import {CylinderPreviewSession,createCylinderPreviewTerrain} from '../editor/cylinder-preview-session.ts';
import type {CylindricalTerrain} from '../terrain/cylindrical.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import type {CylinderExcavationDisplay} from '../rendering/hollow-cylinder-display.ts';
import {ConnectedWorkspace,connectedWorkspaceInspection,type ConnectedViewportHandle,type ConnectedWorkspaceView,type ConnectedWorkspaceProps} from './ConnectedWorkspace.tsx';
import {closedCylinderWorkspaceAdapter} from './closed-cylinder-workspace-adapter.ts';
export const cylinderPreviewInspection=connectedWorkspaceInspection;
export type CylinderViewportHandle=ConnectedViewportHandle<CylinderView>;
export type CylinderWorkspaceView=ConnectedWorkspaceView;
export type CylinderWorkspaceProps=Omit<ConnectedWorkspaceProps<CylindricalTerrain,CylinderView,CylinderExcavationDisplay>,'adapter'>;
export function CylinderWorkspace(props:CylinderWorkspaceProps){const adapter=useMemo(()=>closedCylinderWorkspaceAdapter(props.session.terrain),[props.session]);return <ConnectedWorkspace {...props} adapter={adapter}/>;}
export function CylinderPreview() {
  const [session, setSession] = useState<CylinderPreviewSession>(), [detail, setDetail] = useState(128), [generation, setGeneration] = useState(0), [preparation, setPreparation] = useState(0), [error, setError] = useState('');
  useEffect(() => {
    let active = true, frame = 0; let created: CylinderPreviewSession | undefined;
    const started = performance.now();
    try {
      created = new CylinderPreviewSession(createCylinderPreviewTerrain(detail)); const work = created.cache.prepare();
      const prepare = () => { if (!active) return; try { let done = false; for (let i = 0; i < 8 && !done; i++) done = !!work.next().done; if (done) { setPreparation(performance.now() - started); setSession(created); } else frame = requestAnimationFrame(prepare); } catch (e) { setError(String(e)); } };
      frame = requestAnimationFrame(prepare);
    } catch (e) { setError(String(e)); }
    return () => { active = false; cancelAnimationFrame(frame); created?.dispose(); };
  }, [generation]); // Detail is deliberately committed only by New blank cylinder.
  const replace = () => { if (!session?.modified || confirm('Discard this session-only cylinder terrain and create a blank cylinder? It cannot be saved.')) { setSession(undefined); setError(''); setGeneration(n => n + 1); } };
  if (!session) return <main className="cylinder-preview cylinder-loading" aria-label="Cylinder development preview"><h1>Cylinder development preview</h1><p>Session-only terrain. Saving is unavailable.</p><p role={error ? 'alert' : 'status'}>{error || 'Preparing blank physical cylinder…'}</p><a href="/">Atlas home</a></main>;
  return <CylinderWorkspace key={session.terrain.metadata.terrainId} session={session} preparationMs={preparation} detail={detail} setDetail={setDetail} replace={replace} />;
}
