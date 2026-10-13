import {setGuestEntry, navigate} from './navigation.js';

export function initLanding() {
  for(const node of document.querySelectorAll('[data-auth-entry]')) node.addEventListener('click',()=>{
    const mode=document.getElementById('auth-mode');mode.value=node.dataset.authEntry;
    mode.dispatchEvent(new Event('change'));document.getElementById('account-btn').click();
  });
  document.getElementById('landing-try').addEventListener('click',()=>{setGuestEntry(true);navigate('home');});
  document.getElementById('guest-history').addEventListener('click',()=>navigate('rides'));
  document.getElementById('guest-home').addEventListener('click',()=>navigate('home'));
  document.getElementById('guest-landing').addEventListener('click',()=>{setGuestEntry(false);navigate('landing');});
  const shell=document.getElementById('start-overlay');
  document.getElementById('landing-explore').addEventListener('click',event=>{
    event.preventDefault();document.getElementById('landing-features').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  });
  // Content is visible by default. Only decorate after observer setup succeeds.
  if(!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  try {
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('revealed');observer.unobserve(entry.target);}
    },{root:shell,threshold:.05});
    for(const node of document.querySelectorAll('.landing-reveal')){observer.observe(node);node.classList.add('reveal-ready');}
  }catch{/* Progressive enhancement; never hide essential content. */}
}
