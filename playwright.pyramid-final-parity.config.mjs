import base from './playwright.atlas-parity.config.mjs';

export default {
 ...base,
 use: {...base.use, channel: 'chrome', baseURL: 'http://127.0.0.1:5265'},
 webServer: {
  ...base.webServer,
  command: 'npm run dev -- --port 5265 --strictPort',
  url: 'http://127.0.0.1:5265',
  cwd: import.meta.dirname,
  reuseExistingServer: true,
 },
};
