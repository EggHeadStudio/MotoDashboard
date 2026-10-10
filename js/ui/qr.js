import { qrcodegen } from '../vendor/qrcodegen.js';
import { labelText } from './forms.js';

export function invitationQR(url) {
  const parsed=new URL(url),base=new URL('./',document.baseURI);
  if(parsed.origin!==base.origin || parsed.pathname!==base.pathname || url.length>1000
    || !/^#\/session\/[A-Za-z0-9_-]{1,100}(?:\/invite\/[A-Za-z0-9_-]{1,100})?$/.test(parsed.hash)) throw new Error('invalid-invitation-url');
  const qr=qrcodegen.QrCode.encodeText(parsed.href,qrcodegen.QrCode.Ecc.MEDIUM);
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.classList.add('invitation-qr');svg.setAttribute('viewBox',`0 0 ${qr.size+8} ${qr.size+8}`);
  svg.setAttribute('role','img');svg.setAttribute('aria-labelledby','invitation-qr-title');
  const title=document.createElementNS(ns,'title');title.id='invitation-qr-title';labelText(title,'groups.qr');
  const white=document.createElementNS(ns,'rect');white.setAttribute('width','100%');white.setAttribute('height','100%');white.setAttribute('fill','#fff');
  const dark=document.createElementNS(ns,'path');dark.setAttribute('fill','#000');
  const parts=[];for(let y=0;y<qr.size;y++) for(let x=0;x<qr.size;x++) if(qr.getModule(x,y)) parts.push(`M${x+4},${y+4}h1v1h-1z`);
  dark.setAttribute('d',parts.join(''));svg.append(title,white,dark);return svg;
}
