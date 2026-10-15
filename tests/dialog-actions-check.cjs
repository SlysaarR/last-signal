const {newRun,root,assert}=require('./harness.cjs');
const fs=require('node:fs');
const ns=(run,name)=>run.modules.get(root+'/js/'+name+'.js').namespace;
const plain=value=>JSON.parse(JSON.stringify(value));

// The VM does not compute CSS. Guard the actual source of the reported lock:
// shell header/footer rules must never select headers or actions inside dialogs.
// This is a selector-scope check, not a browser visibility/geometry assertion.
const html=fs.readFileSync(root+'/index.html','utf8'),leaks=[];
for(const link of html.matchAll(/href="\.\/(css\/[^"?]+)(?:\?[^"\s]*)?"/g)){
 const css=fs.readFileSync(root+'/'+link[1],'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 for(const rule of css.matchAll(/([^{}]+)\{/g)){
  const selector=rule[1].trim();if(selector.startsWith('@'))continue;
  const unscoped=selector.replace(/main\s*>\s*:is\([^()]*\)/g,'shell-elements').replace(/main\s*>\s*(?:header|footer)(?![\w-])/g,'shell-element');
  if(/(?<![.#\w-])(?:header|footer)(?![\w-])/.test(unscoped))leaks.push(link[1]+': '+selector);
 }
}
assert.deepEqual(leaks,[],'shell selectors can hide/resize dialog headers or action footers');
console.log('PASS all loaded stylesheets isolate shell header/footer selectors from dialogs');

(async()=>{
 for(const lang of ['uk','en'])for(const choice of ['take','leave']){
  const configure=e=>e.store.set('last-signal-language',lang);
  const r=await newRun(null,false,configure),m=n=>ns(r,n),s=m('storage').s,el=id=>r.elements.get(id);
  m('camp').depart();el('modal').close();s.energy=41.5;
  s.pending={type:30,condition:86,spent:7.5};m('excavation').openExcavation();
  assert(!m('menu').canUpdateGame(),'cannot update over an active excavation');
  for(let y=130;y<=370;y+=40)for(let x=180;x<=420;x+=40)m('excavation').brushAt(x,y);
  assert.equal(el('excProgress').value,100);assert(!el('excNext').disabled);assert(el('excSkip').hidden);
  const completed=plain(s.pending),before=plain(s);
  // The screenshot state: fully cleaned, not yet revealed/packed, then restart.
  const loaded=await newRun(r.store.get('last-signal-v1'),false,configure,{start:false});
  const lm=n=>ns(loaded,n),le=id=>loaded.elements.get(id);
  assert.deepEqual(loaded.state(),before);assert(!le('excavate').open);assert(lm('menu').canUpdateGame());
  le('openSettings').onclick();assert(lm('menu').canUpdateGame(),'a saved pending find must not block updates from Settings');
  le('helpDialog').showModal();assert(!lm('menu').canUpdateGame());le('helpDialog').close();
  le('settingsBack').onclick();le('continueGame').onclick();
  assert(le('excavate').open);assert.equal(le('excProgress').value,100);assert(!le('excNext').disabled);
  assert.deepEqual(loaded.state().pending,completed);assert.equal(loaded.state().energy,41.5);
  le('excNext').onclick();assert(!le('excavate').open);assert(le('packDialog').open);assert(loaded.state().pending.revealed);
  // Reload at the second decision too: neither choice may happen automatically.
  const packed=await newRun(loaded.store.get('last-signal-v1'),false,configure,{start:false});
  const pm=n=>ns(packed,n),pe=id=>packed.elements.get(id);
  assert(pm('menu').canUpdateGame());assert.deepEqual(packed.state(),loaded.state());
  pe('continueGame').onclick();assert(pe('packDialog').open);assert(!pm('menu').canUpdateGame());
  const bag=plain(packed.state().bag),found=packed.state().found||0;
  if(choice==='take')pe('packChoices').listeners.click[0]({target:{closest:()=>({dataset:{pack:'take'}})}});
  else pe('leaveFind').onclick();
  assert(!pe('packDialog').open);assert.equal(packed.state().pending,null);assert.equal(packed.state().energy,41.5);
  assert.deepEqual(packed.state().bag,choice==='take'?[...bag,{type:30,condition:86}]:bag);
  assert.equal(packed.state().found,found+1);
  assert(!pm('menu').canUpdateGame(),'field play is not an update surface');
  const final=await newRun(packed.store.get('last-signal-v1'),false,configure);assert.deepEqual(final.state(),packed.state());
 }
 console.log('PASS UK/EN completed-cleaning recovery, settings update eligibility, revealed recovery, take/leave, one decision, saved energy and final reload');
})().catch(error=>{console.error(error);process.exit(1)});
