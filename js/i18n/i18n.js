import { dictionary } from './dictionary.js';

const languageKey = 'moto-dashboard-language';
const listeners = new Set();
const bindings = new Map();
let language = 'en';

try {
  const saved = globalThis.localStorage?.getItem(languageKey);
  if (dictionary[saved]) language = saved;
} catch { /* Preferences are optional when browser storage is blocked. */ }

export const getLanguage = () => language;
export const getLocale = () => language === 'fi' ? 'fi-FI' : 'en-GB';

export function t(key, params = {}) {
  const value = dictionary[language]?.[key] ?? dictionary.en[key] ?? key;
  return value.replace(/\{(\w+)\}/g, (match, name) => params[name] == null ? match : String(params[name]));
}

export function formatNumber(value, decimals = 1) {
  return new Intl.NumberFormat(getLocale(), {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals
  }).format(value);
}

export function resolveText(value) {
  while (typeof value === 'function') value = value();
  return value == null ? '' : String(value);
}

// Retain render functions, never reverse-translate user content.
export function setLocalizedText(element, render) {
  if (!element) return;
  bindings.set(element, render);
  element.textContent = resolveText(render);
}

export function onLanguageChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function translateDocument(root = document) {
  root.documentElement?.setAttribute('lang', language);
  root.querySelectorAll('[data-i18n]').forEach(el => {
    if (!bindings.has(el)) el.textContent = t(el.dataset.i18n);
  });
  for (const attribute of ['aria-label', 'alt', 'content', 'placeholder', 'title']) {
    root.querySelectorAll(`[data-i18n-${attribute}]`).forEach(el => {
      el.setAttribute(attribute, t(el.getAttribute(`data-i18n-${attribute}`)));
    });
  }
  bindings.forEach((render, element) => {
    if (element.isConnected) element.textContent = resolveText(render);
    else bindings.delete(element);
  });
  const selector = root.getElementById?.('language-select');
  if (selector) selector.value = language;
}

export function setLanguage(next) {
  if (!dictionary[next]) next = 'en';
  language = next;
  try { globalThis.localStorage?.setItem(languageKey, language); } catch { /* Optional. */ }
  if (typeof document !== 'undefined') translateDocument();
  listeners.forEach(listener => listener(language));
}

export function initI18n() {
  translateDocument();
  document.getElementById('language-select')?.addEventListener('change', event => setLanguage(event.target.value));
}
