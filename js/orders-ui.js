import { pageWindow, layoutRevision } from './layout.js?v=0.55.0';
import { t as localize, translateHTML } from './i18n.js?v=0.55.0';
import { orderOffers } from '../data/orders.js?v=0.55.0';
import { detectorFeatures } from '../data/gear.js?v=0.55.0';
import { $ } from './dom.js?v=0.55.0';
import { s } from './storage.js?v=0.55.0';
import { activeOrder, orderReady, acceptOrder, cancelOrder, claimOrder } from './orders.js?v=0.55.0';
import { modal } from './dialogs.js?v=0.55.0';
import { busy, render } from './ui.js?v=0.55.0';

function progressText(order) {
  return order.needs.map((need,i)=>`${need.label}: ${s.orders.active.counts[i]} / ${need.count}`).join(' · ');
}
export function renderOrderSummary(place) {
  const order=activeOrder(),ready=orderReady();
  if(place==='camp') $('campOrderHeading').textContent=localize(ready?'Польові замовлення · нагорода готова':'Польові замовлення');
  if(place==='camp') $('campOrderSummary').textContent=localize(order
    ?`${order.name} · ${ready?'Виконано · нагорода '+order.reward+' купонів':progressText(order)}`
    :'Обери одну з трьох цілей на наступні виїзди.');
  if(place==='search') {
    $('fieldOrder').hidden=!order;
    $('fieldOrderSummary').hidden=!order;
    $('fieldPanel').hidden=!order&&!detectorFeatures(s.level).pinpoint;
    $('fieldOrderSummary').dataset.ready=String(ready);
    if(order) {
      const done=s.orders.active.counts.reduce((sum,n)=>sum+n,0),total=order.needs.reduce((sum,need)=>sum+need.count,0);
      $('fieldOrderSummary').textContent=localize(ready?'Замовлення ✓':'Замовлення · '+done+' / '+total);
    }
    if(order)$('fieldOrderText').textContent=localize(order.name+' · '+(ready?'Виконано — забери нагороду в таборі':progressText(order)));
  }
}
let key='';
export function renderOrders() {
  const next=JSON.stringify([s.orders,s.atCamp,!!s.pending,layoutRevision()]);if(key===next)return;key=next;
  const order=activeOrder(),ready=orderReady(),canAct=s.atCamp&&!s.pending;
  $('orderCompleted').textContent=localize('Виконано замовлень: '+(s.orders?.completed||0));
  $('orderSummary').textContent=localize(order?(ready?'Замовлення виконано. '+(canAct?'Нагороду можна забрати нижче.':'Повернися до табору по нагороду.'):'Активне замовлення · без обмеження часу'):(canAct?'Обери одне замовлення. Після виконання з’явиться наступна трійка.':'Нове замовлення можна взяти після повернення до табору.'));
  $('orderCards').innerHTML=translateHTML(pageWindow('orders',order?[order]:orderOffers(s.orders?.completed||0),{key:(order?.id||'offers')+':'+(s.orders?.completed||0)}).map(offer=>{
    const meters=offer.needs.map((need,i)=>`<div class="order-need"><span>${need.label}</span><div class="goal-meter"><progress aria-label="${need.label}" value="${order?s.orders.active.counts[i]:0}" max="${need.count}"></progress><small>${order?s.orders.active.counts[i]:0} / ${need.count}</small></div></div>`).join('');
    const action=order?(ready?`<button class="primary" data-order-claim ${canAct?'':'disabled'}>Отримати ${offer.reward} купонів</button>`:`<button class="quiet" data-order-cancel ${canAct?'':'disabled'}>Скасувати замовлення</button>`):`<button class="secondary" data-order-accept="${offer.id}" ${canAct?'':'disabled'}>Взяти замовлення</button>`;
    return `<article class="goal-card order-card ${ready?'ready':''}"><div class="goal-head"><h3>${offer.name}</h3><span>+${offer.reward} куп.</span></div><p>${offer.text}</p>${meters}${action}</article>`;
  }).join(''));
}
function notice(text) {
  $('orderNotice').textContent=localize(text);render();$('orderSummary').focus?.({preventScroll:true});
}
export function initOrders() {
  $('orderCards').addEventListener('click',e=>{
    if(busy())return;
    const take=e.target.closest('[data-order-accept]');
    if(take){if(acceptOrder(take.dataset.orderAccept))notice('Замовлення прийнято. Зараховуються нові знахідки, які ти забереш у рюкзак.');return;}
    if(e.target.closest('[data-order-claim]')) {
      const reward=claimOrder(s.orders?.active);
      if(reward)notice(`Отримано ${reward} купонів. Знахідки залишаються тобі. Доступні нові замовлення.`);
      return;
    }
    if(e.target.closest('[data-order-cancel]')&&s.atCamp&&s.orders?.active) {
      const expected=s.orders.active;
      modal('СКАСУВАТИ ЗАМОВЛЕННЯ?', '↗', activeOrder().name, 'Прогрес цього замовлення буде скинуто. Знахідки залишаться тобі. Можна буде обрати з тієї самої трійки пропозицій.', 'Скасувати замовлення',()=>{
        if(!busy()&&cancelOrder(expected))notice('Замовлення скасовано. Можеш обрати інше.');
      });
    }
  });
}
