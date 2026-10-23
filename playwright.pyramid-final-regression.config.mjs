import base from './playwright.hollow-polish-regression.config.mjs';

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
 reporter: [['list'], ['json', {outputFile: process.env.HOLLOW_POLISH_REPORT ?? '.local/pyramid-final-legacy.json'}]],
};
