import { types } from '../data/items.js?v=0.41.0';
import { createInspectionModel, drawInspection } from './graphics/inspection.js?v=0.41.0';
import { onCoinImagesReady } from './graphics/coin-reference.js?v=0.41.0';
import { inspectionLightNames } from './graphics/inspection-light.js?v=0.41.0';
const viewers=new WeakMap(),TAU=Math.PI*2;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function clearInspection(canvas) {
  viewers.get(canvas)?.dispose();viewers.delete(canvas);
}
// All gestures and condition previews belong to the view, never the saved find.
export function setupInspection(canvas,button,type,condition,studio=true) {
  clearInspection(canvas);
  const item=types[type];let model=createInspectionModel(item,condition),dirty=false;
  let yaw=0,pitch=0,zoom=1,light=0,pan=[0,0],frame=0,disposed=false;
  const pointers=new Map(),get=suffix=>document.getElementById(canvas.id+suffix);
  const controls={tools:get('Tools'),out:get('ZoomOut'),value:get('ZoomValue'),in:get('ZoomIn'),flip:get('Turn'),light:get('Light')};
  controls.tools.hidden=false;
  button.hidden=true;button.textContent='↺';button.title='Початковий ракурс, масштаб і світло';
  button.setAttribute('aria-label','Повернути початковий ракурс, масштаб і світло');
  canvas.onclick=null;canvas.tabIndex=0;canvas.setAttribute('role','img');
  canvas.style.touchAction='none';canvas.style.cursor='grab';
  const label=()=>canvas.setAttribute('aria-label',`${item.name} · стан ${condition} зі 100. Обертай одним пальцем або стрілками. Двома пальцями — масштаб і зсув. Плюс і мінус — масштаб; F — перевернути; L — світло; Home — початковий вигляд.`);
  const boundPan=()=>{pan=pan.map(v=>clamp(v,-.42*(zoom-1),.42*(zoom-1)));};
  const render=()=>{
    frame=0;if(disposed)return;
    if(dirty){model=createInspectionModel(item,condition);dirty=false;}
    drawInspection(canvas.getContext('2d'),model,yaw,pitch,studio,canvas.width,canvas.height,zoom,light,pan);
    button.hidden=Math.abs(Math.sin(yaw/2))+Math.abs(Math.sin(pitch/2))+Math.abs(zoom-1)+Math.hypot(...pan)+light<.001;
    canvas.dataset.yaw=String(yaw);canvas.dataset.pitch=String(pitch);canvas.dataset.zoom=String(zoom);canvas.dataset.light=String(light);canvas.dataset.pan=pan.join(',');
    controls.value.textContent=Math.round(zoom*100)+'%';controls.out.disabled=zoom<=1;controls.in.disabled=zoom>=2.5;
    controls.light.textContent='Світло '+['↖','↗','↑'][light];controls.light.setAttribute('aria-label','Світло '+inspectionLightNames[light]+'. Змінити напрямок');
  };
  const schedule=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(render);};
  const stopImages=onCoinImagesReady(()=>{dirty=true;schedule();});
  const reset=()=>{yaw=0;pitch=0;zoom=1;light=0;pan=[0,0];canvas.focus?.({preventScroll:true});schedule();};
  const magnify=factor=>{zoom=clamp(zoom*factor,1,2.5);boundPan();schedule();};
  const flip=()=>{yaw=Math.cos(yaw)*Math.cos(pitch)>=0?Math.PI:0;pitch=0;schedule();};
  const lamp=()=>{light=(light+1)%inspectionLightNames.length;schedule();};
  const end=e=>{
    if(!pointers.has(e.pointerId))return;
    pointers.delete(e.pointerId);
    if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor=pointers.size?'grabbing':'grab';
  };
  canvas.onpointerdown=e=>{
    if(pointers.size>=2||e.button!==undefined&&e.button!==0)return;
    e.preventDefault();pointers.set(e.pointerId,[e.clientX,e.clientY]);
    canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';
  };
  canvas.onpointermove=e=>{
    const last=pointers.get(e.pointerId);if(!last)return;
    e.preventDefault();const rect=canvas.getBoundingClientRect(),width=Math.max(160,rect.width),height=Math.max(160,rect.height);
    if(pointers.size===1) {
      const speed=TAU/width;yaw=(yaw+(e.clientX-last[0])*speed)%TAU;pitch=(pitch+(e.clientY-last[1])*speed)%TAU;
    } else {
      const other=[...pointers.entries()].find(([id])=>id!==e.pointerId)[1];
      const oldDistance=Math.hypot(last[0]-other[0],last[1]-other[1]);
      const distance=Math.hypot(e.clientX-other[0],e.clientY-other[1]);
      if(oldDistance>=16&&distance>=16)zoom=clamp(zoom*distance/oldDistance,1,2.5);
      pan[0]+=(e.clientX-last[0])/width/2;pan[1]+=(e.clientY-last[1])/height/2;boundPan();
    }
    pointers.set(e.pointerId,[e.clientX,e.clientY]);schedule();
  };
  canvas.onpointerup=end;canvas.onpointercancel=end;canvas.onlostpointercapture=end;
  canvas.onkeydown=e=>{
    const steps={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,-.12],ArrowDown:[0,.12]};
    if(steps[e.key]){e.preventDefault();yaw=(yaw+steps[e.key][0])%TAU;pitch=(pitch+steps[e.key][1])%TAU;schedule();}
    else if(e.key==='Home'){e.preventDefault();reset();}
    else if(['+','=','-','_','f','F','l','L'].includes(e.key)){
      e.preventDefault();if(['+','='].includes(e.key))magnify(1.25);else if(['-','_'].includes(e.key))magnify(1/1.25);else if(e.key.toLowerCase()==='f')flip();else lamp();
    }
  };
  controls.out.onclick=()=>magnify(1/1.25);controls.in.onclick=()=>magnify(1.25);controls.flip.onclick=flip;controls.light.onclick=lamp;
  button.onclick=reset;
  const viewer={
    setCondition(value){condition=value;dirty=true;label();schedule();},reset,
    dispose(){
      disposed=true;stopImages();if(frame)cancelAnimationFrame(frame);
      for(const pointerId of [...pointers.keys()])end({pointerId});
      for(const key of ['onclick','onkeydown','onpointerdown','onpointermove','onpointerup','onpointercancel','onlostpointercapture'])canvas[key]=null;
      for(const key of ['out','in','flip','light'])controls[key].onclick=null;
      controls.tools.hidden=true;canvas.style.cursor='';canvas.style.touchAction='';button.onclick=null;button.hidden=true;
    },
  };
  viewers.set(canvas,viewer);label();render();return viewer;
}
