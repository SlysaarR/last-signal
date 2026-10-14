// Bounded visual brush history; cleanedCells remains the gameplay progress.
export const BRUSH_RADIUS=64,BRUSH_STEP=8,BRUSH_COLS=92,BRUSH_ROWS=80;
export const MAX_BRUSH_MARKS=BRUSH_COLS*BRUSH_ROWS;
export const cleaningPercent=count=>Math.min(100,Math.round(count/256/.78*100));
export const brushMark=(x,y)=>Math.round((y+BRUSH_RADIUS)/BRUSH_STEP)*BRUSH_COLS+Math.round((x+BRUSH_RADIUS)/BRUSH_STEP);
export const brushPoint=mark=>[(mark%BRUSH_COLS)*BRUSH_STEP-BRUSH_RADIUS,Math.floor(mark/BRUSH_COLS)*BRUSH_STEP-BRUSH_RADIUS];
// Clip captured-pointer travel before interpolation, including the feathered rim.
export function visitBrushSegment(from,to,visit) {
  if(![from.x,from.y,to.x,to.y].every(Number.isFinite))return;
  const dx=to.x-from.x,dy=to.y-from.y;
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
  let low=0,high=1;
  for(const [p,q] of [[-dx,from.x+64],[dx,664-from.x],[-dy,from.y+64],[dy,564-from.y]]) {
    if(p===0){if(q<0)return;continue;}
    const t=q/p;
    if(p<0)low=Math.max(low,t);else high=Math.min(high,t);
    if(low>high)return;
  }
  const x=from.x+dx*low,y=from.y+dy*low,sx=dx*(high-low),sy=dy*(high-low);
  const steps=Math.max(1,Math.ceil(Math.hypot(sx,sy)/12));
  for(let i=0;i<=steps;i++)if(visit(x+sx*i/steps,y+sy*i/steps)===false)break;
}
