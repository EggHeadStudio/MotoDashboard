import { color, enumValue, THEMES } from './schema.js';

export function luminance(hex) {
  const rgb=color(hex).slice(1).match(/../g).map(pair=>parseInt(pair,16)/255)
    .map(value=>value<=0.04045 ? value/12.92 : ((value+0.055)/1.055)**2.4);
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
}
export function contrast(a,b) {const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
export function readableText(background) {return contrast(background,'#ffffff')>=contrast(background,'#000000')?'#ffffff':'#000000';}
// Controlled data preparation only; no Group Session or live-map behavior.
export function clubSessionTheme(club) {
  return {mapTheme:enumValue(club.mapTheme,THEMES),routeColor:color(club.routeColor || club.accentColor),
    primaryColor:color(club.primaryColor),accentColor:color(club.accentColor)};
}
