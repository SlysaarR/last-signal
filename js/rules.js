// rules responsibilities for Last Signal.
import { foods, rarities } from '../data/balance.js?v=0.26.0';
import { types } from '../data/items.js?v=0.26.0';
import { s } from './storage.js?v=0.26.0';
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
export function maxEnergy(level = s.level) {
  return 100 + Math.round((level - 1) * 100 / 99);
}
export function shovelFactor(level = s.shovel) {
  return 1 - .3 * (level - 1) / 99;
}
export function digCost(base) {
  return Math.round(base * shovelFactor() * 10) / 10;
}
export function minDig() {
  return digCost(5);
}
export function upgradeCost(kind) {
  const level = kind === 'detector' ? s.level : kind === 'backpack' ? s.backpack : s.shovel;
  return Math.round(30 + level * (kind === 'detector' ? 8 : 6) + level * level * .1);
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
  return 8 + Math.floor((level - 1) * 32 / 99);
}
export function bagUsed() {
  return s.bag.length + s.food.reduce((a, b) => a + b, 0);
}
export function emergencyAllowed() {
  return s.atCamp && s.coins < 25 && !s.pending;
}
export function canLeave() {
  return !s.pending && (s.coins >= 25 || emergencyAllowed());
}
