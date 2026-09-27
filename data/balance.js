// balance responsibilities for Last Signal.
export const rarities = [{
  name: 'Звичайна',
  factor: 1,
  color: '#bbc7b6',
  weight: 12
}, {
  name: 'Незвичайна',
  factor: 1.5,
  color: '#a7d88b',
  weight: 6
}, {
  name: 'Рідкісна',
  factor: 2.5,
  color: '#91c9ee',
  weight: 2
}, {
  name: 'Виняткова',
  factor: 4,
  color: '#e3b374',
  weight: .5
}];
export const surveyCols = 20,
  surveyRows = 16,
  leaveCoverage = 35;
export const depthLevels = [{
  name: 'Неглибоко · ≈10 см',
  cost: 5
}, {
  name: 'Середня глибина · ≈25 см',
  cost: 10
}, {
  name: 'Глибоко · ≈45 см',
  cost: 15
}];
export const signalRanges = {
  road: [8, 16],
  field: [6, 14],
  beach: [15, 25],
  fair: [12, 22],
  trail: [4, 10],
  grass: [6, 14]
};
export const foods = [{
  name: '🍎 Яблуко',
  percent: 10,
  price: 8
}, {
  name: '🥪 Бутерброд',
  percent: 20,
  price: 14
}, {
  name: '🥫 Сухпайок',
  percent: 30,
  price: 20
}];
