// Optional guidance observes real actions. It never generates finds or awards currency.
export function validGuide(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    value.version === 1 && typeof value.enabled === 'boolean' &&
    Number.isInteger(value.stage) && value.stage >= 0 && value.stage <= 4;
}
export function firstStepsOffer(state) {
  return !state.guide && state.atCamp && state.day === 1 && !state.lastTrip &&
    !state.collection.length && !state.bag.length && !state.stash.length;
}
export function startGuide(state) {
  const stage = state.atCamp ? (state.bag.length || state.stash.length ? 3 : 0) : state.bag.length ? 2 : 1;
  state.guide = {version:1, enabled:true, stage};
}
export function advanceGuide(state, event) {
  const guide = state.guide;
  if (!guide) return;
  if (event === 'depart' && guide.stage === 0) guide.stage = 1;
  if (event === 'keep' && guide.stage === 1) guide.stage = 2;
  if (event === 'home' && guide.stage === 2 && state.bag.length) guide.stage = 3;
  if (event === 'sort' && guide.stage === 3 && state.atCamp) guide.stage = 4;
}
export function guideCard(state) {
  if (firstStepsOffer(state)) return {
    count:'ПЕРШІ КРОКИ', title:'Твій перший сигнал',
    text:'Вирушай на пошук, відкривай знахідки й збирай власну колекцію. Короткі підказки проведуть тебе від табору до першого розбору здобичі.',
    action:'begin', button:'Почати з підказками', progress:0
  };
  const guide = state.guide;
  if (!guide?.enabled) return null;
  const card = {count:'ПЕРШІ КРОКИ · '+Math.min(4, guide.stage + 1)+' / 4', progress:guide.stage};
  if (guide.stage === 4) return {...card, count:'ПЕРШІ КРОКИ ЗАВЕРШЕНО', title:'Тепер — твій власний маршрут',
    text:'Основи опановано. У щоденнику на тебе чекають кар’єра й замовлення. Поповнюй альбом, відкривай напрямки та поступово покращуй спорядження.', action:'journal', button:'До кар’єри та замовлень'};
  if (state.atCamp && guide.stage < 3) return {...card, title:guide.stage === 0 ? 'Вирушай на перший пошук' : 'Продовж пошук',
    text:'За браком купонів доступне безкоштовне узбіччя. Відпочинок у таборі також безкоштовний. Сканування не витрачає сил — енергія потрібна для копання.', action:'depart', button:'Підготувати виїзд'};
  if (state.pending) return {...card, title:'Відкрий і забери знахідку',
    text:'Прибери ґрунт пальцем чи мишею або натисни «Відкрити без жестів». Після огляду забери предмет у рюкзак: навіть металобрухт можна продати в таборі.', action:'none', button:''};
  if (guide.stage === 1 || !state.atCamp && !state.bag.length) return {...card, title:'Знайди найсильніший відгук',
    text:'Веди котушкою повільними смугами. Почув сигнал — перевір його навхрест і копай біля найсильнішого відгуку. Цифра не гарантує тип знахідки; порожні ями теж трапляються.', action:'search', button:'До пошуку'};
  if (!state.atCamp) return {...card, title:'Поверни здобич до табору',
    text:'Предмет уже в рюкзаку. Можеш шукати далі або повернутися: дорога додому безкоштовна, ділянка й мітки залишаться на карті.', action:'home', button:'Повернутися зі знахідками'};
  if (!state.bag.length && !state.stash.length) return {...card, title:'Знадобиться ще одна знахідка',
    text:'Щоб завершити перші кроки, принеси предмет і додай його до альбому або продай у таборі.', action:'depart', button:'Підготувати виїзд'};
  return {...card, title:'Виріши долю знахідки',
    text:'У рюкзаку додай кращий екземпляр до альбому або продай його за купони. Металобрухт іде на продаж. Кнопка «Переглянути продаж» дає перевірити список перед підтвердженням.', action:'inventory', button:'Розібрати знахідки'};
}
