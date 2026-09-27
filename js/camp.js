// camp responsibilities for Last Signal.
import { modal } from './dialogs.js?v=0.16.0';
import { $ } from './dom.js?v=0.16.0';
import { canLeave, emergencyAllowed, maxEnergy, priceFor } from './rules.js?v=0.16.0';
import { s, save } from './storage.js?v=0.16.0';
import { busy, render, showTab } from './ui.js?v=0.16.0';
import { currentLocation, generate, rollLocation } from './world.js?v=0.16.0';
export function returnHome() {
  if (s.atCamp || s.pending) return;
  s.lastTrip = {
    found: s.found,
    brought: s.bag.length,
    value: s.bag.reduce((sum, item) => sum + priceFor(item.type, item.condition), 0),
    travel: s.travelSpent,
    food: s.foodSpent
  };
  s.atCamp = true;
  s.objects = [];
  s.holes = [];
  save();
  showTab('camp');
}
export function showArrival() {
  const loc = currentLocation();
  modal('НОВА ДІЛЯНКА', loc.icon, loc.name, s.energy + ' сил. Слухай металошукач і вирішуй, де копати.', 'Почати пошук');
}
export function depart() {
  if (!canLeave()) return;
  const fromCamp = s.atCamp,
    emergency = emergencyAllowed();
  if (fromCamp) {
    s.travelSpent = 0;
    s.foodSpent = 0;
    s.found = 0;
    s.earned = 0;
    s.foodUsed = 0;
  }
  if (!emergency) {
    s.coins -= 25;
    s.travelSpent += 25;
  }
  s.day++;
  s.atCamp = false;
  s.x = .5;
  s.y = .52;
  s.emergency = emergency;
  s.location = emergency ? 0 : rollLocation();
  generate();
  save();
  showTab('search');
  $('log').textContent = 'Нова ділянка. Залишок сил: ' + s.energy + '.';
  showArrival();
}
export function confirmDeparture() {
  if (!canLeave() || busy()) return;
  modal('ВИРУШИТИ?', '⛺', emergencyAllowed() ? 'Бідне узбіччя' : 'Нова випадкова ділянка', (emergencyAllowed() ? 'Безкоштовний виїзд на бідне узбіччя.' : 'Вартість: 25 купонів.') + ' Енергія: ' + s.energy + '. Дорога не відновлює сили. Стару ділянку буде втрачено.', 'Вирушити', depart);
}
export function initCamp() {
  $('restHome').onclick = () => {
    if (!s.atCamp || busy()) return;
    s.energy = maxEnergy();
    s.foodUsed = 0;
    save();
    render();
  };
  $('returnHome').onclick = () => {
    if (busy() || s.atCamp) return;
    modal('ПОВЕРНУТИСЯ ДОДОМУ?', '🏠', 'Завершити виїзд', 'Повернення безкоштовне. Здобич у рюкзаку збережеться, але ділянку буде втрачено.', 'До табору', returnHome);
  };
  $('finish').onclick = confirmDeparture;
  $('startTrip').onclick = confirmDeparture;
}
