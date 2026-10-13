// Versioned, deterministic geography. Never reads buried objects or loot RNG.
export const SITE_VERSION=1;
export function siteRandom(seed) {
  let n=seed>>>0;
  return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
}
export function seedForSite(state) {
  return (Math.imul(state.day>>>0,2654435761)^Math.imul(state.location+2,2246822519)^(state.emergency?0x51eaff:0))>>>0;
}
export function createSiteLayout(terrain,seed) {
  const random=siteRandom(seed),paths=[],features=[];
  const jitter=(value,range=.1)=>value+(random()-.5)*range;
  const path=(points,width=.055)=>{
    const knots=points.map(([x,y])=>({x:jitter(x),y:jitter(y)})),curve=[];
    for(let i=0;i<knots.length-1;i++)for(let step=0;step<10;step++){
      const t=step/10,a=knots[Math.max(0,i-1)],b=knots[i],c=knots[i+1],d=knots[Math.min(knots.length-1,i+2)];
      const at=key=>.5*((2*b[key])+(-a[key]+c[key])*t+(2*a[key]-5*b[key]+4*c[key]-d[key])*t*t+(-a[key]+3*b[key]-3*c[key]+d[key])*t*t*t);
      curve.push({x:at('x'),y:at('y')});
    }
    curve.push(knots.at(-1));paths.push({points:curve,width});
  };
  const feature=(kind,x,y,size=.05)=>features.push({kind,x:jitter(x,.08),y:jitter(y,.08),size,angle:(random()-.5)*.6});
  let water=null;
  if(terrain==='road') {
    path([[.2,-.1],[.25,.25],[.19,.62],[.24,1.1]],.12);
    path([[.23,.55],[.55,.62],[1.1,.4]],.035);
    feature('stones',.56,.68);feature('brush',.84,.32,.08);feature('brush',.09,.8,.06);
  } else if(terrain==='field') {
    path([[-.1,.72],[.35,.62],[.7,.56],[1.1,.32]],.055);
    feature('foundation',jitter(.6,.3),.33,.09);feature('stones',.3,.68,.045);feature('brush',.86,.84,.08);
  } else if(terrain==='fair') {
    path([[-.1,.63],[.35,.51],[.65,.5],[1.1,.32]],.075);
    path([[.38,-.1],[.4,.36],[.54,.72],[.65,1.1]],.055);
    feature('foundation',.23,.3,.075);feature('foundation',.74,.69,.09);feature('stones',.22,.81);
  } else if(terrain==='trail') {
    path([[.28,-.1],[.56,.25],[.38,.64],[.68,1.1]],.075);
    feature('foundation',.71,.34,.065);feature('stones',.3,.67,.06);
    feature('tree',.09,.27,.095);feature('tree',.86,.84,.09);
  } else if(terrain==='forest'||terrain==='grass') {
    path([[-.1,.72],[.28,.55],[.6,.47],[.85,-.1]],.042);
    for(const [x,y] of [[.09,.16],[.35,.13],[.87,.18],[.1,.88],[.64,.91],[.89,.75]])feature('tree',x,y,.08+random()*.04);
    feature('logs',.48,.73,.055);feature('stones',.69,.36);
  } else if(terrain==='orchard') {
    path([[.44,-.1],[.5,.35],[.45,.68],[.5,1.1]],.06);
    for(const x of [.18,.78])for(const y of [.2,.5,.8])feature('tree',x,y,.065);
    feature('foundation',.58,.79,.065);feature('brush',.1,.88,.06);
  }
  if(terrain==='beach'||terrain==='river') {
    const edge=terrain==='beach'?'right':'bottom',base=edge==='right'?.79:.8;
    const points=Array.from({length:7},(_,i)=>({t:i/6,value:base+Math.sin(i*.8+random()*.3)*.04+(random()-.5)*.035}));
    water={edge,points};
    if(edge==='right')path([[.18,-.1],[.29,.34],[.21,.7],[.35,1.1]],.045);
    else path([[-.1,.34],[.32,.42],[.67,.36],[1.1,.51]],.045);
    feature('logs',edge==='right'?.6:.3,edge==='right'?.63:.66,.065);
    feature('stones',.65,edge==='right'?.26:.65,.05);feature('brush',.12,.16,.07);
  }
  return {terrain,seed,paths,features,water};
}
export function shorelineAt(water,t) {
  const value=Math.max(0,Math.min(1,t))*6,index=Math.min(5,Math.floor(value)),a=water.points[index],b=water.points[index+1];
  return a.value+(b.value-a.value)*(value-index);
}
export function searchablePoint(layout,p) {
  if(p.x<.08||p.x>.92||p.y<.08||p.y>.92)return false;
  if(!layout.water)return true;
  return layout.water.edge==='right'?p.x<shorelineAt(layout.water,p.y)-.035:p.y<shorelineAt(layout.water,p.x)-.035;
}
export const siteDistance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*720/880);
function activityPoint(layout,random) {
  const anchors=layout.features.filter(f=>['foundation','logs'].includes(f.kind));
  if(anchors.length&&random()<.25) {
    const a=anchors[Math.floor(random()*anchors.length)];
    return {x:a.x+(random()-.5)*.3,y:a.y+(random()-.5)*.3};
  }
  if(layout.water&&random()<.4) {
    const t=random(),v=shorelineAt(layout.water,t)-.05-random()*.14;
    return layout.water.edge==='right'?{x:v,y:t}:{x:t,y:v};
  }
  const path=layout.paths[Math.floor(random()*layout.paths.length)];
  if(!path)return {x:random(),y:random()};
  const segment=Math.floor(random()*(path.points.length-1)),t=random(),a=path.points[segment],b=path.points[segment+1];
  return {x:a.x+(b.x-a.x)*t+(random()-.5)*.25,y:a.y+(b.y-a.y)*t+(random()-.5)*.25};
}
export function placeSiteObjects(objects,layout) {
  const random=siteRandom(layout.seed^0x761bd925),placed=[];
  for(const item of objects) {
    let point=null;
    for(let attempt=0;attempt<600;attempt++) {
      // All kinds use the same spatial rule. Plenty of signals remain scattered.
      const p=attempt<180&&random()<.55?activityPoint(layout,random):{x:.08+random()*.84,y:.08+random()*.84};
      if(searchablePoint(layout,p)&&placed.every(q=>siteDistance(p,q)>.085)){point=p;break;}
    }
    if(!point) {
      // Deterministic farthest-space fallback preserves separation on dense sites.
      let distance=-1;
      for(let y=.08;y<=.92;y+=.02)for(let x=.08;x<=.92;x+=.02){
        const p={x,y};if(!searchablePoint(layout,p))continue;
        const d=Math.min(...placed.map(q=>siteDistance(p,q)));
        if(d>distance){distance=d;point=p;}
      }
    }
    placed.push(point);item.x=point.x;item.y=point.y;
  }
}
export function siteGuide(layout) {
  const names={road:'Узбіччя та бічна стежка',field:'Межа поля й залишки садиби',beach:'Берегова смуга й стежка до води',fair:'Перехрестя та фундаменти яток',trail:'Старий шлях і кам’яні рештки',forest:'Лісова стежка, колоди й галявина',orchard:'Прохід між деревами та сліди садиби',river:'Стежка й суха смуга берега',grass:'Стежка через галявину'};
  return (names[layout.terrain]||names.grass)+'. Біля орієнтирів можуть бути скупчення сигналів, зокрема сміття. Окремі знахідки трапляються по всій ділянці.';
}
