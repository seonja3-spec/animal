import {loadProgress,recordMatch} from './progress.js';
import {gameAudio} from './audio.js';
import {animals,levels,createGame,tops,canRing,flip,ring} from './rules.js';
import {claimDaily,charge,dayKey} from './wallet.js';
const animalFiles={rat:'mouse',ox:'cow',tiger:'tiger',rabbit:'rat',dragon:'yong',snake:'snake',horse:'hors',sheep:'yang',monkey:'mong',rooster:'ggo',dog:'dog',pig:'pig'};
const animalImage=(id)=>`/assets/animals/${animalFiles[id]}.webp`;
const $=id=>document.getElementById(id);
let wallet={coins:0,day:''},storageAvailable=true;
try{const saved=JSON.parse(localStorage.getItem('animal-wallet-v1'));if(saved&&Number.isSafeInteger(saved.coins)&&saved.coins>=0&&typeof saved.day==='string')wallet=saved;}catch{storageAvailable=false;}
const visualAnimations=new Set();let feedbackTimer;
let g=null,selected=0,paused=false,timers=[],generation=0,settled=false;
let progress;try{progress=loadProgress(localStorage);}catch{progress=loadProgress(null);}
let vibrationEnabled=false;try{vibrationEnabled=localStorage.getItem('animal-vibration-v1')==='true';}catch{}
let activeSince=0,matchElapsed=0;
function saveProgress(){try{localStorage.setItem('animal-progress-v1',JSON.stringify(progress));}catch{}}
function elapsedMatch(){return matchElapsed+(paused?0:Math.max(0,performance.now()-activeSince));}
function formatDuration(ms){const seconds=Math.max(1,Math.ceil(ms/1000));return `${Math.floor(seconds/60)}분 ${seconds%60}초`;}

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
function show(id){gameAudio.setPaused(false);gameAudio.setScene(id==='arena'?'arena':id==='result'?'result':'lobby');clearVisuals();document.body.dataset.screen=id;['lobby','difficultySelect','arena','result'].forEach(s=>$(s).hidden=s!==id);}
const levelDescriptions=['천천히 감 잡기','익숙해졌다면 도전!','빠른 눈과 손이 필요해요','한순간도 방심 금지!'];
levels.forEach((level,i)=>{const b=document.createElement('button');b.className='level';b.innerHTML=`<span class="level-sign"><strong>${level.name}</strong></span><span class="level-description">${levelDescriptions[i]}</span><small>동물 ${level.species}종 · 참가 ${level.fee}🪙</small><small class="level-reward">이기면 ${level.reward}🪙</small>`;b.setAttribute('aria-label',`${level.name} 대전 시작, 참가 ${level.fee}코인`);b.onclick=()=>startGame(i);$('levels').append(b);});
function card(el,c){
 el.replaceChildren();el.classList.toggle('empty',!c);
 const label=document.createElement('b');label.className='card-label';label.textContent=el.dataset.label||(el.id==='cpuCard'?'상대 카드':'내 카드');el.append(label);
 if(!c){el.replaceChildren();const back=document.createElement('img');back.className='card-back-art';back.src='/assets/animals/card-back.webp';back.alt='';back.draggable=false;el.append(back);el.setAttribute('aria-label','아직 공개되지 않은 카드 뒷면');return;}
 const a=animals.find(a=>a[0]===c.animal);el.setAttribute('aria-label',`${a[1]} ${c.count}마리`);
 const grid=document.createElement('div');grid.className='animal-grid';grid.dataset.count=c.count;
 for(let i=0;i<c.count;i++){const animal=document.createElement('img');animal.src=animalImage(c.animal);animal.alt='';animal.draggable=false;grid.append(animal);}
 el.append(grid);
}
function render(message){
 const [mine,cpu]=tops(g);card($('myCard'),mine);card($('cpuCard'),cpu);
 updateDeck('myDeck',g.hands[0].length);updateDeck('cpuDeck',g.hands[1].length);
 $('myCount').textContent=`남은 카드 ${g.hands[0].length}장`;
 $('cpuCount').textContent=`남은 카드 ${g.hands[1].length}장`;
 $('message').textContent=message|| (g.turn===0?'내 차례예요. 카드를 넘겨주세요.':'컴퓨터가 카드를 넘길 차례예요.');
 $('flip').disabled=paused||g.turn!==0||g.winner!==null;
 $('bell').disabled=paused||g.winner!==null||!g.piles.some(p=>p.length);
 $('pause').textContent=paused?'계속하기':'일시정지';
}
function finish(){
 if(g.winner===null||settled)return;
 settled=true;clearTimers();const won=g.winner===0;const duration=elapsedMatch();recordMatch(progress,won,selected,duration);saveProgress();$('resultStats').textContent=`이번 대전 ${formatDuration(duration)} · 누적 ${progress.wins}승`;
 if(won){wallet.coins+=levels[selected].reward;save();}
 $('result').dataset.outcome=won?'win':'lose';
 $('resultArt').src=won?'/assets/animals/result-win.webp':'/assets/animals/result-lose.webp';
 $('resultArt').alt=won?'종 주위에서 함께 축하하는 동물 친구들':'속상한 호랑이를 위로해 주는 동물 친구들';
 $('resultBadge').textContent=won?'딩동! 멋진 승리':'괜찮아, 다음 판이 있잖아';
 $('resultTitle').textContent=won?'오늘의 주인공은 나!':'다음엔 함께 웃어요';
 $('resultMessage').textContent=won?`승리 보상 ${levels[selected].reward}코인을 받았어요.`:'이번엔 아쉽지만, 친구들이 응원하고 있어요. 승리 보상은 없어요.';
 show('result');gameAudio.effect(won?'win':'lose');
}
function schedule(message){clearTimers();render(message);if(g.winner!==null){finish();return;}if(paused)return;
 const level=levels[selected];
 if(canRing(tops(g)))later(()=>doRing(1),level.min+Math.random()*(level.max-level.min));
 // Flip promptly, but keep a valid five visible until the bell is resolved.
 if(g.turn===1&&!canRing(tops(g)))later(()=>turnCard(1),700);
}
let bellAnimation;
function doRing(player){
 const visiblePiles=[g.piles[1].length?$('cpuCard'):null,g.piles[0].length?$('myCard'):null].filter(Boolean);
 const snapshots=canRing(tops(g))?visiblePiles.map(el=>el.cloneNode(true)):[];
 const rects=snapshots.length?visiblePiles.map(el=>el.getBoundingClientRect()):[];
 const taken=g.piles[0].length+g.piles[1].length;
 const outcome=ring(g,player);if(outcome==='ignored')return;
 $('bell').classList.add('ringing');clearTimeout(bellAnimation);bellAnimation=setTimeout(()=>$('bell').classList.remove('ringing'),350);
 gameAudio.effect('bell');gameAudio.effect(outcome==='correct'?'correct':'wrong');
 if(vibrationEnabled&&typeof navigator.vibrate==='function'){try{navigator.vibrate(outcome==='correct'?20:[15,40,15]);}catch{}}
 if(outcome==='wrong'){render('앗! 다섯 마리가 아니에요. 상대에게 카드 1장을 줬어요.');finish();}
 else schedule(player===0?'딩동! 공개 카드를 모두 가져왔어요.':'컴퓨터가 먼저 종을 눌렀어요!');
 if(g.winner===null){showJudgement(outcome,player,taken);if(outcome==='correct')collectCards(snapshots,rects,player);}
}
function startGame(i){
 if(g&&g.winner===null)return;
 if(!charge(wallet,levels[i].fee)){$('difficultyMessage').textContent='코인이 부족해요. 처음 화면에서 오늘의 무료 코인을 확인해주세요.';$('getCoins').hidden=false;return;}
 selected=i;save();g=createGame(selected);settled=false;paused=false;matchElapsed=0;activeSince=performance.now();
 $('difficultyMessage').textContent='';$('getCoins').hidden=true;
 $('difficulty').textContent=`${levels[selected].name} · 동물 ${levels[selected].species}종`;show('arena');schedule();
}
let welcomeBellTimer;
$('welcomeBell').onclick=()=>{gameAudio.effect('bell');clearTimeout(welcomeBellTimer);$('welcomeBell').classList.add('tapped');welcomeBellTimer=setTimeout(()=>$('welcomeBell').classList.remove('tapped'),350);};
$('start').onclick=()=>{if(!progress.tutorialDone){openTutorial();return;}openDifficulty();};
$('backLobby').onclick=$('getCoins').onclick=()=>show('lobby');
$('flip').onclick=()=>{if(!g||paused||g.turn!==0)return;turnCard(0);};
$('bell').onclick=()=>{if(g&&!paused)doRing(0);};
function pause(){if(!g||g.winner!==null)return;if(!paused)matchElapsed=elapsedMatch();paused=true;gameAudio.setPaused(true);clearTimers();render('잠시 쉬는 중이에요. 계속하기를 눌러주세요.');}
$('pause').onclick=()=>{if(paused){activeSince=performance.now();paused=false;gameAudio.setPaused(false);schedule();}else pause();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();gameAudio.setHidden(document.hidden);});
window.addEventListener('pagehide',()=>{pause();gameAudio.setHidden(true);});
window.addEventListener('pageshow',()=>gameAudio.setHidden(document.hidden));
$('leave').onclick=()=>{pause();if(confirm('대전을 포기할까요? 참가비는 반환되지 않습니다.')){clearTimers();g=null;show('lobby');}};
$('home').onclick=()=>{g=null;show('lobby');};
$('retry').onclick=()=>{g=null;$('difficultyMessage').textContent='';$('getCoins').hidden=true;show('difficultySelect');};
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
for(const button of [$('start'),$('retry'),...$('levels').children]){
 button.addEventListener('keydown',event=>{if(event.key===' '||event.key==='Enter')button.classList.add('wood-pressed');});
 for(const type of ['keyup','blur'])button.addEventListener(type,()=>button.classList.remove('wood-pressed'));
}

