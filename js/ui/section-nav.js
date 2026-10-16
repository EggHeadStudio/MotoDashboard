import {element,button} from './forms.js';
import {t} from '../i18n/i18n.js';

// In-page navigation only: never refetch a model, change a route or infer access.
export function sectionNavigation(root,sections,{label='ux.sections'}={}) {
  const nav=element('nav','section-nav');nav.setAttribute('aria-label',t(label));
  nav.setAttribute('data-i18n-aria-label',label);
  for(const {node,key} of sections){
    if(!node||!root.contains(node))continue;
    const control=button(key,()=>{
      const disclosure=node.matches('details')?node:node.querySelector('details');
      if(disclosure)disclosure.open=true;
      const heading=node.querySelector('h2,h3,h4,summary') || node;
      if(!heading.matches('summary'))heading.tabIndex=-1;
      node.scrollIntoView({block:'start',behavior:'instant'});heading.focus({preventScroll:true});
    });
    if(node.id)control.setAttribute('aria-controls',node.id);nav.append(control);
  }
  return nav;
}
