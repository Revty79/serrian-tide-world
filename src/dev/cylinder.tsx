import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CylinderPreview } from '../components/CylinderPreview.tsx';
import '../styles.css';
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<StrictMode><CylinderPreview /></StrictMode>);
else document.getElementById('root')!.textContent = 'Cylinder development preview is available only in the local development server. It cannot save terrain.';
