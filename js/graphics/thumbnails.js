import { types } from '../../data/items.js?v=0.53.0';
import { createInspectionModel, drawInspection } from './inspection.js?v=0.53.0';
import { createLazyThumbnails } from './lazy-thumbnails.js?v=0.53.0';
const cache=new Map();
function paint(canvas){
 const type=Number(canvas.dataset.artifact),condition=Number(canvas.dataset.condition),key=type+':'+condition;
 if(canvas.dataset.rendered===key)return;
 let art=cache.get(key);
 if(!art){
   art=document.createElement('canvas');art.width=160;art.height=140;
   drawInspection(art.getContext('2d'),createInspectionModel(types[type],condition),.16,.16,true,160,140);
   cache.set(key,art);if(cache.size>48)cache.delete(cache.keys().next().value);
 }
 canvas.width=160;canvas.height=140;
 const c=canvas.getContext('2d');c.clearRect(0,0,160,140);c.drawImage(art,0,0);canvas.dataset.rendered=key;
}
const thumbnails=createLazyThumbnails({selector:'canvas[data-artifact]',key:canvas=>canvas.dataset.artifact+':'+canvas.dataset.condition,paint});
export function artifactMarkup(type,condition){
 return `<canvas class="coin-thumb artifact-thumb" width="1" height="1" data-artifact="${type}" data-condition="${condition}" role="img" aria-label="${types[type].name}, стан ${condition} зі 100"></canvas>`;
}
export function renderArtifactThumbnails(){thumbnails.refresh();}
