import { fieldOrders, orderOffers, matchesOrderNeed } from '../data/orders.js?v=0.45.0';
import { s, save } from './storage.js?v=0.45.0';

export function activeOrder() {
  return fieldOrders.find(order=>order.id===s.orders?.active?.id)||null;
}
export function orderReady() {
  const order=activeOrder();
  return !!order&&order.needs.every((need,i)=>s.orders.active.counts[i]===need.count);
}
export function acceptOrder(id) {
  if(!s.atCamp||s.pending||s.orders?.active)return false;
  const completed=s.orders?.completed||0,order=orderOffers(completed).find(order=>order.id===id);
  if(!order||completed===Number.MAX_SAFE_INTEGER)return false;
  s.orders={completed,active:{id,counts:order.needs.map(()=>0)}};
  save();return true;
}
export function cancelOrder(expected) {
  // Object identity also protects a confirmation opened before a backup restore.
  if(!s.atCamp||s.pending||!expected||s.orders?.active!==expected)return false;
  s.orders.active=null;save();return true;
}
export function claimOrder(expected) {
  if(!s.atCamp||s.pending||!expected||s.orders?.active!==expected||!orderReady())return 0;
  const reward=activeOrder().reward;
  if(s.orders.completed===Number.MAX_SAFE_INTEGER||s.coins+reward>Number.MAX_SAFE_INTEGER)return 0;
  s.orders.completed++;s.orders.active=null;s.coins+=reward;
  save();return reward;
}
export function recordOrderFind(item,kept) {
  const order=activeOrder();
  if(s.atCamp||!kept||!order)return false;
  const index=order.needs.findIndex((need,i)=>s.orders.active.counts[i]<need.count&&matchesOrderNeed(item,need));
  if(index<0)return false;
  s.orders.active.counts[index]++;
  // Packing saves this together with removing the pending find. Never save here.
  return true;
}
