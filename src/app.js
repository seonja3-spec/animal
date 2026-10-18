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
function show(id){document.body.dataset.screen=id;['lobby','arena','result'].forEach(s=>$(s).hidden=s!==id);}
function select(i){selected=i;[...$('levels').children].forEach((b,j)=>{b.classList.toggle('chosen',i===j);b.setAttribute('aria-pressed',String(i===j));});$('start').textContent=`${levels[i].name} 대전 시작 · ${levels[i].fee}🪙`;}
const levelDescriptions=['천천히 감 잡기','익숙해졌다면 도전!','빠른 눈과 손이 필요해요','한순간도 방심 금지!'];
const levelIcons=['🌱','🍀','🔥','👑'];
levels.forEach((level,i)=>{const b=document.createElement('button');b.className='level';b.innerHTML=`<span class="level-icon" aria-hidden="true">${levelIcons[i]}</span><strong>${level.name}</strong><span>${levelDescriptions[i]}</span><small>동물 ${level.species}종 · 참가 ${level.fee}🪙</small><small class="level-reward">이기면 ${level.reward}🪙</small>`;b.onclick=()=>select(i);$('levels').append(b);});
function card(el,c){
 el.replaceChildren();el.classList.toggle('empty',!c);
 const label=document.createElement('b');label.className='card-label';label.textContent=el.id==='cpuCard'?'상대 카드':'내 카드';el.append(label);
 if(!c){const waiting=document.createElement('span');waiting.className='card-waiting';waiting.textContent='?';el.append(waiting);el.setAttribute('aria-label','아직 공개된 카드 없음');return;}
 const a=animals.find(a=>a[0]===c.animal);el.setAttribute('aria-label',`${a[1]} ${c.count}마리`);
 const grid=document.createElement('div');grid.className='animal-grid';grid.dataset.count=c.count;
 const animal=document.createElement('img');animal.src=animalImage(c.animal);animal.alt='';animal.draggable=false;grid.append(animal);
 const count=document.createElement('strong');count.className='card-multiplier';count.textContent=`× ${c.count}`;
 el.append(grid,count);
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
function finish(){if(g.winner===null||settled)return;settled=true;clearTimers();if(g.winner===0){wallet.coins+=levels[selected].reward;save();}$('resultEmoji').textContent=g.winner===0?'🏆':'🌱';$('resultTitle').textContent=g.winner===0?'내가 이겼어요!':'다음엔 이길 수 있어요';$('resultMessage').textContent=g.winner===0?`승리 보상 ${levels[selected].reward}코인을 받았어요.`:'이번 대전의 승리 보상은 없어요.';show('result');}
function schedule(message){clearTimers();render(message);if(g.winner!==null){finish();return;}if(paused)return;
 const level=levels[selected];
 if(canRing(tops(g)))later(()=>doRing(1),level.min+Math.random()*(level.max-level.min));
 // Flip promptly, but keep a valid five visible until the bell is resolved.
 if(g.turn===1&&!canRing(tops(g)))later(()=>{flip(g,1);schedule();},180);
}
let bellAnimation;
function doRing(player){const outcome=ring(g,player);if(outcome!=='ignored'){$('bell').classList.add('ringing');clearTimeout(bellAnimation);bellAnimation=setTimeout(()=>$('bell').classList.remove('ringing'),350);}if(outcome==='ignored')return;if(outcome==='wrong'){render('앗! 다섯 마리가 아니에요. 상대에게 카드 1장을 줬어요.');finish();return;}schedule(outcome==='correct'?(player===0?'딩동! 공개 카드를 모두 가져왔어요.':'컴퓨터가 먼저 종을 눌렀어요!'):'앗! 다섯 마리가 아니에요. 상대에게 카드 1장을 줬어요.');}
$('start').onclick=()=>{if(!charge(wallet,levels[selected].fee)){$('lobbyMessage').textContent='코인이 부족해요. 오늘의 무료 코인을 확인해주세요. 광고 충전은 아직 연결 전입니다.';return;}save();g=createGame(selected);settled=false;paused=false;$('difficulty').textContent=`${levels[selected].name} · 동물 ${levels[selected].species}종`;show('arena');schedule();};
$('flip').onclick=()=>{if(!g||paused||g.turn!==0)return;flip(g,0);schedule();};
$('bell').onclick=()=>{if(g&&!paused)doRing(0);};
function pause(){if(!g||g.winner!==null)return;paused=true;clearTimers();render('잠시 쉬는 중이에요. 계속하기를 눌러주세요.');}
$('pause').onclick=()=>{if(paused){paused=false;schedule();}else pause();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',pause);
$('leave').onclick=()=>{pause();if(confirm('대전을 포기할까요? 참가비는 반환되지 않습니다.')){clearTimers();g=null;show('lobby');}};
$('home').onclick=()=>{g=null;show('lobby');};
$('daily').onclick=()=>{const claimed=claimDaily(wallet);save();$('lobbyMessage').textContent=claimed?'오늘의 무료 50코인을 받았어요!':'오늘은 이미 받았어요. 한국 시간 자정 이후 다시 받을 수 있어요.';};
$('ad').onclick=()=>{$('lobbyMessage').textContent='토스 보상형 광고 연동 준비 중입니다. 실제 광고 완료 확인 전에는 코인을 지급하지 않아요.';};
renderWallet();select(0);if(!storageAvailable)$('lobbyMessage').textContent='저장 기능을 사용할 수 없어 코인이 브라우저 종료 후 유지되지 않을 수 있어요.';
