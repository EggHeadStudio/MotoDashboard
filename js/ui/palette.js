import {element,labelText,button,field} from './forms.js';
import {readableText} from '../data/branding.js';
const colors={gold:'#e9bf73',ocean:'#6bbde9',forest:'#7cd29d',rose:'#f9a3bb',slate:'#1c2530',navy:'#162438',charcoal:'#242424'};
export function decoratePalette(select) {
  const wrap=select.closest('label'),group=element('div','color-palette');group.setAttribute('role','group');
  group.setAttribute('aria-labelledby',select.id+'-label');wrap.firstChild.id=select.id+'-label';
  const controls=[];
  for(const option of select.options){if(!colors[option.value])continue;
    const control=element('button','color-swatch');control.type='button';control.style.setProperty('--swatch',colors[option.value]);
    control.setAttribute('aria-label',option.textContent);control.title=option.textContent;
    control.addEventListener('click',()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));});
    controls.push([control,option.value]);group.append(control);
  }
  const sync=()=>{for(const [control,value] of controls)control.setAttribute('aria-pressed',String(select.value===value));};
  select.addEventListener('change',sync);sync();wrap.after(group);return group;
}
export function colorField(form,name,key,{value=null,optional=false}={}) {
  const initial=value || '',stored=field(form,name,key,{value:initial});stored.type='hidden';
  const wrap=stored.parentElement;const picker=element('input');picker.type='color';picker.id=stored.id+'-picker';picker.value=initial || '#e9bf73';
  picker.setAttribute('aria-labelledby',stored.id+'-label');wrap.firstChild.id=stored.id+'-label';wrap.append(picker);
  const controls=element('div','palette-controls');wrap.after(controls);
  const swatches=element('div','color-palette');controls.append(swatches);
  const preview=element('div','color-preview');controls.append(preview);
  const draw=()=>{const color=stored.value || '#101214';preview.style.backgroundColor=color;preview.style.color=readableText(color);labelText(preview,stored.value?'palette.color':'publicProfile.none');};
  picker.addEventListener('input',()=>{stored.value=picker.value;stored.dispatchEvent(new Event('change',{bubbles:true}));draw();});
  for(const [key,color] of Object.entries(colors)){
    const swatch=button('media.preset.'+key,()=>{picker.value=stored.value=color;stored.dispatchEvent(new Event('change',{bubbles:true}));draw();});
    swatch.className='color-swatch';swatch.style.setProperty('--swatch',color);swatch.setAttribute('aria-label',swatch.textContent);swatch.textContent='';swatches.append(swatch);
  }
  controls.append(button('palette.reset',()=>{stored.value=initial;picker.value=initial || '#e9bf73';stored.dispatchEvent(new Event('change',{bubbles:true}));draw();}));
  if(optional)controls.append(button('publicProfile.none',()=>{stored.value='';stored.dispatchEvent(new Event('change',{bubbles:true}));draw();}));
  stored.addEventListener('change',draw);draw();return stored;
}
