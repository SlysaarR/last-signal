import { phrases } from '../locales/en.js?v=0.55.0';
export const LANGUAGE_KEY = 'last-signal-language';
export let language = 'uk';
const cyrillic = /[А-Яа-яІіЇїЄєҐґ]/;
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const entries = Object.keys(phrases).sort((a,b)=>b.length-a.length);
const letters = 'А-Яа-яІіЇїЄєҐґ';
// Guard actual word edges; punctuation-ending fragments can precede dynamic names.
const pattern = new RegExp(entries.map(key =>
  (cyrillic.test(key[0]) ? '(?<!['+letters+'])' : '') + escapeRegex(key) +
  (cyrillic.test(key.at(-1)) ? '(?!['+letters+'])' : '')
).join('|'),'g');
const cache = new Map();

// Translate at presentation boundaries. Catalogue values, filters, saves and
// coin inscriptions remain canonical; no mutation observer scans the game.
export function t(value) {
  if (language !== 'en' || typeof value !== 'string' || !cyrillic.test(value)) return value;
  if (cache.has(value)) return cache.get(value);
  const trimmed = value.trim();
  const translated = Object.hasOwn(phrases,trimmed)
    ? value.replace(trimmed,()=>phrases[trimmed])
    : pattern ? value.replace(pattern,key=>phrases[key]) : value;
  if (cache.size >= 1024) cache.delete(cache.keys().next().value);
  cache.set(value,translated);
  return translated;
}
const escapeAttribute = (value,quote) => String(value).replace(/&/g,'&amp;').replace(quote === '"' ? /"/g : /'/g,quote === '"' ? '&quot;' : '&#39;');
export function translateHTML(value) {
  if (language !== 'en' || typeof value !== 'string' || !cyrillic.test(value)) return value;
  let end=0,result='';
  for (const match of value.matchAll(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g)) {
    result += t(value.slice(end,match.index));
    result += match[0].replace(/\b((?:aria-label|title|placeholder|alt)\s*=\s*)(["'])(.*?)\2/g,(_,prefix,quote,text)=>prefix+quote+escapeAttribute(t(text),quote)+quote);
    end = match.index + match[0].length;
  }
  return result + t(value.slice(end));
}
export function initLocale() {
  try { language = localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'uk'; } catch { language = 'uk'; }
  document.documentElement.lang = language;
  document.title = language === 'en' ? 'Last Signal' : 'Останній сигнал';
  // One walk before listeners bind. Later writes use t/translateHTML explicitly.
  if (language !== 'en' || !document.createTreeWalker) return;
  const walker = document.createTreeWalker(document.body,4);
  for (let node=walker.nextNode();node;node=walker.nextNode()) {
    if (node.parentElement?.closest('script,style,#language')) continue;
    node.nodeValue = t(node.nodeValue);
  }
  for (const node of document.querySelectorAll('[aria-label],[title],[placeholder],[alt]')) {
    for (const attr of ['aria-label','title','placeholder','alt']) {
      if (node.hasAttribute(attr)) node.setAttribute(attr,t(node.getAttribute(attr)));
    }
  }
}
export function changeLanguage(next) {
  if (!['uk','en'].includes(next)) return false;
  try { localStorage.setItem(LANGUAGE_KEY,next); } catch { return false; }
  window.location.reload();
  return true;
}
export const dateLocale = () => language === 'en' ? 'en-GB' : 'uk-UA';
