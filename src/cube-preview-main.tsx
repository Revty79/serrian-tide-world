import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {CubeDevelopmentPreview} from './components/CubeDevelopmentPreview.tsx';
import './styles.css';
createRoot(document.getElementById('root')!).render(<StrictMode><CubeDevelopmentPreview/></StrictMode>);