function showSettingsPanel(panel='settings'){
 for(const key of ['settings','rules','records'])$(key+'Panel').hidden=key!==panel;
 $('settingsBack').hidden=panel==='settings';$('settingsTitle').textContent={settings:'설정',rules:'게임 방법',records:'내 기록'}[panel];
 if(panel==='records'){ $('recordsSummary').textContent=`완료한 대전 ${progress.completed}판 · ${progress.wins}승`;$('recordsList').replaceChildren();levels.forEach((level,i)=>{const row=document.createElement('p');row.className='record-row';const name=document.createElement('span');name.textContent=level.name;const value=document.createElement('strong');value.textContent=progress.fastestWinMs[i]===null?'첫 승리에 도전!':formatDuration(progress.fastestWinMs[i]);row.append(name,value);$('recordsList').append(row);});}
}
$('settingsButton').onclick=()=>{if(g&&g.winner===null)pause();else gameAudio.setPaused(true);showSettingsPanel();$('settingsDialog').showModal();};
$('closeSettings').onclick=()=>$('settingsDialog').close();
$('rulesButton').onclick=()=>{showSettingsPanel('rules');$('settingsBack').focus();};
$('settingsBack').onclick=()=>{showSettingsPanel();$('rulesButton').focus();};
$('settingsDialog').addEventListener('close',()=>{if(!g||g.winner!==null)gameAudio.setPaused(false);});
$('settingsDialog').addEventListener('click',event=>{if(event.target===$('settingsDialog')){const rect=$('settingsDialog').getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)$('settingsDialog').close();}});

