import { activeSite, selectedSite, routeForCurrent, canScout, MAX_SITES } from '../data/atlas.js?v=0.48.0';
import { s } from './storage.js?v=0.48.0';
export function ensureAtlas() {
  if(!s.atlas)s.atlas={version:1,nextId:1,activeId:null,selectedId:null,sites:[]};
  if(!s.atCamp&&!activeSite(s))rememberCurrent(routeForCurrent(s).id);
  return s.atlas;
}
export function rememberCurrent(route) {
  const atlas=s.atlas;
  if(atlas.sites.length>=MAX_SITES)throw new Error('Atlas is full');
  const site={id:atlas.nextId++,route,location:s.location,emergency:!!s.emergency,condition:s.progress?.active?.condition||0,
    createdDay:s.day,lastDay:s.day,visits:1,found:0,productive:false,field:null};
  atlas.sites.push(site);atlas.activeId=site.id;
  if(s.progress?.active)s.progress.active.siteId=site.id;
  return site;
}
export function parkCurrent() {
  const site=activeSite(s);if(!site)return;
  // Transfer ownership of arrays. The next field replaces its top-level arrays;
  // the active field is never serialized twice or copied on pointer movement.
  site.field={x:s.x,y:s.y,objects:s.objects,holes:s.holes,survey:s.survey};
  if(s.site)site.field.site=s.site;
  if(s.fieldMarks)site.field.fieldMarks=s.fieldMarks;
  s.atlas.activeId=null;
}
export function restoreSite(site) {
  const field=site.field;
  s.location=site.location;s.emergency=site.emergency;
  for(const key of ['x','y','objects','holes','survey'])s[key]=field[key];
  for(const key of ['site','fieldMarks']){if(field[key]!==undefined)s[key]=field[key];else delete s[key];}
  site.field=null;site.visits++;site.lastDay=s.day;s.atlas.activeId=site.id;
}
export function selectSite(id) {
  const atlas=ensureAtlas();
  if(id!==null&&!atlas.sites.some(site=>site.id===id))return false;
  atlas.selectedId=id;return true;
}
export function forgetSite(id) {
  if(!s.atCamp||s.pending||!s.atlas)return false;
  const site=s.atlas.sites.find(site=>site.id===id);
  if(!site||site.id===s.atlas.activeId||!site.field)return false;
  s.atlas.sites=s.atlas.sites.filter(entry=>entry!==site);
  if(s.atlas.selectedId===id)s.atlas.selectedId=null;
  return true;
}
export {activeSite,selectedSite,canScout};
