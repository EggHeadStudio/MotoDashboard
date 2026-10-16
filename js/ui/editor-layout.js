import {element,labelText} from './forms.js';
import {sectionNavigation} from './section-nav.js';

// Move existing controls; preserve IDs, FormData, handlers, validation and values.
export function formSections(form,groups){
  const sections=[];
  for(const {key,names} of groups){
    const section=element('fieldset','editor-section');section.id=form.id+'-section-'+sections.length;
    section.append(labelText(element('legend'),key));
    for(const name of names){
      const control=form.elements.namedItem(name),wrap=control?.closest('.field');if(!wrap)continue;
      const extra=wrap.nextElementSibling;
      section.append(wrap);if(extra?.matches('.color-palette,.palette-controls'))section.append(extra);
    }
    if(section.children.length>1)sections.push({node:section,key});
  }
  // Navigation targets must be inside this form before creating the links.
  form.prepend(...sections.map(section=>section.node));
  const links=sectionNavigation(form,sections,{label:'ux.editSections'});form.prepend(links);
  const actions=element('div','editor-actions');
  for(const node of [...form.children])if(node.matches('button'))actions.append(node);
  if(actions.children.length)form.append(actions);
}
