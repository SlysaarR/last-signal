// Inventory evidence, never infer a licence from a credit or public URL.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ledger=JSON.parse(fs.readFileSync(path.join(root,'docs/asset-rights.json'),'utf8'));
const sources=JSON.parse(fs.readFileSync(path.join(root,'assets/coins/sources.json'),'utf8'));
const photos=fs.readdirSync(path.join(root,'assets/coins')).filter(name=>name.endsWith('.webp')).sort();
const errors=[],pending=[];
if(ledger.version!==1 || !Array.isArray(ledger.photos))throw Error('Unsupported rights ledger');
const listed=ledger.photos.map(row=>row.file).sort();
if(JSON.stringify(photos)!==JSON.stringify(listed))errors.push('Photo inventory differs from rights ledger');
if(JSON.stringify(photos)!==JSON.stringify(sources.map(row=>row.file).sort()))errors.push('Photo inventory differs from sources.json');
for(const row of ledger.photos) {
 if(!photos.includes(row.file)){errors.push('Unknown file: '+row.file);continue;}
 const actual=createHash('sha256').update(fs.readFileSync(path.join(root,'assets/coins',row.file))).digest('hex');
 if(actual!==row.sha256)errors.push('Re-audit changed photo: '+row.file);
 const source=sources.find(item=>item.file===row.file);
 if(source?.page!==row.source || source?.credit!==row.credit)errors.push('Source/credit changed: '+row.file);
 if(row.status!=='cleared')pending.push(row.file);
 else if(!row.licence || !row.evidence || row.allowsDistribution!==true || row.allowsModification!==true || row.allowsCommercialUse!==true)errors.push('Incomplete permission evidence: '+row.file);
}
console.log(JSON.stringify({photos:photos.length,unresolved:pending.length,errors},null,2));
if(errors.length)process.exitCode=1;
else if(process.argv.includes('--strict') && pending.length){
 console.error('STORE RELEASE BLOCKED: unresolved image rights. See docs/asset-rights.md.');process.exitCode=1;
} else if(pending.length)console.log('Development inventory verified. Store redistribution permission is NOT established.');
