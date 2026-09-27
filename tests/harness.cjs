// Headless module/startup and save-compatibility regression checks. No browser dependencies.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),original=fs.readFileSync(path.join(root,'index.html'),'utf8');
const golden=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures.json'),'utf8'));
const {createHash}=require('node:crypto');
const drawContext=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),getImageData:()=>({data:new Uint8ClampedArray(4)})},{get(t,k){return k in t?t[k]:(()=>{})}});
function env(saved,failStorage=false){
 const listeners={},elements=new Map(),data=[];let seed=12345;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647};
 class El{constructor(tag='div'){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.open=false;this.hidden=false;this.width=600;this.height=500;this.value='';this.textContent='';this.innerHTML='';this.disabled=false;this.classList={add(){},remove(){},toggle(){}};this.listeners={}}append(...xs){this.children.push(...xs)}appendChild(x){this.children.push(x);return x}replaceChildren(...xs){this.children=xs}addEventListener(k,f){(this.listeners[k]??=[]).push(f)}setAttribute(k,v){this[k]=v}getContext(){return drawContext}getBoundingClientRect(){return {width:360,height:300,left:0,top:0}}showModal(){this.open=true}close(){this.open=false}querySelector(){return new El()}setPointerCapture(){} }
 const staticHTML=original.split('<script>')[0];for(const id of [...staticHTML.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]))elements.set(id,new El());
 for(const m of staticHTML.matchAll(/<button[^>]*data-(tab|category|open)="([^"]+)"[^>]*>/g)){const e=new El('button');e.dataset[m[1]]=m[2];data.push(e)}
 for(const m of staticHTML.matchAll(/<button[^>]*data-close="([^"]+)"[^>]*>/g)){const e=new El('button');e.dataset.close=m[1];data.push(e)}
 const document={getElementById(id){assert(elements.has(id),'DOM id '+id);return elements.get(id)},createElement:tag=>new El(tag),querySelectorAll(sel){if(sel==='nav button')return data.filter(e=>e.dataset.tab);const key=sel.match(/data-(\w+)/)?.[1];return key?data.filter(e=>e.dataset[key]):[]}};
 const store=new Map(saved?[['last-signal-v1',saved]]:[]),localStorage={getItem(k){if(failStorage)throw Error('Storage disabled');return store.get(k)||null},setItem(k,v){if(failStorage)throw Error('Storage disabled');store.set(k,v)}};
 const context=vm.createContext({document,localStorage,console,Math:Object.assign(Object.create(Math),{random}),performance:{now:()=>1000},matchMedia:()=>({matches:true}),requestAnimationFrame:()=>1,cancelAnimationFrame(){},ResizeObserver:class{observe(){}},setTimeout,clearTimeout});
 context.window=context;context.addEventListener=(name,fn)=>{(listeners[name]??=[]).push(fn)};context.scrollTo=()=>{};
 return {context,elements,store,listeners};
}
async function newRun(saved,fail){const e=env(saved,fail),modules=new Map();function get(file){file=path.resolve(file);if(!modules.has(file))modules.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context:e.context,identifier:file}));return modules.get(file)}const main=get(root+'/js/main.js');await main.link((specifier,ref)=>get(path.resolve(path.dirname(ref.identifier),specifier.split('?')[0])));await main.evaluate();e.modules=modules;e.state=()=>JSON.parse(JSON.stringify(modules.get(root+'/js/storage.js').namespace.s));e.catalog=()=>JSON.stringify(modules.get(root+'/data/items.js').namespace.types);return e}

module.exports={newRun,root,golden,createHash,assert};
