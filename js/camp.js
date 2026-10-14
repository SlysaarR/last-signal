import { advanceGuide } from '../data/guide.js?v=0.51.0';
import { forecastEnvironment, groundTypes, currentEnvironment } from '../data/environment.js?v=0.51.0';
import { departureConditions, renderPreparation, preparationText } from './environment-ui.js?v=0.51.0';
import { openAtlas } from './atlas-ui.js?v=0.51.0';
import { ensureAtlas, parkCurrent, restoreSite, rememberCurrent } from './atlas-state.js?v=0.51.0';
import { activeSite, selectedSite, siteName, siteAccessible, canScout, MAX_SITES } from '../data/atlas.js?v=0.51.0';
import { chosenRoute, conditions } from '../data/expeditions.js?v=0.51.0';
import { startLeg,endLeg } from './progression.js?v=0.51.0';
// camp responsibilities for Last Signal.
import { modal } from './dialogs.js?v=0.51.0';
import { $ } from './dom.js?v=0.51.0';
import { bagCapacity, bagUsed, canLeave, emergencyAllowed, maxEnergy, priceFor, travelCost } from './rules.js?v=0.51.0';
import { s, save } from './storage.js?v=0.51.0';
import { busy, render, showTab } from './ui.js?v=0.51.0';
import { currentLocation, generate, rollLocation } from './world.js?v=0.51.0';
import { inventorySummary } from './inventory-plan.js?v=0.51.0';
export function returnHome() {
  if (s.atCamp || s.pending) return;
  s.lastTrip = {
    found: s.found || 0,
    brought: s.bag.length,
    value: s.bag.reduce((sum, item) => sum + priceFor(item.type, item.condition), 0),
    travel: s.travelSpent,
    food: s.foodSpent
  };
  ensureAtlas();
  endLeg();
  parkCurrent();
  s.atlas.selectedId=null;
  s.atCamp = true;
  advanceGuide(s, 'home');
  s.objects = [];
  s.holes = [];
  s.survey = [];
  delete s.site;
  delete s.fieldMarks;
  save();
  showTab('camp');
}
export function destinationName() {
  const target=selectedSite(s);
  return target?siteName(target):emergencyAllowed()?'Бідне узбіччя':chosenRoute(s).name;
}
export function departureBlock() {
  const target=selectedSite(s);
  if(s.pending)return 'Заверши поточну знахідку перед дорогою.';
  if(target&&target.id===s.atlas?.activeId)return 'Ти вже на цій ділянці. Повернися до пошуку або обери іншу.';
  if(target&&!siteAccessible(s,target))return 'Для цього напрямку ще бракує позицій в альбомі.';
  if(!target&&!canScout(s))return 'На карті вже '+MAX_SITES+' ділянок. У таборі прибери одну стару або обери знайому для повернення.';
  if(s.coins<travelCost())return 'Бракує купонів на цю дорогу. Обери дешевше місце'+(s.atCamp&&s.coins<25?' або розвідку безкоштовного узбіччя.':'.');
  return '';
}
export function showArrival(revisit=false) {
  const loc=currentLocation(),site=activeSite(s);
  modal(revisit?'ЗНАЙОМА ДІЛЯНКА':'НОВА ДІЛЯНКА',loc.icon,site?siteName(site):loc.name,
    s.energy+' сил. '+(currentEnvironment(s)?preparationText({environment:currentEnvironment(s),emergency:!!s.emergency}):(conditions[s.progress?.active?.condition]?.text||''))+' '+(revisit?'Ями, мітки й пройдена територія збережені. Здобич не відновлюється.':loc.hint), 'Почати пошук');
}
export function depart() {
  if(!canLeave())return false;
  const fromCamp=s.atCamp,emergency=emergencyAllowed(),cost=travelCost(),route=chosenRoute(s),environment=forecastEnvironment(s,route,emergency);
  ensureAtlas();
  const target=selectedSite(s);
  endLeg();parkCurrent();
  if(fromCamp){s.travelSpent=0;s.foodSpent=0;s.found=0;s.earned=0;s.foodUsed=0;}
  s.coins-=cost;s.travelSpent+=cost;s.day++;s.atCamp=false;
  if(target){
    restoreSite(target);startLeg(cost,target.condition,target.environment);
  }else{
    s.x=.5;s.y=.52;s.emergency=emergency;
    s.location=emergency?0:rollLocation(route);
    Math.random(); // Retain the published loot stream's one former soil draw.
    startLeg(cost,groundTypes[environment.ground].condition,environment);
    generate({persist:false});rememberCurrent(emergency?'wander':route.id);
  }
  // The completed state is saved once, after the field and its identity agree.
  advanceGuide(s, 'depart');
  save();showTab('search');
  $('log').textContent=(target?'Повернувся на знайому ділянку. ':'Нове місце додано на карту. ')+'Залишок сил: '+s.energy+'.';
  showArrival(!!target);return true;
}
export function departureWarnings() {
  const warnings = [];
  if (s.energy < maxEnergy() * .3) warnings.push('Мало енергії — ' + s.energy + ' / ' + maxEnergy() + '.');
  if (bagUsed() >= bagCapacity()) warnings.push('Рюкзак повний: нову знахідку доведеться залишити або замінити предмет.');
  return warnings;
}
export function renderCamp() {
  renderPreparation('campConditions');
  const food = s.food.reduce((sum, n) => sum + n, 0), free = Math.max(0, bagCapacity() - bagUsed());
  const loot=inventorySummary();
  $('campLoot').hidden=!s.atCamp||!loot.total;
  $('campLootSummary').textContent=`Рюкзак і сховище: ${loot.total}. Нових позицій для альбому: ${loot.new}, покращень: ${loot.upgrade}. Дублікатів: ${loot.duplicate}, металобрухту: ${loot.scrap}.`;
  $('campStatus').textContent = s.atCamp ? 'Вдома · підготовка до наступного виїзду' : 'Ти в полі · табір доступний після повернення';
  $('campEnergy').textContent = s.energy + ' / ' + maxEnergy();
  $('campEnergyBar').value = s.energy;
  $('campEnergyBar').max = maxEnergy();
  $('campFood').textContent = food + ' порцій';
  $('campSpace').textContent = free + ' / ' + bagCapacity();
  $('campReadiness').textContent = !s.atCamp ? 'Щоб відпочити, розібрати знахідки й отримати нагороди, повернися до табору кнопкою нижче.' : departureWarnings().join(' ') || (food ? 'Спорядження готове. Можна вирушати.' : 'Їжі в рюкзаку немає. За бажанням візьми запас у майстерні.');
  $('restHome').hidden = !s.atCamp || s.energy === maxEnergy();
  $('restHome').disabled = !s.atCamp || s.energy === maxEnergy() || !!s.pending;
  $('restHome').textContent = s.energy === maxEnergy() ? 'Енергію відновлено' : 'Відпочити · безкоштовно';
  $('startTrip').disabled = !!s.pending || s.atCamp && !canLeave();
  const target=selectedSite(s);
  $('startTrip').textContent=!s.atCamp?'Повернутися до табору':(target?'До «'+siteName(target)+'»':emergencyAllowed()?'На узбіччя':'Розвідати нове місце')+' · '+travelCost()+' купонів';
  $('departureNote').textContent=!s.atCamp?'Повернення безкоштовне. Ділянка та мітки залишаться на карті.':departureBlock() || (target?'Повернення на знайому ділянку. ':emergencyAllowed()?'Безкоштовна розвідка бідного узбіччя. ':chosenRoute(s).name+'. ')+'Після дороги залишиться '+(s.coins-travelCost())+' купонів. Дорога не відновлює енергію.';
  $('campMapSummary').textContent=(s.atlas?.sites.length || (s.atCamp?0:1))+' / '+MAX_SITES+' ділянок · '+(target?'обрано: '+siteName(target):'обрано розвідку нового місця');
  const trip = s.lastTrip;
  $('tripSummary').innerHTML = trip ? `<div class="trip-grid"><div><span>Оглянуто за виїзд</span><strong>${trip.found}</strong></div><div><span>Предметів у рюкзаку</span><strong>${trip.brought}</strong></div><div><span>Вартість рюкзака</span><strong>${trip.value}<small> купонів</small></strong></div><div><span>Витрати на виїзд</span><strong>${trip.travel + trip.food}<small> купонів</small></strong></div></div><p class="camp-note">Дорога: ${trip.travel} · з’їдена їжа: ${trip.food} купонів. Вартість рюкзака включає всі принесені предмети, зокрема взяті з дому. Купони нараховуються після продажу.</p>` : '<p class="camp-note">Тут з’являться знахідки й витрати після першого повернення з поля.</p>';
}
export function confirmDeparture() {
  if(!canLeave()||busy())return;
  const warnings=departureWarnings(),state=s,selected=s.atlas?.selectedId??null,day=s.day,camp=s.atCamp;
  modal(warnings.length?'ПЕРЕВІР ПІДГОТОВКУ':'ВИРУШИТИ?','⛺',destinationName(),
    preparationText(departureConditions())+' Вартість: '+travelCost()+' купонів. Енергія: '+s.energy+' / '+maxEnergy()+'. Вільних місць: '+Math.max(0,bagCapacity()-bagUsed())+'. '+warnings.join(' ')+' Дорога не відновлює сили.'+(s.atCamp?'':' Поточна ділянка залишиться на карті.'),
    warnings.length?'Усе одно вирушити':'Вирушити',()=>{
      if(s!==state||s.day!==day||s.atCamp!==camp||(s.atlas?.selectedId??null)!==selected)return;
      depart();
    });
}
export function confirmReturnHome() {
  if (busy() || s.atCamp) return;
  modal('ПОВЕРНУТИСЯ ДОДОМУ?', '🏠', 'Завершити виїзд', 'Повернення безкоштовне. Здобич у рюкзаку збережеться. Ділянка, ями та мітки залишаться на карті для наступного виїзду.', 'До табору', returnHome);
}
export function initCamp() {
  $('restHome').onclick = () => {
    if (!s.atCamp || busy()) return;
    s.energy = maxEnergy();
    s.foodUsed = 0;
    save();
    render();
  };
  $('returnHome').onclick = confirmReturnHome;
  $('finish').onclick = () => {if(busy('tripMenu'))return;$('tripMenu').close();openAtlas();};
  $('startTrip').onclick = () => s.atCamp ? confirmDeparture() : confirmReturnHome();
}

