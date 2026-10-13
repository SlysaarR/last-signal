// locations responsibilities for Last Signal.
export const locations = [{
  name: 'Узбіччя',
  chance: 40,
  rarity: 'Звичайна локація',
  potential: 1,
  icon: '🛤️',
  hint: 'Часто трапляється сміття. Серед нього — загублені монети, іноді прикраси.',
  kinds: [.65, .25, .08, .02],
  boost: [1, 1, 1, 1],
  ground: ['#66664b', '#354339'],
  accent: '#bec6a6',
  terrain: 'road'
}, {
  name: 'Старе поле',
  chance: 30,
  rarity: 'Звичайна локація',
  potential: 2,
  icon: '🌾',
  hint: 'Ранні українські випуски й ґудзики серед грудок землі. Варто прислухатись до кольорових сигналів.',
  kinds: [.43, .38, .05, .14],
  boost: [1, 1.15, 1.3, 1.4],
  ground: ['#796046', '#433c2c'],
  accent: '#d5c49b',
  terrain: 'field'
}, {
  name: 'Пляж',
  chance: 18,
  rarity: 'Незвичайна локація',
  potential: 3,
  icon: '🏖️',
  hint: 'Бляшанки та фольга, сучасні монети. Тут частіше гублять каблучки й ланцюжки.',
  kinds: [.57, .23, .19, .01],
  boost: [1, 1.3, 1.8, 2],
  ground: ['#a38b5c', '#655638'],
  accent: '#f1dfad',
  terrain: 'beach'
}, {
  name: 'Місце колишнього ярмарку',
  chance: 10,
  rarity: 'Рідкісна локація',
  potential: 4,
  icon: '🏕️',
  hint: 'Колись тут торгували й губили дріб’язок. Більше монет і вищий шанс рідкісних знахідок.',
  kinds: [.32, .45, .13, .1],
  boost: [1, 1.7, 3, 4],
  ground: ['#66714b', '#344635'],
  accent: '#a8d8e5',
  terrain: 'fair'
}, {
  name: 'Забутий торговий шлях',
  chance: 2,
  rarity: 'Виняткова локація',
  potential: 5,
  icon: '🧭',
  hint: 'Рідкісний виїзд! Найвищий шанс цінних різновидів українських монет, але і тут трапляється сміття.',
  kinds: [.22, .5, .16, .12],
  boost: [1, 2, 5, 8],
  ground: ['#596344', '#293c34'],
  accent: '#edc57f',
  terrain: 'trail'
}];
// Appended IDs preserve every previously saved location.
locations.push(
 {name:'Лісова галявина',chance:10,rarity:'Незвичайна локація',potential:2,icon:'🌲',hint:'Коріння, побутові речі й поодинокі монети. Сигналів небагато.',kinds:[.49,.30,.04,.17],boost:[1,1.2,1.4,1.6],ground:['#4e6242','#203a2c'],accent:'#bacb96',terrain:'forest'},
 {name:'Старий сад',chance:10,rarity:'Звичайна локація',potential:2,icon:'🌳',hint:'Дрібні монети та загублені речі між колишніми деревами.',kinds:[.46,.37,.08,.09],boost:[1,1.1,1.3,1.5],ground:['#718051','#364833'],accent:'#d5d8a4',terrain:'orchard'},
 {name:'Річковий берег',chance:8,rarity:'Незвичайна локація',potential:3,icon:'〰️',hint:'Монети, прикраси та металеве сміття біля води.',kinds:[.60,.25,.12,.03],boost:[1,1.25,1.5,1.8],ground:['#6e7863','#334c42'],accent:'#a6d3cc',terrain:'river'}
);

export const legacyLocation = {
  name: 'Стара яблунева галявина',
  rarity: 'Попередній виїзд',
  potential: 2,
  icon: '🌳',
  hint: 'Твоя поточна ділянка збережена. Після повернення до табору наступне місце буде випадковим.',
  kinds: [.5, .32, .15, .03],
  boost: [1, 1, 1, 1],
  ground: ['#536045', '#243b2e'],
  accent: '#c0d19d',
  terrain: 'grass'
};

