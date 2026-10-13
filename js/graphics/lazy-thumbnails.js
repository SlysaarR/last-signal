// Keep expensive artwork near the viewport and yield between small batches.
// Registration is lazy so artwork modules also work in non-DOM renderers.
export function createLazyThumbnails({selector,key,paint}) {
  const tracked=new Set(),near=new Set(),pending=new Set();
  let observer=null,started=false,frame=0,scanFrame=0;
  const visible=canvas=>canvas.isConnected&&!canvas.closest('[hidden]');
  const awake=()=>document.visibilityState!=='hidden';
  function inView(canvas) {
    const rect=visible(canvas)?canvas.getBoundingClientRect():null;
    return rect&&rect.width>0&&rect.height>0&&rect.bottom>=-160&&rect.top<=window.innerHeight+160&&rect.right>=0&&rect.left<=window.innerWidth;
  }
  function forget(canvas) {
    observer?.unobserve(canvas);tracked.delete(canvas);near.delete(canvas);pending.delete(canvas);
  }
  function schedule() {
    if(pending.size&&awake()&&!frame)frame=requestAnimationFrame(flush);
  }
  function queue(canvas) {
    if(!canvas.isConnected){forget(canvas);return;}
    if(visible(canvas)&&canvas.dataset.rendered!==key(canvas))pending.add(canvas);
  }
  function flush() {
    frame=0;if(!awake()){pending.clear();return;}
    const start=performance.now();let count=0;
    for(const canvas of pending) {
      pending.delete(canvas);
      if(!canvas.isConnected){forget(canvas);continue;}
      if(!near.has(canvas)||!visible(canvas))continue;
      if(!observer&&!inView(canvas)){near.delete(canvas);continue;}
      const next=key(canvas);if(canvas.dataset.rendered===next)continue;
      paint(canvas);canvas.dataset.rendered=next;count++;
      // A single drawing can exceed the time target; never start a second then.
      if(count>=2||performance.now()-start>=6)break;
    }
    schedule();
  }
  function scan() {
    scanFrame=0;if(!awake())return;
    for(const canvas of tracked) {
      if(!canvas.isConnected){forget(canvas);continue;}
      if(inView(canvas)) {
        near.add(canvas);queue(canvas);
      } else {near.delete(canvas);pending.delete(canvas);}
    }
    schedule();
  }
  function scheduleScan() {
    if(tracked.size&&awake()&&!scanFrame)scanFrame=requestAnimationFrame(scan);
  }
  function invalidate() {
    if(!started||!awake())return;
    for(const canvas of near)queue(canvas);
    schedule();
  }
  function start() {
    if(started)return;started=true;
    if(typeof IntersectionObserver!=='undefined')observer=new IntersectionObserver(entries=>{
      for(const {target:canvas,isIntersecting} of entries) {
        if(!tracked.has(canvas))continue;
        if(!canvas.isConnected){forget(canvas);continue;}
        if(isIntersecting){near.add(canvas);queue(canvas);}
        else {near.delete(canvas);pending.delete(canvas);}
      }
      schedule();
    },{rootMargin:'160px 0px'});
    else {
      window.addEventListener('scroll',scheduleScan,{passive:true,capture:true});
      window.addEventListener('resize',scheduleScan,{passive:true});
    }
    document.addEventListener('visibilitychange',()=>{
      if(!awake()) {
        if(frame)cancelAnimationFrame(frame);
        if(scanFrame)cancelAnimationFrame(scanFrame);
        frame=scanFrame=0;pending.clear();
      } else if(observer)invalidate();else scheduleScan();
    });
  }
  function refresh() {
    start();
    for(const canvas of tracked)if(!canvas.isConnected)forget(canvas);
    for(const canvas of document.querySelectorAll(selector)) {
      if(!tracked.has(canvas)) {tracked.add(canvas);observer?.observe(canvas);}
      else if(near.has(canvas))queue(canvas);
    }
    if(observer)schedule();else scheduleScan();
  }
  return {refresh,invalidate};
}
