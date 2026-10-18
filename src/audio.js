// Original synthesized audio: no downloaded tracks or sound files.
export function createGameAudio(){
 let context=null,musicBus=null,effectsBus=null,timer=null,scene='lobby',paused=false,hidden=false,step=0;
 const musicVoices=new Set();
 let preferences={music:true,effects:true};
 try{const saved=JSON.parse(localStorage.getItem('animal-audio-v1'));for(const key of ['music','effects'])if(typeof saved?.[key]==='boolean')preferences[key]=saved[key];}catch{}
 const melodies={
  lobby:[72,76,79,76,74,77,81,77,76,79,84,79,74,77,79,null,72,76,79,84,81,79,76,74,77,81,79,77,76,74,72,null],
  arena:[60,67,72,67,64,67,74,67,65,69,72,69,67,71,74,71,60,67,76,72,64,71,74,71,65,69,77,74,67,71,72,null]
 };
 const frequency=note=>440*2**((note-69)/12);
 function tone(note,at,duration,volume,bus,type='sine',music=false){
  if(note===null)return;
  const oscillator=context.createOscillator(),gain=context.createGain();
  oscillator.type=type;oscillator.frequency.setValueAtTime(frequency(note),at);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  oscillator.connect(gain);gain.connect(bus);oscillator.start(at);oscillator.stop(at+duration+.02);
  if(music)musicVoices.add(oscillator);
  oscillator.onended=()=>{musicVoices.delete(oscillator);oscillator.disconnect();gain.disconnect();};
 }
 function stopMusic(){
  clearInterval(timer);timer=null;
  for(const voice of musicVoices){try{voice.stop();}catch{}}musicVoices.clear();
 }
 function sync(){
  if(!context)return;
  musicBus.gain.value=preferences.music ? 0.22 : 0;effectsBus.gain.value=preferences.effects ? 0.5 : 0;
  if(hidden||paused){stopMusic();context.suspend().catch(()=>{});return;}
  if(context.state!=='running')return;
  if(!preferences.music||!melodies[scene]){stopMusic();return;}
  if(timer)return;
  const beat=scene==='arena'?280:380;
  const play=()=>{
   if(context.state!=='running'||hidden||paused)return;
   const at=context.currentTime+.015;
   tone(melodies[scene][step%32],at,beat/1000*.8,.15,musicBus,'triangle',true);
   if(step%4===0)tone([48,53,48,55][Math.floor(step/4)%4],at,.65,.11,musicBus,'sine',true);
   step++;
  };
  play();timer=setInterval(play,beat);
 }
 async function unlock(){
  if(hidden||paused)return;
  try{
   if(!context){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;context=new Audio();musicBus=context.createGain();effectsBus=context.createGain();musicBus.connect(context.destination);effectsBus.connect(context.destination);}
   if(context.state!=='running')await context.resume();
   sync();
  }catch{/* Audio availability never blocks the game. */}
 }
 function effect(name){
  if(!context||context.state!=='running'||!preferences.effects||hidden||paused)return;
  const at=context.currentTime+.005;
  if(name==='flip'){
   const size=Math.ceil(context.sampleRate*.09),buffer=context.createBuffer(1,size,context.sampleRate),data=buffer.getChannelData(0);
   for(let i=0;i<size;i++)data[i]=(Math.random()*2-1)*(1-i/size);
   const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=2000;filter.Q.value=.7;
   gain.gain.setValueAtTime(.22,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.09);source.connect(filter);filter.connect(gain);gain.connect(effectsBus);source.start(at);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};return;
  }
  const sounds={bell:[[88,0,.7,.3],[100,0,.35,.08]],correct:[[76,0,.15,.2],[79,.12,.24,.2]],wrong:[[52,0,.18,.2],[47,.15,.25,.18]],win:[[72,0,.2,.2],[76,.15,.2,.2],[79,.3,.2,.2],[84,.48,.6,.22]],lose:[[67,0,.25,.17],[64,.2,.25,.17],[60,.4,.45,.17]]};
  for(const[note,offset,length,volume]of sounds[name]||[])tone(note,at+offset,length,volume,effectsBus);
 }
 return {
  unlock,effect,
  setScene(next){if(next!==scene){stopMusic();step=0;scene=next;}sync();},
  setPaused(value){paused=value;if(value)sync();else if(context)void unlock();},
  setHidden(value){hidden=value;if(value)sync();else if(context)void unlock();},
  toggle(key){if(!['music','effects'].includes(key))return;preferences[key]=!preferences[key];try{localStorage.setItem('animal-audio-v1',JSON.stringify(preferences));}catch{}sync();return preferences[key];},
  enabled(key){return preferences[key];}
 };
}
export const gameAudio=createGameAudio();
