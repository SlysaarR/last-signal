import { capacityAt, detectorAt, energyLimit, shovelAt, upgradePrice } from '../data/gear.js?v=0.42.0';
import { chosenRoute, conditions } from '../data/expeditions.js?v=0.42.0';
// rules responsibilities for Last Signal.
import { foods, rarities } from '../data/balance.js?v=0.42.0';
import { types } from '../data/items.js?v=0.42.0';
import { s } from './storage.js?v=0.42.0';
export function rollCondition() {
  return Math.floor(Math.random() * 101);
}
export function priceFor(type, condition) {
  const t = types[type];
  return Math.round(t.price * rarities[t.rarity].factor * (.1 + .9 * condition / 100));
}
export function conditionLabel(c) {
  return c < 20 ? 'Майже знищений' : c < 45 ? 'Поганий' : c < 70 ? 'Задовільний' : c < 90 ? 'Добрий' : 'Відмінний';
}
export function maxEnergy() {
  return energyLimit(s);
}
export function detectorStats(level = s.level) { return detectorAt(level); }
export function shovelFactor(level = s.shovel) {
  return shovelAt(level);
}
export function digCost(base) {
  return Math.round(base * shovelFactor() * (conditions[s.progress?.active?.condition]?.factor || 1) * 10) / 10;
}
export function minDig() {
  return digCost(5);
}
export function upgradeCost(kind) {
  return upgradePrice(s,kind);
}
export function foodAmount(i) {
  return Math.floor(maxEnergy() * foods[i].percent / 100);
}
export function foodFits(i) {
  return s.foodUsed + foods[i].percent <= 50 && s.energy + foodAmount(i) <= maxEnergy() + .001;
}
export function foodAvailable() {
  return foods.some((f, i) => foodFits(i) && s.food[i] > 0);
}
export function bagCapacity(level = s.backpack) {
  return capacityAt(level);
}
export function bagUsed() {
  return s.bag.length + s.food.reduce((a, b) => a + b, 0);
}
export function emergencyAllowed() {
  return s.atCamp && s.coins < 25 && !s.pending;
}
export function travelCost() { return emergencyAllowed()?0:chosenRoute(s).cost; }
export function canLeave() {
  return !s.pending && (s.coins >= travelCost());
}

