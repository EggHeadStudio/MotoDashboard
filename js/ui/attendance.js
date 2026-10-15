import {registerGroupSection} from '../group-ui.js';
import {loadAttendance,saveAttendance} from '../firebase/attendanceRepository.js';
import {element,labelText,button} from './forms.js';
import {loadDisplayProfiles} from '../firebase/displayProfiles.js';
import {dataErrorMessage} from '../firebase/access.js';
export function initAttendance(){
  registerGroupSection(async({uid,model,body,action,stillCurrent})=>{
    const section=element('section','feature-card');section.id='group-attendance';body.append(section);
    section.append(labelText(element('h3'),'rsvp.title'),labelText(element('p','muted'),'rsvp.hint'));
    let data;try{data=await loadAttendance(uid,model.group.id,{organizer:model.manager});}
    catch(error){if(stillCurrent())section.append(element('p','feature-status',dataErrorMessage(error)));return;}
    if(!stillCurrent())return;
    const controls=element('div','feature-actions');controls.setAttribute('role','group');
    for(const choice of ['going','interested','not-going']){
      const control=button('rsvp.'+choice,()=>action(owner=>saveAttendance(owner,model.group.id,choice)));control.dataset.rsvp=choice;
      control.setAttribute('aria-pressed',String(data.choice===choice));control.disabled=model.banned||!['scheduled','active'].includes(model.group.state);controls.append(control);
    }
    section.append(controls,labelText(element('p'),'rsvp.count',data.summary));
    if(model.manager&&data.rows.length){const names=await loadDisplayProfiles(uid,data.rows.map(row=>row.uid));if(!stillCurrent())return;
      for(const row of data.rows){const name=names.get(row.uid)?.displayName;if(name){const line=element('p');line.append(element('span','',name+' · '),labelText(element('span'),'rsvp.'+row.choice));section.append(line);}}
    }
  });
}
