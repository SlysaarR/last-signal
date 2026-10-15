// Use the already verified runtime manifest. Development files never enter the APK.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const end=worker.indexOf('\n};');
const release=JSON.parse(worker.slice(worker.indexOf('const RELEASE = ')+16,end+2));
const destination=path.join(root,'android/app/src/main/assets/game');
fs.rmSync(destination,{recursive:true,force:true});fs.mkdirSync(destination,{recursive:true});
for(const asset of release.assets) {
  const name=asset.url.split('?')[0],source=path.resolve(root,name);
  if(!source.startsWith(root+path.sep)||name.includes('..'))throw Error('Unsafe runtime path');
  const bytes=fs.readFileSync(source),sha=createHash('sha256').update(bytes).digest('hex');
  if(sha!==asset.sha256||bytes.length!==asset.bytes)throw Error('Stale offline manifest: '+name);
  const output=path.join(destination,name);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,bytes);
}
fs.writeFileSync(path.join(destination,'bundle.json'),JSON.stringify({version:release.version,id:release.id,assets:release.assets},null,2));
const icons=path.join(root,'android/app/src/main/res/drawable-nodpi');fs.mkdirSync(icons,{recursive:true});
fs.copyFileSync(path.join(root,'assets/app/icon-512.png'),path.join(icons,'app_icon.png'));
console.log(`Android assets: ${release.version}, ${release.assets.length} verified resources, ${release.id}`);
