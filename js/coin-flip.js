import { types } from '../data/items.js?v=0.23.1';
import { canFlipCoin } from './graphics/ukrainian-coins.js?v=0.23.1';
import { drawArtifact } from './graphics/artifacts.js?v=0.23.1';
// View-only state: flipping never changes the find or save data.
export function setupCoinFlip(canvas, button, type, condition, studio=true, onFlip=()=>{}) {
  const enabled=canFlipCoin(types[type]);let side=0;
  button.hidden=!enabled;
  const label=()=> {
    button.textContent=side ? '↻ Перевернути · зараз герб і рік' : '↻ Перевернути · зараз номінал';
    button.setAttribute('aria-pressed',String(!!side));
    canvas.setAttribute('aria-label',types[type].name + (side ? ' · герб і рік' : ' · номінал'));
    canvas.style.cursor=enabled?'pointer':'';
  };
  const flip=()=>{if(!enabled)return;side=1-side;drawArtifact(type,canvas.getContext('2d'),condition,studio,side);label();onFlip(side);};
  button.onclick=flip;canvas.onclick=enabled?flip:null;label();
  return flip;
}
