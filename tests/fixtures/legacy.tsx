// Retain the retired overlay workflow only for historical regression coverage.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './legacy-app.tsx';
import '../../src/styles.css';
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
