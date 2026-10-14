// Game conditions, not a real-world forecast. No loot RNG or wall-clock time.
export const weatherTypes={
 clear:{name:'Ясно',icon:'☀',text:'Тепле світло й тихий вітер.'},
 overcast:{name:'Хмарно',icon:'☁',text:'Розсіяне світло, прохолодний вітер.'},
 rain:{name:'Легкий дощ',icon:'☂',text:'Дрібний дощ і волога земля. Без втрати енергії за очікування.'}
};
export const groundTypes={
 dry:{name:'Сухий ґрунт',condition:0,factors:[1,1.05,1.1],tip:'Неглибокі ямки — за звичною ціною. Глибше земля щільніша.'},
 damp:{name:'Вологий ґрунт',condition:1,factors:[.9,.9,.95],tip:'Копати легше: на 10% менше сил для неглибоких і середніх ямок, на 5% — для глибоких.'},
 stony:{name:'Кам’янистий ґрунт',condition:2,factors:[1,1.1,1.2],tip:'Неглибокі ямки — за звичною ціною; середні +10%, глибокі +20%. Краще уточнювати центр відгуку.'}
};
export function validEnvironment(v){return !!v&&typeof v==='object'&&!Array.isArray(v)&&v.version===1&&Object.hasOwn(weatherTypes,v.weather)&&Object.hasOwn(groundTypes,v.ground);}
export function environmentKey(v){return v?v.version+':'+v.weather+':'+v.ground:'legacy';}
export function environmentName(v){return v?weatherTypes[v.weather].icon+' '+weatherTypes[v.weather].name+' · '+groundTypes[v.ground].name:'';}
export function currentEnvironment(state){return state.atCamp?null:state.progress?.active?.environment||null;}
export function groundFactor(environment,base){return groundTypes[environment.ground].factors[base<=5?0:base<=10?1:2];}
export function forecastEnvironment(state,route,emergency=false){
 if(emergency)return {version:1,weather:'clear',ground:'dry'};
 // Stable per next trip and direction. Viewing/changing tabs/reloading is free.
 let seed=2166136261;for(const c of String(state.day+1)+':'+route.id)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const sky=random(),weather=sky<.48?'clear':sky<.8?'overcast':'rain',roll=random();
 const wet=weather==='rain'?.90:weather==='overcast'?.35:.10;
 const damp=Math.min(.95,wet+(route.id==='water'?.18:route.id==='rural'?.05:0));
 const rocky=weather==='rain'?.10:route.id==='distant'?.25:.15;
 return {version:1,weather,ground:roll<damp?'damp':roll<Math.min(1,damp+rocky)?'stony':'dry'};
}
