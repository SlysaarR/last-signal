// camp responsibilities for Last Signal.
import { modal } from './dialogs.js?v=0.26.0';
import { $ } from './dom.js?v=0.26.0';
import { bagCapacity, bagUsed, canLeave, emergencyAllowed, maxEnergy, priceFor } from './rules.js?v=0.26.0';
import { s, save } from './storage.js?v=0.26.0';
import { busy, render, showTab } from './ui.js?v=0.26.0';
import { currentLocation, generate, rollLocation } from './world.js?v=0.26.0';
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
export function departureWarnings() {
  const warnings = [];
  if (s.energy < maxEnergy() * .3) warnings.push('Мало енергії — ' + s.energy + ' / ' + maxEnergy() + '.');
  if (bagUsed() >= bagCapacity()) warnings.push('Рюкзак повний: нову знахідку доведеться залишити або замінити предмет.');
  return warnings;
}
export function renderCamp() {
  const food = s.food.reduce((sum, n) => sum + n, 0), free = Math.max(0, bagCapacity() - bagUsed());
  $('campStatus').textContent = s.atCamp ? 'Вдома · підготовка до наступного виїзду' : 'Ти в полі · табір доступний після повернення';
  $('campEnergy').textContent = s.energy + ' / ' + maxEnergy();
  $('campEnergyBar').value = s.energy;
  $('campEnergyBar').max = maxEnergy();
  $('campFood').textContent = food + ' порцій';
  $('campSpace').textContent = free + ' / ' + bagCapacity();
  $('campReadiness').textContent = !s.atCamp ? 'Для відпочинку та підготовки повернися через меню виїзду на екрані пошуку.' : departureWarnings().join(' ') || (food ? 'Спорядження готове. Можна вирушати.' : 'Їжі в рюкзаку немає. За бажанням візьми запас у майстерні.');
  $('restHome').disabled = !s.atCamp || s.energy === maxEnergy() || !!s.pending;
  $('restHome').textContent = s.energy === maxEnergy() ? 'Енергію відновлено' : 'Відпочити · безкоштовно';
  $('startTrip').disabled = !s.atCamp || !!s.pending;
  $('startTrip').textContent = s.coins < 25 ? 'На узбіччя · безкоштовно' : 'Вирушити · 25 купонів';
  $('departureNote').textContent = s.coins < 25 ? 'Коли купонів менше 25, доступне бідне узбіччя. Дорога не відновлює енергію.' : 'Випадкова ділянка. Після оплати залишиться ' + (s.coins - 25) + ' купонів. Дорога не відновлює енергію.';
  const trip = s.lastTrip;
  $('tripSummary').innerHTML = trip ? `<div class="trip-grid"><div><span>Знайдено</span><strong>${trip.found}</strong></div><div><span>Принесено предметів</span><strong>${trip.brought}</strong></div><div><span>Оцінка здобичі</span><strong>${trip.value}<small> купонів</small></strong></div><div><span>Витрати на виїзд</span><strong>${trip.travel + trip.food}<small> купонів</small></strong></div></div><p class="camp-note">Дорога: ${trip.travel} · з’їдена їжа: ${trip.food} купонів. Оцінка здобичі — вартість на момент повернення, а не отриманий дохід. Для продажу відкрий рюкзак.</p>` : '<p class="camp-note">Тут з’являться знахідки й витрати після першого повернення з поля.</p>';
}
export function confirmDeparture() {
  if (!canLeave() || busy()) return;
  const warnings = departureWarnings();
  modal(warnings.length ? 'ПЕРЕВІР ПІДГОТОВКУ' : 'ВИРУШИТИ?', '⛺', emergencyAllowed() ? 'Бідне узбіччя' : 'Нова випадкова ділянка', (emergencyAllowed() ? 'Безкоштовний виїзд на бідне узбіччя.' : 'Вартість: 25 купонів.') + ' Енергія: ' + s.energy + ' / ' + maxEnergy() + '. Вільних місць: ' + Math.max(0, bagCapacity() - bagUsed()) + '. ' + warnings.join(' ') + ' Дорога не відновлює сили.' + (s.atCamp ? '' : ' Стару ділянку буде втрачено.'), warnings.length ? 'Усе одно вирушити' : 'Вирушити', depart);
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
