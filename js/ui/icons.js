// Small original line icons; no external fonts, images or runtime dependency.
const paths = {
  calendar:'M4 5h16v16H4ZM8 2v6m8-6v6M4 11h16M8 15h3m3 0h3m-9 3h3',
  shield:'M12 2 3 5v6c0 6 9 11 9 11s9-5 9-11V5Z',
  star:'m12 2 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z',
  flag:'M4 22V2m0 1h15l-4 5 4 5H4',
  wheel:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3v14M5 8l14 8M5 16l14-8',
  home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',
  discover: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4 6-3 5-5 3 3-5Z',
  rides: 'M4 21V6a3 3 0 0 1 6 0v12a3 3 0 0 0 6 0V3m-3 3 3-3 3 3',
  clubs: 'M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20v-3a5 5 0 0 1 10 0v3m0-7a5 5 0 0 1 10 4v3',
  profile: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM3 22v-2a9 9 0 0 1 18 0v2',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  plus: 'M12 4v16M4 12h16',
  bell: 'M18 8a6 6 0 0 0-12 0v6l-2 3h16l-2-3ZM9 20a3 3 0 0 0 6 0',
  open: 'M3 12h18M12 3v18M5 5l14 14M5 19 19 5',
  motorcycle: 'M7 17a3.5 3.5 0 1 0-7 0 3.5 3.5 0 0 0 7 0Zm17 0a3.5 3.5 0 1 0-7 0 3.5 3.5 0 0 0 7 0ZM3.5 17l5-6 5 1 2 5H9l-2-4M17 6h2l1.5 11M15 9l-1 3h-5V9Zm-8 0H4m13-3-2 3h4M10 15h3',
  car: 'M3 16v-6l3-6h12l3 6v6ZM3 10h18M6 16v4m12-4v4M6 13h2m8 0h2',
  bicycle: 'M9 17a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm14 0a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM5 17l5-9 5 9H5m10 0 3-11h3M8 5h4',
  'off-road': 'M2 16V8h16l4 4v4M6 8V4h9v4M9 8v8m6-8v8M8 17a3 3 0 1 0-6 0 3 3 0 0 0 6 0Zm14 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z',
  snowmobile: 'M2 19h17l3-3M5 15l3-8h6l5 8H5m7-8-1-4h4',
  caravan: 'M2 17V5h16v12Zm2-9h5v5H4m9-5h3v9m2-3h4v4M9 18a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z',
  other: 'M4 16 12 3l8 13ZM2 21h20',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4v6l4 2',
  pin: 'M12 22S4 15 4 9a8 8 0 0 1 16 0c0 6-8 13-8 13Zm0-16a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'
};
export function icon(name, className = '') {
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '-2 0 28 24'); svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false'); svg.setAttribute('class', 'md-icon ' + className);
  const path = document.createElementNS(ns, 'path'); path.setAttribute('d', paths[name] || paths.other); svg.append(path); return svg;
}
export function vehicleIcon(category) {
  return icon(({ moped:'motorcycle', scooter:'motorcycle', 'atv-utv':'off-road', 'e-bike':'bicycle', 'e-scooter':'bicycle' })[category] || category);
}
