import base from './playwright.hollow-polish-regression.config.mjs';
export default {...base,grep:/cylinder network |sphere guided|sphere connections N128/,reporter:[['list'],['json',{outputFile:'.local/open-final-guide-regression.json'}]]};
