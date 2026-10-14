import { foods } from '../data/balance.js?v=0.51.0';
import { forecastEnvironment, currentEnvironment, environmentKey, environmentName, groundTypes } from '../data/environment.js?v=0.51.0';
import { selectedSite } from '../data/atlas.js?v=0.51.0';
import { chosenRoute, conditions } from '../data/expeditions.js?v=0.51.0';
import { s, save } from './storage.js?v=0.51.0';
import { $ } from './dom.js?v=0.51.0';
import { digCostFor, emergencyAllowed, foodAmount, maxEnergy } from './rules.js?v=0.51.0';
import { setWeatherAmbience } from './audio.js?v=0.51.0';
import { busy, render } from './ui.js?v=0.51.0';
let pageActive=true,media=null;
const prepKeys=new Map();
export function departureConditions(){
 const target=selectedSite(s);
 if(target)return {environment:target.environment||null,condition:target.condition,emergency:target.emergency,known:true};
 const emergency=emergencyAllowed();
 return {environment:forecastEnvironment(s,chosenRoute(s),emergency),condition:0,emergency,known:false};
}
export function preparationText(destination){
 const {environment,condition=0,emergency=false}=destination;
 const costs=[5,10,15].map(base=>digCostFor(base,destination));
 return (environment?environmentName(environment):conditions[condition].name)+'. Копання: '+costs.join(' / ')+' сил — неглибоко / середньо / глибоко.'+(environment&&emergency?' На бідному узбіччі витрата звичайна.':'');
}
export function usableFoodEnergy(){
 let total=0;const limit=s.atCamp?50:Math.floor(50-s.foodUsed);
 // Three bounded food kinds. Maximize usable food under the existing 50% cap.
 const amounts=foods.map(food=>food.percent),best=Array(limit+1).fill(-Infinity);best[0]=0;
 for(let i=0;i<3;i++)for(let count=0;count<Math.min(s.food[i],Math.floor(limit/amounts[i]));count++)for(let value=limit;value>=amounts[i];value--)best[value]=Math.max(best[value],best[value-amounts[i]]+foodAmount(i));
 for(const n of best)total=Math.max(total,n);return total;
}
export function renderPreparation(id){
 const destination=departureConditions(),{environment,condition=0,emergency,known}=destination;
 const key=[environmentKey(environment),condition,emergency,known,s.atCamp,s.shovel,s.energy,maxEnergy(),s.foodUsed,...s.food].join(':');
 if(prepKeys.get(id)===key)return;prepKeys.set(id,key);
 const title=environment?environmentName(environment):conditions[condition].name,costs=[5,10,15].map(base=>digCostFor(base,destination));
 const tip=environment?(emergency?'Безкоштовне узбіччя: усі глибини копаються за звичною ціною.':groundTypes[environment.ground].tip):conditions[condition].text;
 const reserve=usableFoodEnergy(),estimate=Math.floor((s.energy+reserve)/costs[1]);
 $(id).innerHTML=`<div class="eyebrow">${known?'УМОВИ ЗНАЙОМОЇ ДІЛЯНКИ':'ПРОГНОЗ НА НАСТУПНУ РОЗВІДКУ'}</div><h3>${title}</h3><p>${tip}</p><div class="condition-costs">${['Неглибоко','Середньо','Глибоко'].map((label,i)=>`<div><span>${label}</span><b>${costs[i]}<small> сил</small></b></div>`).join('')}</div><p class="condition-budget">Твої сили й їжа: приблизно ${estimate} середніх розкопок${reserve?' · їжа дасть до '+reserve+' сил':' · без запасу їжі'}. Це запас на копання, не кількість знахідок.</p><small>${known?'Погода й ґрунт збережені з цією ділянкою.':'Умови закріпляться за новою ділянкою. Інший напрямок може мати інший прогноз.'}</small>`;
}
export function effectLevel(){
 // Reduced-motion wins even over a manually chosen full profile.
 if(media?.matches)return 'low';
 if(s.weatherEffects&&s.weatherEffects!=='auto')return s.weatherEffects;
 const nav=globalThis.navigator;
 return nav?.deviceMemory<=4||nav?.hardwareConcurrency<=4?'low':'full';
}
export function syncWeatherEffects(){
 const env=currentEnvironment(s),shown=!!env&&!s.atCamp&&!$('search').hidden,page=pageActive&&document.visibilityState!=='hidden',running=shown&&page&&!busy();
 const layer=$('weatherLayer'),level=effectLevel();
 layer.hidden=!shown;layer.dataset.weather=env?.weather||'none';layer.dataset.level=level;layer.dataset.running=String(running);
 // Repeated UI renders reuse the same source; no audio context is created here.
 setWeatherAmbience(running?env.weather:null);
 if(!$('camp').hidden){$('weatherEffects').value=s.weatherEffects||'auto';$('weatherEffectsNote').textContent=level==='low'?'Зараз мінімальні ефекти: без анімації дощу. Умови пошуку ті самі.':'Зараз повні ефекти. Звук погоди працює разом із кнопкою звуку приладу.';}
}
export function initEnvironment(){
 media=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
 media?.addEventListener?.('change',syncWeatherEffects);
 $('weatherEffects').onchange=e=>{
   if(busy()||!['auto','full','low'].includes(e.target.value))return;
   s.weatherEffects=e.target.value;save();render();
 };
 document.addEventListener('visibilitychange',syncWeatherEffects);
 window.addEventListener('pagehide',()=>{pageActive=false;syncWeatherEffects();});
 window.addEventListener('pageshow',()=>{pageActive=true;syncWeatherEffects();});
 // Stop behind dialogs too, including dialogs opened without a full UI render.
 if(typeof MutationObserver!=='undefined'){
   const observer=new MutationObserver(syncWeatherEffects);
   for(const id of ['modal','excavate','packDialog','tripMenu','quickFood','coinDetail','backupDialog','inventoryReview','fieldNotes','appUpdateDialog','helpDialog'])observer.observe($(id),{attributes:true,attributeFilter:['open']});
 }
}
