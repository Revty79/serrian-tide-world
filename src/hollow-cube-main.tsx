import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {HollowCubeInspection} from './components/HollowCubeInspection.tsx';
import './styles.css';
createRoot(document.getElementById('root')!).render(<StrictMode><HollowCubeInspection/></StrictMode>);
