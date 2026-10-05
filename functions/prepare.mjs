import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
mkdirSync(new URL('./shared/',import.meta.url),{recursive:true});
writeFileSync(new URL('./shared/analysis.js',import.meta.url),readFileSync(new URL('../app/src/data/analisis.js',import.meta.url),'utf8').replace("'../turno.js'","'./turno.js'"));
writeFileSync(new URL('./shared/turno.js',import.meta.url),readFileSync(new URL('../app/src/turno.js',import.meta.url),'utf8'));
