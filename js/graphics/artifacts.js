import { createInspectionModel, drawInspection } from './inspection.js?v=0.55.1';
// Procedural find artwork. Coin wreath reference: https://museum.mincult.gov.ua/collections/moneta-25-kopiyok-1992-r-125364
import { types } from '../../data/items.js?v=0.55.1';
import { $ } from '../dom.js?v=0.55.1';
import { s } from '../storage.js?v=0.55.1';
export function seededArt(seed) {
  let n = Math.abs(seed | 0) + 1;
  return () => {
    n = n * 16807 % 2147483647;
    return n / 2147483647;
  };
}
export function drawArtifact(type, target, condition, studio = false, side = 0) {
  const art = target || $('artifact').getContext('2d');
  condition = condition ?? s.pending?.condition ?? 70;
  drawInspection(art, createInspectionModel(types[type], condition), side === 1 ? Math.PI : side === 2 ? Math.PI / 2 : 0, 0, studio);
}
