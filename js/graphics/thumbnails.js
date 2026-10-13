import { types } from '../../data/items.js?v=0.39.0';
import { createInspectionModel, drawInspection } from './inspection.js?v=0.39.0';
const cache=new Map(),waiting=new Set();
function paint(canvas){
 const type=Number(canvas.dataset.artifact),condition=Number(canvas.dataset.condition),key=type+':'+condition;
 if(canvas.dataset.rendered===key)return;
 let art=cache.get(key);
 if(!art){
   art=document.createElement('canvas');art.width=160;art.height=140;
   drawInspection(art.getContext('2d'),createInspectionModel(types[type],condition),.16,.16,true,160,140);
   cache.set(key,art);if(cache.size>48)cache.delete(cache.keys().next().value);
 }
 const c=canvas.getContext('2d');c.clearRect(0,0,160,140);c.drawImage(art,0,0);canvas.dataset.rendered=key;
}
const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{
 for(const entry of entries)if(entry.isIntersecting){paint(entry.target);observer.unobserve(entry.target);waiting.delete(entry.target);}
},{rootMargin:'160px'});
export function artifactMarkup(type,condition){
 return `<canvas class="coin-thumb artifact-thumb" width="160" height="140" data-artifact="${type}" data-condition="${condition}" role="img" aria-label="${types[type].name}, стан ${condition} зі 100"></canvas>`;
}
export function renderArtifactThumbnails(){
 for(const old of waiting)if(!old.isConnected){observer.unobserve(old);waiting.delete(old);}
 document.querySelectorAll('canvas[data-artifact]').forEach(canvas=>{
   if(canvas.dataset.rendered===canvas.dataset.artifact+':'+canvas.dataset.condition)return;
   if(observer){observer.observe(canvas);waiting.add(canvas);}else paint(canvas);
 });
}
