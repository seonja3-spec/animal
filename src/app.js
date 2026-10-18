import {gameAudio} from './audio.js';
import {animals,levels,createGame,tops,canRing,flip,ring} from './rules.js';
import {claimDaily,charge,dayKey} from './wallet.js';
const animalFiles={rat:'mouse',ox:'cow',tiger:'tiger',rabbit:'rat',dragon:'yong',snake:'snake',horse:'hors',sheep:'yang',monkey:'mong',rooster:'ggo',dog:'dog',pig:'pig'};
const animalImage=(id)=>`/assets/animals/${animalFiles[id]}.webp`;
const $=id=>document.getElementById(id);
let wallet={coins:0,day:''},storageAvailable=true;
try{const saved=JSON.parse(localStorage.getItem('animal-wallet-v1'));if(saved&&Number.isSafeInteger(saved.coins)&&saved.coins>=0&&typeof saved.day==='string')wallet=saved;}catch{storageAvailable=false;}
let g=null,selected=0,paused=false,timers=[],generation=0,settled=false;
function save(){try{localStorage.setItem('animal-wallet-v1',JSON.stringify(wallet));}catch{storageAvailable=false;}renderWallet();}
function renderWallet(){
 $('coins').textContent=wallet.coins;
 const claimed=wallet.day===dayKey();
 $('daily').textContent=claimed?'오늘 수령 완료 ✓':'선물 받기';
 $('daily').disabled=claimed;
 $('daily').setAttribute('aria-label',claimed?'오늘의 무료 코인 수령 완료':'무료 50코인 받기');
}
function clearTimers(){generation++;timers.forEach(clearTimeout);timers=[];}
function later(fn,delay){const current=generation;timers.push(setTimeout(()=>{if(current===generation&&!paused&&g?.winner===null)fn();},delay));}
function show(id){gameAudio.setPaused(false);gameAudio.setScene(id==='arena'?'arena':id==='result'?'result':'lobby');document.body.dataset.screen=id;['lobby','difficultySelect','arena','result'].forEach(s=>$(s).hidden=s!==id);}
const levelDescriptions=['천천히 감 잡기','익숙해졌다면 도전!','빠른 눈과 손이 필요해요','한순간도 방심 금지!'];
levels.forEach((level,i)=>{const b=document.createElement('button');b.className='level';b.innerHTML=`<span class="level-sign"><strong>${level.name}</strong></span><span class="level-description">${levelDescriptions[i]}</span><small>동물 ${level.species}종 · 참가 ${level.fee}🪙</small><small class="level-reward">이기면 ${level.reward}🪙</small>`;b.setAttribute('aria-label',`${level.name} 대전 시작, 참가 ${level.fee}코인`);b.onclick=()=>startGame(i);$('levels').append(b);});
function card(el,c){
 el.replaceChildren();el.classList.toggle('empty',!c);
 const label=document.createElement('b');label.className='card-label';label.textContent=el.id==='cpuCard'?'상대 카드':'내 카드';el.append(label);
 if(!c){el.replaceChildren();const back=document.createElement('img');back.className='card-back-art';back.src='/assets/animals/card-back.webp';back.alt='';back.draggable=false;el.append(back);el.setAttribute('aria-label','아직 공개되지 않은 카드 뒷면');return;}
 const a=animals.find(a=>a[0]===c.animal);el.setAttribute('aria-label',`${a[1]} ${c.count}마리`);
 const grid=document.createElement('div');grid.className='animal-grid';grid.dataset.count=c.count;
 for(let i=0;i<c.count;i++){const animal=document.createElement('img');animal.src=animalImage(c.animal);animal.alt='';animal.draggable=false;grid.append(animal);}
 el.append(grid);
}
function render(message){
 const [mine,cpu]=tops(g);card($('myCard'),mine);card($('cpuCard'),cpu);
 $('myCount').textContent=`남은 카드 ${g.hands[0].length}장`;
 $('cpuCount').textContent=`남은 카드 ${g.hands[1].length}장`;
 $('message').textContent=message|| (g.turn===0?'내 차례예요. 카드를 넘겨주세요.':'컴퓨터가 카드를 넘길 차례예요.');
 $('flip').disabled=paused||g.turn!==0||g.winner!==null;
 $('bell').disabled=paused||g.winner!==null||!g.piles.some(p=>p.length);
 $('pause').textContent=paused?'계속하기':'일시정지';
}
function finish(){if(g.winner===null||settled)return;settled=true;clearTimers();if(g.winner===0){wallet.coins+=levels[selected].reward;save();}$('resultEmoji').textContent=g.winner===0?'🏆':'🌱';$('resultTitle').textContent=g.winner===0?'내가 이겼어요!':'다음엔 이길 수 있어요';$('resultMessage').textContent=g.winner===0?`승리 보상 ${levels[selected].reward}코인을 받았어요.`:'이번 대전의 승리 보상은 없어요.';show('result');gameAudio.effect(g.winner===0?'win':'lose');}
function schedule(message){clearTimers();render(message);if(g.winner!==null){finish();return;}if(paused)return;
 const level=levels[selected];
 if(canRing(tops(g)))later(()=>doRing(1),level.min+Math.random()*(level.max-level.min));
 // Flip promptly, but keep a valid five visible until the bell is resolved.
 if(g.turn===1&&!canRing(tops(g)))later(()=>{if(flip(g,1))gameAudio.effect('flip');schedule();},700);
}
let bellAnimation;
function doRing(player){const outcome=ring(g,player);if(outcome!=='ignored'){$('bell').classList.add('ringing');clearTimeout(bellAnimation);bellAnimation=setTimeout(()=>$('bell').classList.remove('ringing'),350);}if(outcome==='ignored')return;gameAudio.effect('bell');gameAudio.effect(outcome==='correct'?'correct':'wrong');if(outcome==='wrong'){render('앗! 다섯 마리가 아니에요. 상대에게 카드 1장을 줬어요.');finish();return;}schedule(outcome==='correct'?(player===0?'딩동! 공개 카드를 모두 가져왔어요.':'컴퓨터가 먼저 종을 눌렀어요!'):'앗! 다섯 마리가 아니에요. 상대에게 카드 1장을 줬어요.');}
function startGame(i){
 if(g&&g.winner===null)return;
 if(!charge(wallet,levels[i].fee)){$('difficultyMessage').textContent='코인이 부족해요. 처음 화면에서 오늘의 무료 코인을 확인해주세요.';$('getCoins').hidden=false;return;}
 selected=i;save();g=createGame(selected);settled=false;paused=false;
 $('difficultyMessage').textContent='';$('getCoins').hidden=true;
 $('difficulty').textContent=`${levels[selected].name} · 동물 ${levels[selected].species}종`;show('arena');schedule();
}
let welcomeBellTimer;
$('welcomeBell').onclick=()=>{gameAudio.effect('bell');clearTimeout(welcomeBellTimer);$('welcomeBell').classList.add('tapped');welcomeBellTimer=setTimeout(()=>$('welcomeBell').classList.remove('tapped'),350);};
$('start').onclick=()=>{$('difficultyMessage').textContent='';$('getCoins').hidden=true;show('difficultySelect');};
$('backLobby').onclick=$('getCoins').onclick=()=>show('lobby');
$('flip').onclick=()=>{if(!g||paused||g.turn!==0)return;if(flip(g,0))gameAudio.effect('flip');schedule();};
$('bell').onclick=()=>{if(g&&!paused)doRing(0);};
function pause(){if(!g||g.winner!==null)return;paused=true;gameAudio.setPaused(true);clearTimers();render('잠시 쉬는 중이에요. 계속하기를 눌러주세요.');}
$('pause').onclick=()=>{if(paused){paused=false;gameAudio.setPaused(false);schedule();}else pause();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();gameAudio.setHidden(document.hidden);});
window.addEventListener('pagehide',()=>{pause();gameAudio.setHidden(true);});
window.addEventListener('pageshow',()=>gameAudio.setHidden(document.hidden));
$('leave').onclick=()=>{pause();if(confirm('대전을 포기할까요? 참가비는 반환되지 않습니다.')){clearTimers();g=null;show('lobby');}};
$('home').onclick=()=>{g=null;show('lobby');};
$('daily').onclick=()=>{const claimed=claimDaily(wallet);save();$('lobbyMessage').textContent=claimed?'오늘의 무료 50코인을 받았어요!':'오늘은 이미 받았어요. 한국 시간 자정 이후 다시 받을 수 있어요.';};
renderWallet();show('lobby');if(!storageAvailable)$('lobbyMessage').textContent='저장 기능을 사용할 수 없어 코인이 브라우저 종료 후 유지되지 않을 수 있어요.';

function renderAudioSettings(){for(const [id,key,label]of [['musicToggle','music','배경음악'],['effectsToggle','effects','효과음']]){const on=gameAudio.enabled(key);$(id).textContent=`${label} ${on?'켜짐':'꺼짐'}`;$(id).setAttribute('aria-pressed',String(on));}}
$('musicToggle').onclick=()=>{gameAudio.toggle('music');renderAudioSettings();};
$('effectsToggle').onclick=()=>{gameAudio.toggle('effects');renderAudioSettings();};
document.addEventListener('pointerdown',()=>void gameAudio.unlock(),{capture:true});
document.addEventListener('click',()=>void gameAudio.unlock(),{capture:true});
document.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')void gameAudio.unlock();},{capture:true});
renderAudioSettings();

// Illustrated pressed state for keyboard activation as well as touch.
for(const button of [$('start'),...$('levels').children]){
 button.addEventListener('keydown',event=>{if(event.key===' '||event.key==='Enter')button.classList.add('wood-pressed');});
 for(const type of ['keyup','blur'])button.addEventListener(type,()=>button.classList.remove('wood-pressed'));
}
