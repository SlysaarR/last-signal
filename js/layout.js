import { t as localize } from './i18n.js?v=0.55.2';
import { $ } from './dom.js?v=0.55.2';

// Presentation only: panes and pages never enter the game save.
export const panes = {
  camp:['ready','goals','report'],
  inventory:['bag','stash','food','pantry'],
  gear:['detector','shovel','backpack','food'],
  collection:['catalogue','sets','progress'],
  journal:['career','orders','goals','history'],
  atlas:['map','sites','scout'],
  settings:['general','display','offline','backup']
};
const selected = Object.fromEntries(Object.entries(panes).map(([screen,keys])=>[screen,keys[0]]));
export const pageState = Object.create(null);
let revision=0, refresh=()=>{};
export const layoutRevision=()=>revision;
export const currentPane=screen=>selected[screen];
export function setPane(screen,key) {
  if(!panes[screen]?.includes(key))return false;
  selected[screen]=key;$(screen).dataset.paneView=key;
  for(const name of panes[screen]) $(screen+'Pane-'+name).hidden=name!==key;
  document.querySelectorAll('[data-pane]').forEach(button=>{
    if(button.dataset.pane.startsWith(screen+':'))button.setAttribute('aria-pressed',String(button.dataset.pane===screen+':'+key));
  });
  return true;
}
export function pageCapacity(kind) {
  const width=window.innerWidth||360,height=window.innerHeight||640;
  const scaled=document.documentElement.dataset.textSize!=='normal';
  if(kind==='inventory')return !scaled&&width>=960&&height>=680?4:!scaled&&height>=800?2:1;
  if(kind==='collection')return scaled?2:width>=960&&height>=680?12:height>=800?6:height>=680?4:2;
  return 1;
}
export function pageWindow(id,items,{size=1,key='',initial=0}={}) {
  let state=pageState[id];
  if(!state||state.key!==key)state=pageState[id]={index:initial,key,size,total:items.length};
  state.size=size;state.total=items.length;
  const pages=Math.max(1,Math.ceil(items.length/size));state.index=Math.max(0,Math.min(state.index,pages-1));
  $(id+'Pager').hidden=pages===1;
  $(id+'Page').textContent=localize('Сторінка '+(state.index+1)+' / '+pages);
  $(id+'Prev').disabled=state.index===0;$(id+'Next').disabled=state.index===pages-1;
  return items.slice(state.index*size,(state.index+1)*size);
}
export function resetPage(id,index=0) {
  if(pageState[id])pageState[id].index=index;
  revision++;
}
export function refreshLayout(){revision++;refresh();}
export function initLayout(render,canOpen=()=>true,syncEffects=()=>{}) {
  refresh=render;
  document.querySelectorAll('[data-sheet]').forEach(button=>{
    const sheet=$(button.dataset.sheet);
    button.onclick=()=>{if(!canOpen())return;sheet.showModal();syncEffects();};
    sheet.addEventListener('close',syncEffects);
  });
  for(const [screen]of Object.entries(panes))setPane(screen,selected[screen]);
  document.querySelectorAll('[data-pane]').forEach(button=>button.onclick=()=>{
    const [screen,key]=button.dataset.pane.split(':');setPane(screen,key);refresh();
  });
  for(const id of ['catalogue','sets','career','orders','goals','history','sites','routes','albumProgressList','foodShopList','visited'])for(const [suffix,delta]of [['Prev',-1],['Next',1]])$(id+suffix).onclick=()=>{
    const state=pageState[id];if(!state)return;
    state.index=Math.max(0,Math.min(state.index+delta,Math.max(0,Math.ceil(state.total/state.size)-1)));
    revision++;refresh();
  };
  let dimensions=(window.innerWidth||360)+':'+(window.innerHeight||640);
  window.addEventListener('resize',()=>{
    const next=(window.innerWidth||360)+':'+(window.innerHeight||640);
    if(next===dimensions)return;dimensions=next;revision++;refresh();
  });
}
