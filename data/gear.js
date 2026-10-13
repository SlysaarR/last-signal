// Equipment rules are pure so gameplay, migrations and portable backups agree.
export const GEAR_VERSION = 2;
export const MAX_GEAR_LEVEL = 10;
export const gearCosts = {
  detector: [120,300,650,1400,3000,6200,12000,21000,30740],
  shovel: [90,240,550,1200,2600,5500,10500,18500,26330],
  backpack: [90,240,550,1200,2600,5500,10500,18500,26330]
};
export const gearKeys = {detector:'level',shovel:'shovel',backpack:'backpack'};
export const capacityAt = level => 8 + Math.ceil((level - 1) * 32 / 9);
export const shovelAt = level => 1 - .3 * (level - 1) / 9;
export const detectorAt = level => ({
  radius: .205 * (1 + (level - 1) * .5 / 9),
  noise: 18 - (level - 1) * 13 / 9,
  deepResponse: .62 + (level - 1) * .28 / 9
});
export const energyLimit = state => state.gearVersion === GEAR_VERSION ? state.energyCapacity : 100 + Math.round((state.level - 1) * 100 / 99);
export const capacityFor = state => state.gearVersion === GEAR_VERSION ? capacityAt(state.backpack) : 8 + Math.floor((state.backpack - 1) * 32 / 99);
export const creditFor = (state,kind) => state.gearCredit?.[kind] || 0;
export function upgradePrice(state,kind) {
  const price=gearCosts[kind]?.[state[gearKeys[kind]]-1];
  return price === undefined ? 0 : Math.max(0,price-creditFor(state,kind));
}
// Old purchases retain both their effects and their invested value. No cash is minted.
export function migrateGear(state) {
  if (state.gearVersion === GEAR_VERSION) return false;
  if (state.gearVersion !== undefined) throw new Error('Unknown equipment version');
  state.energyCapacity=energyLimit(state);
  state.gearCredit={detector:0,shovel:0,backpack:0};
  for (const [kind,key] of Object.entries(gearKeys)) {
    const old=state[key];
    let invested=0;
    for(let level=1;level<old;level++) invested+=Math.round(30+level*(kind==='detector'?8:6)+level*level*.1);
    let level=1,paid=0;
    while(level<MAX_GEAR_LEVEL && paid+gearCosts[kind][level-1]<=invested) paid+=gearCosts[kind][level++-1];
    const effectLevel=1+Math.ceil((old-1)*9/99);
    while(level<effectLevel) paid+=gearCosts[kind][level++-1];
    state[key]=level;
    state.gearCredit[kind]=Math.max(0,invested-paid);
  }
  state.gearVersion=GEAR_VERSION;
  return true;
}

// Functions unlock across the entire progression; every intermediate tier also improves stats.
export const detectorMilestones = [
  [2,'Індекс металу','Приблизна провідність допомагає порівнювати відгуки.'],
  [3,'Пінпойнт','Точне наведення: повільніший рух котушки та шкала центрування.'],
  [4,'Оцінка глибини','Розрізняє неглибокі, середні й глибокі сигнали.'],
  [5,'Приглушення заліза','Можна зробити низькі залізні відгуки тихішими.'],
  [6,'Баланс ґрунту','Автоматично зменшує шум від щільного ґрунту.'],
  [7,'Історія відгуку','Графік останнього проходу котушки показує форму сигналу.'],
  [8,'Глибина в сантиметрах','Приблизний діапазон глибини для чіткого відгуку.'],
  [9,'Розділення цілей','Менший вплив сусіднього металу на індекс; індикатор перешкод.'],
  [10,'Глибокий пошук','Окремий режим посилює слабкі цілі ціною додаткового шуму.']
];
export function detectorFeatures(level) {
  return {id:level>=2,pinpoint:level>=3,depth:level>=4,ironQuiet:level>=5,ground:level>=6,trace:level>=7,depthRange:level>=8,separation:level>=9,deep:level>=10};
}
export function detectorSettings(state) {
  const f=detectorFeatures(state.level),chosen=state.detectorSettings;
  const mode=chosen?.mode;
  return {mode:mode==='pinpoint'&&f.pinpoint||mode==='deep'&&f.deep?mode:'search',ironQuiet:!!chosen?.ironQuiet&&f.ironQuiet};
}
export function detectorLook(level) {
  const stage=Math.floor((level-1)/2);
  return {stage,name:'Сигнал '+String(level).padStart(2,'0'),
    accent:['#c2cfa3','#a2d2b2','#dfbe78','#84cbd6','#b5a8ee'][stage],
    shell:['#3b4933','#304e45','#544c34','#263e4b','#34354e'][stage]};
}
