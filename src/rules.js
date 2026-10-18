export const animals = [
 ['rat','쥐','🐭'],['ox','소','🐮'],['tiger','호랑이','🐯'],['rabbit','토끼','🐰'],
 ['dragon','용','🐲'],['snake','뱀','🐍'],['horse','말','🐴'],['sheep','양','🐑'],
 ['monkey','원숭이','🐵'],['rooster','닭','🐔'],['dog','개','🐶'],['pig','돼지','🐷']
];
// Amounts other than beginner are provisional, editable balance values.
export const levels = [
 {name:'초보',species:3,min:1800,max:2500,fee:10,reward:15},
 {name:'중수',species:6,min:900,max:1400,fee:15,reward:25},
 {name:'고수',species:9,min:350,max:650,fee:20,reward:35},
 {name:'초고수',species:12,min:200,max:350,fee:30,reward:50}
];
export function canRing(cards) {
 const totals = new Map();
 for (const c of cards) if(c) totals.set(c.animal,(totals.get(c.animal)||0)+c.count);
 return [...totals.values()].includes(5);
}
export function shuffle(items, random=Math.random) {
 const result=[...items];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
export function createGame(levelIndex, random=Math.random) {
 const selected=shuffle(animals,random).slice(0,levels[levelIndex].species);
 const deck=shuffle(selected.flatMap(([animal])=>[1,2,3,4,5].map(count=>({animal,count}))),random);
 return {hands:[deck.filter((_,i)=>i%2===0),deck.filter((_,i)=>i%2===1)],piles:[[],[]],turn:0,winner:null,selected:selected.map(a=>a[0])};
}
export function tops(g){return g.piles.map(p=>p.at(-1)||null);}
export function flip(g, player){
 if(g.winner!==null||g.turn!==player) return false;
 if(!g.hands[player].length){g.winner=1-player;return false;}
 g.piles[player].push(g.hands[player].shift());g.turn=1-player;return true;
}
export function ring(g,player){
 if(g.winner!==null||!g.piles.some(p=>p.length))return 'ignored';
 if(canRing(tops(g))){
  g.hands[player].push(...g.piles[0],...g.piles[1]);g.piles=[[],[]];g.turn=player;
  if(!g.hands[1-player].length)g.winner=player;
  return 'correct';
 }
 // In two-player play, a wrong bell gives one face-down card to the opponent.
 if(g.hands[player].length)g.hands[1-player].push(g.hands[player].shift());
 if(!g.hands[player].length&&!g.piles[player].length)g.winner=1-player;
 return 'wrong';
}