$('recordsButton').onclick=()=>{showSettingsPanel('records');$('settingsBack').focus();};
function renderVibration(){const available=typeof navigator.vibrate==='function';$('vibrationToggle').disabled=!available;$('vibrationToggle').textContent=available?`진동 ${vibrationEnabled?'켜짐':'꺼짐'}`:'이 기기는 진동을 지원하지 않아요';$('vibrationToggle').setAttribute('aria-pressed',String(available&&vibrationEnabled));}
$('vibrationToggle').onclick=()=>{vibrationEnabled=!vibrationEnabled;try{localStorage.setItem('animal-vibration-v1',String(vibrationEnabled));}catch{}renderVibration();};renderVibration();
function openDifficulty(){$('difficultyMessage').textContent='';$('getCoins').hidden=true;show('difficultySelect');}
function openTutorial(){card($('tutorialLeft'),{animal:'rat',count:2});card($('tutorialRight'),{animal:'rat',count:3});$('tutorialBell').disabled=false;$('tutorialContinue').hidden=true;$('tutorialMessage').textContent='연습은 코인을 사용하지 않아요.';$('tutorialDialog').showModal();}
function finishTutorial(){progress.tutorialDone=true;saveProgress();$('tutorialDialog').close();openDifficulty();}
$('tutorialBell').onclick=()=>{gameAudio.effect('bell');gameAudio.effect('correct');$('tutorialMessage').textContent='정답! 같은 동물이 합계 다섯 마리면 딩동!';$('tutorialBell').disabled=true;$('tutorialContinue').hidden=false;};
$('tutorialContinue').onclick=$('skipTutorial').onclick=finishTutorial;

