import { brushPoint } from '../../data/cleaning.js?v=0.46.0';
// Identical stamps during play and restore: no square holes or bitmap snapshots.
export function createSoilBrush(makeCanvas=()=>document.createElement('canvas')) {
  let brush,legacy;
  function stamp(radius,solid) {
    const canvas=makeCanvas();canvas.width=canvas.height=radius*2;
    const c=canvas.getContext('2d'),g=c.createRadialGradient(radius,radius,solid,radius,radius,radius);
    g.addColorStop(0,'#000');g.addColorStop(.75,'#000');g.addColorStop(1,'#0000');
    c.fillStyle=g;c.fillRect(0,0,radius*2,radius*2);return canvas;
  }
  function paint(c,mark) {
    brush??=stamp(64,42);const [x,y]=brushPoint(mark);c.drawImage(brush,x-64,y-64);
  }
  function restore(c,cleaning,cells=[]) {
    const base=cleaning?.base||cells;
    if(base.length) {
      legacy??=stamp(16,12);
      for(const cell of base)c.drawImage(legacy,180+(cell%16)*16-16,130+Math.floor(cell/16)*16-16);
    }
    for(const mark of cleaning?.marks||[])paint(c,mark);
  }
  return {paint,restore};
}
