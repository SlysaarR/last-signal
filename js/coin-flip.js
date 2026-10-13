import { types } from '../data/items.js?v=0.38.0';
import { createInspectionModel, drawInspection } from './graphics/inspection.js?v=0.38.0';
import { onCoinImagesReady } from './graphics/coin-reference.js?v=0.38.0';
const viewers=new WeakMap();
export function clearInspection(canvas) {
  viewers.get(canvas)?.dispose();viewers.delete(canvas);
}
// Inspection state belongs only to the view: dragging and wear previews never edit a save.
export function setupInspection(canvas,button,type,condition,studio=true) {
  clearInspection(canvas);
  const item=types[type];let model=createInspectionModel(item,condition),dirty=false;
  let yaw=0,pitch=0,pointer=null,last=null,frame=0,disposed=false;
  button.hidden=true;button.textContent='↺';button.title='Початковий ракурс';
  button.setAttribute('aria-label','Повернути початковий ракурс знахідки');
  canvas.onclick=null;canvas.tabIndex=0;canvas.setAttribute('role','img');
  canvas.style.touchAction='none';canvas.style.cursor='grab';
  const label=()=>canvas.setAttribute('aria-label',`${item.name} · стан ${condition} зі 100. Обертай перетягуванням або стрілками; Home — початковий ракурс.`);
  const render=()=>{
    frame=0;if(disposed)return;
    if(dirty){model=createInspectionModel(item,condition);dirty=false;}
    drawInspection(canvas.getContext('2d'),model,yaw,pitch,studio,canvas.width,canvas.height);
    button.hidden=Math.abs(Math.sin(yaw/2))+Math.abs(Math.sin(pitch/2))<.001;
    canvas.dataset.yaw=String(yaw);canvas.dataset.pitch=String(pitch);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(render);};
  const stopImages=onCoinImagesReady(()=>{dirty=true;schedule();});
  const reset=()=>{yaw=0;pitch=0;canvas.focus?.({preventScroll:true});schedule();};
  const end=e=>{
    if(e.pointerId!==pointer)return;
    if(canvas.hasPointerCapture?.(pointer))canvas.releasePointerCapture(pointer);
    pointer=null;last=null;canvas.style.cursor='grab';
  };
  canvas.onpointerdown=e=>{
    if(pointer!==null||e.button!==undefined&&e.button!==0)return;
    e.preventDefault();pointer=e.pointerId;last=[e.clientX,e.clientY];
    canvas.setPointerCapture(pointer);canvas.style.cursor='grabbing';
  };
  canvas.onpointermove=e=>{
    if(e.pointerId!==pointer||!last)return;
    e.preventDefault();const speed=Math.PI*2/Math.max(160,canvas.getBoundingClientRect().width);
    yaw+=(e.clientX-last[0])*speed;pitch+=(e.clientY-last[1])*speed;
    // Keep angles bounded without snapping between faces.
    yaw%=Math.PI*2;pitch%=Math.PI*2;last=[e.clientX,e.clientY];schedule();
  };
  canvas.onpointerup=end;canvas.onpointercancel=end;canvas.onlostpointercapture=end;
  canvas.onkeydown=e=>{
    const steps={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,-.12],ArrowDown:[0,.12]};
    if(steps[e.key]){e.preventDefault();yaw+=steps[e.key][0];pitch+=steps[e.key][1];schedule();}
    else if(e.key==='Home'){e.preventDefault();reset();}
  };
  button.onclick=reset;
  const viewer={
    setCondition(value){condition=value;dirty=true;label();schedule();},
    reset,
    dispose(){disposed=true;stopImages();if(frame)cancelAnimationFrame(frame);if(pointer!==null)end({pointerId:pointer});for(const key of ['onclick','onkeydown','onpointerdown','onpointermove','onpointerup','onpointercancel','onlostpointercapture'])canvas[key]=null;canvas.style.cursor='';canvas.style.touchAction='';button.onclick=null;},
  };
  viewers.set(canvas,viewer);label();render();return viewer;
}
