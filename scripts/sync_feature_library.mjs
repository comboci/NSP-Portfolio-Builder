// Regenerate file://-compatible feature.js after editing feature.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const folder=path.join(root,'Portfolio Instruction');
const input=path.join(folder,'feature.json');
const output=path.join(folder,'feature.js');
const data=JSON.parse(fs.readFileSync(input,'utf8'));
if(data.schema!=='nsp-portfolio-feature-library-v1'||!Array.isArray(data.catalogs)||!Array.isArray(data.categories)){
 throw new Error('feature.json schema is invalid');
}
const ids=new Set();
for(const catalog of data.catalogs){
 for(const f of catalog.features||[]){
  if(ids.has(f.id))throw new Error('Duplicate feature id: '+f.id);
  ids.add(f.id);
 }
 for(const asset of catalog.images||[]){
  const file=path.join(root,asset.path);
  if(!fs.existsSync(file))throw new Error('Missing image: '+file);
 }
}
fs.writeFileSync(output,'/* Auto-generated from Portfolio Instruction/feature.json — do not edit by hand. */\nwindow.NSP_FEATURE_LIBRARY = '+JSON.stringify(data)+';\n','utf8');
console.log('feature.js synced',data.catalogs.length,'catalog(s)',ids.size,'features');