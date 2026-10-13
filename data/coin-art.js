// Photos of official NBU specimens; full provenance: assets/coins/sources.json.
// Side 0 in the viewer is always the denomination, regardless of mint terminology.
export const coinDesigns = {
  k1:{source:3303,year:2011,date:[188,395,134,61],font:44,diameter:16,thickness:1.2,mint:[343,377,39,36]},
  k2:{source:9675,year:2010,date:[184,399,142,61],font:41,diameter:17.3,thickness:1.2,mint:[348,385,37,38]},
  'k2-old':{year:1994,date:[178,406,145,65],font:42,diameter:17.3,thickness:1.2},
  k5:{source:3104,year:1992,date:[187,423,138,44],font:40,diameter:24,thickness:1.5},
  'k10-old':{source:3304,year:1992,date:[181,416,149,59],font:39,diameter:16.3,thickness:1.25},
  k10:{source:11192,year:2010,date:[188,408,132,46],font:41,diameter:16.3,thickness:1.25},
  'k25-old':{source:1970,year:1994,date:[190,418,134,48],font:40,diameter:20.8,thickness:1.35},
  k25:{source:11195,year:2006,date:[188,422,142,45],font:38,diameter:20.8,thickness:1.35},
  'k50-old':{source:3305,year:1992,date:[181,425,148,54],font:47,diameter:23,thickness:1.55},
  k50:{source:11198,year:2007,date:[191,420,128,44],font:38,diameter:23,thickness:1.55},
  'h1-trident':{source:3755,year:2001,date:[180,412,152,62],font:41,diameter:26,thickness:1.85,mint:[352,400,35,42]},
  'h1-gold':{source:3399,year:2006,date:[194,441,120,31],font:29,diameter:26,thickness:1.85,modern:true},
  h1:{source:140064,year:2018,date:[200,425,109,36],font:32,diameter:18.9,thickness:1.7,modern:true},
  h2:{source:140065,year:2018,date:[200,425,110,36],font:32,diameter:20.2,thickness:1.8,modern:true},
  h5:{source:190032,year:2018,date:[201,424,110,34],font:31,diameter:22.1,thickness:2.1,modern:true},
  h10:{source:219691,year:2018,date:[197,422,116,37],font:32,diameter:23.5,thickness:2.3,modern:true}
};
export function coinDesignKey(item) {
  if(item.country!=='Україна')return null;
  if(item.unit?.startsWith('гр'))return item.value===1 ? (item.year<2004?'h1-trident':item.year<2018?'h1-gold':'h1') : 'h'+item.value;
  if(item.unit?.startsWith('коп'))return 'k'+item.value+([2,10,25,50].includes(item.value)&&item.year<2000?'-old':'');
  return null;
}
export function coinDesign(item) { return coinDesigns[coinDesignKey(item)] || null; }
export function coinSource(item) {
  if(item.value===2&&item.unit?.startsWith('коп')&&item.year<2000)return 'https://monety.in.ua/ukraine/2-kopeyki/2-kopeyki-1994';
  if(item.value===1&&item.unit?.startsWith('коп')&&item.year===1992)return item.variant==='1.2АА'?'https://monety-yagidky.com.ua/ukraine/1-kopiyka-1992':'https://monety.in.ua/ukraine/1-kopeyka/1-kopeyka-1992';
  if(item.variant==='1АГс'||item.variant==='2АД2')return item.source;
  const d=coinDesign(item);return d?'https://en.numista.com/'+d.source:null;
}
export function coinEdgeSpec(item) {
  if(item.unit?.startsWith('гр')) {
    if(item.year<2018)return {kind:item.year===1992?'smooth':'lettered',text:'ОДНА ГРИВНЯ · '+item.year+' ·'};
    return {kind:item.value===5?'sector':'reeded',groups:6,teeth:10};
  }
  if(item.value<=2)return {kind:'smooth'};
  if(item.value===5)return {kind:'reeded',count:item.variant==='1.1ААк'?84:144};
  if(item.value===10)return {kind:'reeded',count:128};
  return {kind:'sector',groups:6,teeth:item.variant==='1АГс'?8:16};
}