function reducedMotion(){return matchMedia('(prefers-reduced-motion: reduce)').matches;}
function animateElement(el,frames,options){if(reducedMotion())return;const animation=el.animate(frames,options);visualAnimations.add(animation);animation.finished.catch(()=>{}).finally(()=>visualAnimations.delete(animation));return animation;}
function clearVisuals(){clearTimeout(feedbackTimer);for(const animation of visualAnimations)animation.cancel();visualAnimations.clear();$('fxLayer').replaceChildren();$('judgeFeedback').hidden=true;}
function updateDeck(id,count){const el=$(id);el.style.setProperty('--deck-depth',String(Math.min(6,Math.ceil(count/7))));el.dataset.low=String(count<=5);el.dataset.empty=String(count===0);el.closest('.player').classList.toggle('low-cards',count<=5);}
function turnCard(player){if(!flip(g,player)){schedule();return;}gameAudio.effect('flip');schedule();if(g.winner!==null)return;const el=$(player===0?'myCard':'cpuCard');for(const a of el.getAnimations())a.cancel();animateElement(el,[{transform:'perspective(600px) rotateY(-65deg)',filter:'brightness(.8)'},{transform:'perspective(600px) rotateY(0)',filter:'brightness(1)'}],{duration:160,easing:'ease-out'});}
function showJudgement(outcome,player,count){clearTimeout(feedbackTimer);const el=$('judgeFeedback');el.dataset.kind=outcome==='wrong'?'wrong':player===0?'correct':'cpu';el.textContent=outcome==='wrong'?'앗! 다섯 마리가 아니에요':player===0?`내가 먼저! +${count}장`:`컴퓨터가 먼저! +${count}장`;el.hidden=false;animateElement(el,[{opacity:0,transform:'translateY(8px) scale(.9)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:180,easing:'ease-out'});feedbackTimer=setTimeout(()=>el.hidden=true,1000);if(outcome==='correct'&&!reducedMotion()){for(let i=0;i<7;i++){const star=document.createElement('span');star.className='bell-spark';star.textContent='✦';$('fxLayer').append(star);const bell=$('bell').getBoundingClientRect(),root=$('fxLayer').getBoundingClientRect();star.style.left=`${bell.x+bell.width/2-root.x}px`;star.style.top=`${bell.y+bell.height/2-root.y}px`;const angle=i/7*Math.PI*2;const animation=animateElement(star,[{transform:'translate(-50%,-50%) scale(.3)',opacity:1},{transform:`translate(calc(-50% + ${Math.cos(angle)*65}px),calc(-50% + ${Math.sin(angle)*65}px)) scale(1)`,opacity:0}],{duration:480,easing:'ease-out'});animation?.finished.catch(()=>{}).finally(()=>star.remove());}}}
function collectCards(snapshots,rects,player){if(reducedMotion())return;const target=$(player===0?'myDeck':'cpuDeck').getBoundingClientRect(),root=$('fxLayer').getBoundingClientRect();snapshots.forEach((clone,i)=>{clone.removeAttribute('id');clone.classList.remove('card');clone.classList.add('flying-card');clone.setAttribute('aria-hidden','true');const from=rects[i];Object.assign(clone.style,{left:`${from.x-root.x}px`,top:`${from.y-root.y}px`,width:`${from.width}px`,height:`${from.height}px`});$('fxLayer').append(clone);const animation=animateElement(clone,[{transform:'translate(0,0) scale(1)',opacity:.9},{transform:`translate(${target.x+target.width/2-from.x-from.width/2}px,${target.y+target.height/2-from.y-from.height/2}px) scale(.12)`,opacity:0}],{duration:360,delay:i*35,easing:'ease-in'});animation?.finished.catch(()=>{}).finally(()=>clone.remove());});animateElement($(player===0?'myCount':'cpuCount'),[{transform:'scale(1)'},{transform:'scale(1.2)',color:'#ffe17d'},{transform:'scale(1)'}],{duration:400});}
