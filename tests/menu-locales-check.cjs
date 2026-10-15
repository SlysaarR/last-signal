const {newRun,root,golden,assert}=require('./harness.cjs');
const fs=require('node:fs');
const ns=(r,n)=>r.modules.get(root+'/js/'+n+'.js').namespace;
const plain=v=>JSON.parse(JSON.stringify(v));
const enSetup=e=>e.store.set('last-signal-language','en');
const startMenu=(saved,setup=enSetup)=>newRun(saved,false,setup,{start:false});
(async()=>{
 const fresh=await startMenu(),el=id=>fresh.elements.get(id),menu=ns(fresh,'menu'),ui=ns(fresh,'ui');
 assert.equal(fresh.context.document.documentElement.lang,'en');assert.equal(fresh.context.document.title,'Last Signal');
 assert.equal(el('menu').hidden,false);assert.equal(el('camp').hidden,true);assert.equal(el('search').hidden,true);
 assert.equal(el('continueGame').textContent,'Play');assert.equal(fresh.context.document.activeElement,null);
 assert.equal(fresh.frames.size,0,'main menu starts no render loop');
 el('openSettings').onclick();assert.equal(el('settings').hidden,false);assert.equal(fresh.context.document.activeElement,el('settingsTitle'));
 el('settingsBack').onclick();assert.equal(el('menu').hidden,false);assert.equal(fresh.context.document.activeElement,el('menuTitle'));
 el('continueGame').onclick();assert.equal(el('camp').hidden,false);assert.equal(fresh.context.document.activeElement,el('campTitle'));
 ui.showTab('collection');menu.openMainMenu();assert.equal(el('continueGame').textContent,'Continue');el('continueGame').onclick();assert.equal(el('collection').hidden,false);
 menu.openMainMenu();el('openHelp').onclick();assert(el('helpDialog').open);el('guideToggle').onclick();assert(!el('helpDialog').open);assert(el('menu').hidden);assert(ns(fresh,'storage').s.guide.enabled,'guide enabled from menu reaches a visible game screen');
 console.log('PASS quiet initial menu, Play/Continue, settings/back/focus, last-screen return and visible tutorial');

 for(const language of ['uk','en'])for(const fixture of golden.fixtures){
  const setup=e=>e.store.set('last-signal-language',language),r=await startMenu(fixture.saved,setup);
  const baseline=await newRun(fixture.saved);assert.deepEqual(r.state(),baseline.state(),language+' '+fixture.name+' state');assert.equal(r.catalog(),baseline.catalog(),'translation never mutates catalogue values');
  assert(!r.elements.get('excavate').open);assert(!r.elements.get('packDialog').open);
  if(r.state().pending){
   r.elements.get('openHelp').onclick();assert(r.elements.get('helpDialog').open);assert(r.elements.get('guideToggle').disabled);r.elements.get('helpDialog').close();
   r.elements.get('openSettings').onclick();assert(!r.elements.get('settings').hidden);r.elements.get('settingsBack').onclick();
  }
  r.elements.get('continueGame').onclick();
  if(r.state().pending)assert(r.elements.get(r.state().pending.revealed?'packDialog':'excavate').open,'pending find resumes only after Continue');
 }
 console.log('PASS both languages with every legacy fixture; unchanged saves/catalogue; hidden/revealed finds resume on Continue');

 const r=await startMenu(),locale=ns(r,'i18n');let reloads=0;r.context.location={reload(){reloads++;}};
 const state=JSON.stringify(r.state());r.elements.get('language').onchange({target:{value:'uk'}});assert.equal(reloads,1);assert.equal(r.store.get(locale.LANGUAGE_KEY),'uk');assert.equal(JSON.stringify(r.state()),state);
 const restored=await newRun(r.store.get('last-signal-v1'),false,e=>{for(const [k,v]of r.store)e.store.set(k,v);},{start:false});assert.equal(ns(restored,'i18n').language,'uk');assert.deepEqual(restored.state(),r.state());
 r.elements.get('language').onchange({target:{value:'xx'}});assert.equal(reloads,1);
 const blocked=await newRun(null,true,null,{start:false});blocked.context.location={reload(){throw Error('must not reload');}};blocked.elements.get('language').onchange({target:{value:'en'}});assert.equal(blocked.elements.get('language').value,'uk');assert.match(blocked.elements.get('languageNote').textContent,/резервну копію/);
 const prefBlocked=await startMenu();let prefReloads=0;prefBlocked.context.location={reload(){prefReloads++;}};const write=prefBlocked.context.localStorage.setItem;prefBlocked.context.localStorage.setItem=(k,v)=>{if(k===locale.LANGUAGE_KEY)throw Error('quota');write(k,v);};prefBlocked.elements.get('language').onchange({target:{value:'uk'}});assert.equal(prefReloads,0);assert.equal(prefBlocked.elements.get('language').value,'en');assert.match(prefBlocked.elements.get('languageNote').textContent,/browser/i);
 const invalid=await startMenu(null,e=>e.store.set('last-signal-language','__proto__'));assert.equal(ns(invalid,'i18n').language,'uk');
 console.log('PASS language preference/reload, unchanged game state, invalid values and save/preference write failures');

 const translated=locale.translateHTML('<option value="10 копійок" data-name="Україна" title="10 копійок">10 копійок</option>');
 assert.match(translated,/value="10 копійок" data-name="Україна"/);assert.match(translated,/title="10 kopiiok">10 kopiiok<\/option>/);
 assert.equal(locale.dateLocale(),'en-GB');
 const html=fs.readFileSync(root+'/index.html','utf8');
 const phraseModule=r.modules.get(root+'/locales/en.js').namespace.phrases;
 const preserved=Object.entries(phraseModule).filter(([uk,en])=>uk===en).map(([uk])=>uk).sort((a,b)=>b.length-a.length);
 function english(value,where){
  let text=String(value).replace(/<[^>]*>/g,'');for(const code of preserved)text=text.split(code).join('');
  assert(!/[А-Яа-яІіЇїЄєҐґ]/.test(text),where+': '+text.slice(0,350));
 }
 for(const [uk,en] of Object.entries(phraseModule)){assert.equal(locale.t(uk),en,'exact phrase '+uk);english(en,'translation');}
 for(const match of html.matchAll(/>([^<>]+)</g))english(locale.t(match[1]),'static text');
 for(const match of html.matchAll(/(?:aria-label|title|placeholder|alt)="([^"]*)"/g))english(locale.t(match[1]),'static accessible label');
 // Exercise the actual one-time walk, including protected language autonyms.
 const nodes=[{nodeValue:'Налаштування',parentElement:{closest:()=>null}},{nodeValue:'Українська',parentElement:{closest:()=>({})}}];
 r.store.set(locale.LANGUAGE_KEY,'en');r.context.document.body={};r.context.document.createTreeWalker=()=>{let i=0;return {nextNode:()=>nodes[i++]||null};};locale.initLocale();assert.equal(nodes[0].nodeValue,'Settings');assert.equal(nodes[1].nodeValue,'Українська');
 console.log('PASS static UK/EN copy and labels, initial text walk, autonyms, canonical option/data attributes and date locale');

 const game=await newRun(null,false,enSetup),m=n=>ns(game,n),s=m('storage').s;
 const check=where=>{for(const [id,e]of game.elements)for(const key of ['textContent','innerHTML','aria-label','title'])if(e[key])english(e[key],where+' '+id+' '+key);};
 for(const tab of ['menu','settings','camp','gear','inventory','collection','journal','atlas']){m('ui').showTab(tab);check(tab);}
 const types=JSON.parse(game.catalog()).map((value,id)=>({...value,id}));s.collection=types.filter(v=>v.kind!=='trash').map(v=>v.id);s.best=Object.fromEntries(s.collection.map(id=>[id,92]));
 // Inspect every catalogue entry; inscriptions and formal die-variety codes keep their original spelling.
 for(const item of types){m('collection').showItem(item.id);check('item '+item.id);game.elements.get('coinDetail').close();}
 s.bag=types.slice(0,8).map(v=>({type:v.id,condition:82}));m('ui').showTab('inventory');check('inventory cards');s.bag=[];
 m('camp').depart();game.elements.get('modal').close();m('ui').showTab('search');check('field');
 const target=s.objects.find(o=>!o.dug);s.x=target.x;s.y=target.y;m('search').dig();check('excavation');m('excavation').collectPending();check('packing');m('packing').resolvePacking('take');m('camp').returnHome();check('return');
 m('ui').showTab('search');game.elements.get('modal').close();m('menu').openMainMenu();assert.equal(game.elements.get('weatherLayer').dataset.running,'false');
 const before=JSON.stringify(game.state());for(let i=0;i<1200;i++)m('i18n').t('Стан '+i);assert.equal(JSON.stringify(game.state()),before,'translation cache has no game effects');
 console.log('PASS every screen, catalogue details, inventory, dig/pack/return, English human labels, original coin codes and paused menu weather');
})().catch(error=>{console.error(error);process.exit(1)});
