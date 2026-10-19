import {SafeArea,getAppsInTossGlobals} from '@apps-in-toss/web-framework';

// One native safe-area subscription, not a per-frame bridge call.
export function initializePlatformLayout(){
 const root=document.documentElement;
 if(typeof SafeArea==='undefined'){root.dataset.runtime='browser';return ()=>{};}
 let native=false;
 try{native=Boolean(getAppsInTossGlobals()?.deploymentId);}catch{}
 function apply(insets){
  if(!insets||!['top','bottom','left','right'].every(key=>Number.isFinite(insets[key])&&insets[key]>=0))return false;
  for(const side of ['top','bottom','left','right'])root.style.setProperty('--sdk-safe-'+side,`${insets[side]}px`);
  return true;
 }
 try{native=apply(SafeArea.get())||native;}catch{}
 root.dataset.runtime=native?'toss':'browser';
 let unsubscribe;
 if(native){try{unsubscribe=SafeArea.subscribe({onEvent:apply});}catch{}}
 return ()=>{if(unsubscribe){unsubscribe();unsubscribe=null;}};
}
