import { types } from '../data/items.js?v=0.24.0';
import { canFlipCoin } from './graphics/ukrainian-coins.js?v=0.24.0';
import { drawArtifact } from './graphics/artifacts.js?v=0.24.0';
// View-only state: flipping never changes the find or save data.
export function setupCoinFlip(canvas, button, type, condition, studio=true, onFlip=()=>{}) {
  const enabled=canFlipCoin(types[type]);let side=0;
  button.hidden=!enabled;
  const label=()=> {
    const names=['номінал','герб і рік','гурт'];
    button.textContent='↻ '+names[side]+' · далі '+names[(side+1)%3];
    button.setAttribute('aria-label','Показати: '+names[(side+1)%3]);
    canvas.setAttribute('aria-label',types[type].name + (' · '+names[side]));
    canvas.style.cursor=enabled?'pointer':'';
  };
  const flip=()=>{if(!enabled)return;side=(side+1)%3;drawArtifact(type,canvas.getContext('2d'),condition,studio,side);label();onFlip(side);};
  button.onclick=flip;canvas.onclick=enabled?flip:null;label();
  return flip;
}
