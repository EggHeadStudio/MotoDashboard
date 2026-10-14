export const THEME_DEFAULTS={accent:'gold',secondary:'slate',header:'road',card:'outlined',layout:'grid',icon:'shield',badge:'plain'};
export const THEME_OPTIONS={accent:['gold','ocean','forest','rose'],secondary:['slate','navy','charcoal'],header:['road','horizon','grid'],
  card:['outlined','solid','minimal'],layout:['grid','list'],icon:['shield','star','flag','wheel'],badge:['plain','pill','crest']};
export function validateTheme(value) {
  if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).length!==7)throw Error('bad_request');
  for(const [key,values] of Object.entries(THEME_OPTIONS))if(!values.includes(value[key]))throw Error('bad_request');
  return {...value};
}
