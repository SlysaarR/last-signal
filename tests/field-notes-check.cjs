const {newRun,root,assert}=require('./harness.cjs');
(async()=>{
 const r=await newRun(),m=name=>r.modules.get(root+'/js/'+name+'.js').namespace;
 const s=m('storage').s,notes=m('field-notes'),ui=m('ui'),field=m('graphics/field'),el=id=>r.elements.get(id);
 assert.equal(s.fieldMarks,undefined);assert(!notes.toggleFieldMark(),'camp guard');
 s.atCamp=false;m('world').generate();ui.showTab('search');
 const fixed=JSON.stringify([s.coins,s.energy,s.objects,s.bag,s.best,s.orders]);
 for(let i=0;i<8;i++){s.x=.1+(i%4)*.23;s.y=i<4?.2:.75;assert(notes.toggleFieldMark());}
 assert.equal(s.fieldMarks.length,8);s.x=.5;s.y=.5;ui.renderDetector();assert(el('markSpot').disabled);assert(!notes.toggleFieldMark(),'bounded marker count');
 const marked=s.fieldMarks[0];s.x=marked.x;s.y=marked.y;ui.renderDetector();assert(!el('markSpot').disabled);assert(notes.toggleFieldMark());assert.equal(s.fieldMarks.length,7);
 s.x=.4;s.y=.3;s.pending={type:0,condition:30};assert(!notes.toggleFieldMark(),'pending guard');s.pending=null;
 el('openFieldNotes').onclick();assert(el('fieldNotes').open);assert(ui.busy());assert(!notes.toggleFieldMark(),'dialog guard');
 const marker=s.fieldMarks[2];el('fieldNoteList').listeners.click[0]({target:{closest:selector=>selector==='[data-marker-go]'?{dataset:{markerGo:'2'}}:null}});
 assert.equal(s.x,marker.x);assert.equal(s.y,marker.y);assert(!el('fieldNotes').open);
 assert(el('log').textContent.includes('мітки 3'));
 el('openFieldNotes').onclick();el('fieldNoteList').listeners.click[0]({target:{closest:selector=>selector==='[data-marker-remove]'?{dataset:{markerRemove:'2'}}:null}});
 assert.equal(s.fieldMarks.length,6);assert(el('fieldNotes').open);assert(el('fieldNotesStatus').textContent.includes('Мітку 3 прибрано'));assert(el('fieldNotesStatus').textContent.includes('6 / 8'));
 el('fieldNotes').close();el('openFieldNotes').onclick();assert.equal(el('fieldNotesStatus').textContent,'','new session clears old action feedback');el('fieldNotes').close();
 assert.equal(JSON.stringify([s.coins,s.energy,s.objects,s.bag,s.best,s.orders]),fixed,'marks never reveal or alter loot, money, energy or orders');
 const saved=r.store.get('last-signal-v1'),again=await newRun(saved);assert.deepEqual(again.state().fieldMarks,JSON.parse(JSON.stringify(s.fieldMarks)));
 const copy=m('backup-format').parseBackup(m('backup-format').createBackup(s));assert.deepEqual(JSON.parse(JSON.stringify(copy.state.fieldMarks)),again.state().fieldMarks);
 // Cached holes and marks must not be traversed again when only the coil moves.
 s.holes=[{x:.2,y:.2}];field.draw();
 Object.defineProperty(s.holes,Symbol.iterator,{value:()=>{throw Error('Holes traversed on a cached frame');},configurable:true});
 Object.defineProperty(s.fieldMarks,'entries',{value:()=>{throw Error('Marks traversed on a cached frame');},configurable:true});
 for(let i=0;i<30;i++){s.x=.2+i*.015;field.draw();}
 delete s.holes[Symbol.iterator];delete s.fieldMarks.entries;
 let overlays=0;const baseEntries=s.fieldMarks.entries.bind(s.fieldMarks);
 s.fieldMarks.entries=()=>{overlays++;return baseEntries();};s.holes.push({x:.7,y:.5});field.draw();assert.equal(overlays,1,'dig rebuilds overlay once');field.draw();assert.equal(overlays,1);
 s.holes=s.holes.map(p=>({...p}));field.draw();assert.equal(overlays,2,'restore with equal length refreshes overlay');
 const previousRect=el('field').getBoundingClientRect;el('field').getBoundingClientRect=()=>({width:300,height:500});field.draw();assert.equal(overlays,3,'resize refreshes overlay');el('field').getBoundingClientRect=previousRect;
 delete s.fieldMarks.entries;
 const oldSite=JSON.stringify(s.site);m('world').generate();assert.equal(s.fieldMarks.length,0,'new site clears old marks');assert.equal(JSON.stringify(s.site),oldSite,'same descriptor is deterministic');
 s.x=.4;s.y=.4;assert(notes.toggleFieldMark());const keys=el('field').listeners.keydown[0];
 keys({key:'m',code:'KeyM',repeat:true,preventDefault(){}});assert.equal(s.fieldMarks.length,1,'holding shortcut cannot flicker/remove mark');
 keys({key:'m',code:'KeyM',repeat:false,preventDefault(){}});assert.equal(s.fieldMarks.length,0);
 m('camp').returnHome();assert.equal(s.fieldMarks,undefined);assert.equal(s.site,undefined);
 console.log('PASS 8 manual marks, remove/return, pending/dialog/camp guards, keyboard repeat, saved and portable marks, no loot effects; 30 cached movements skip holes/marks, dig/restore/resize invalidate; departure clears notes');
})().catch(e=>{console.error(e);process.exit(1)});
