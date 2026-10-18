export function emptyProgress(){return {tutorialDone:false,completed:0,wins:0,fastestWinMs:[null,null,null,null]};}
export function loadProgress(storage){
 const result=emptyProgress();
 try{const saved=JSON.parse(storage.getItem('animal-progress-v1'));result.tutorialDone=saved?.tutorialDone===true;
 if(Number.isSafeInteger(saved?.completed)&&saved.completed>=0&&Number.isSafeInteger(saved?.wins)&&saved.wins>=0&&saved.wins<=saved.completed){result.completed=saved.completed;result.wins=saved.wins;}
 if(Array.isArray(saved?.fastestWinMs))result.fastestWinMs=result.fastestWinMs.map((_,i)=>Number.isFinite(saved.fastestWinMs[i])&&saved.fastestWinMs[i]>0?saved.fastestWinMs[i]:null);
 }catch{}return result;
}
export function recordMatch(progress,won,level,elapsedMs){
 progress.completed++;if(!won)return;
 progress.wins++;if(Number.isFinite(elapsedMs)&&elapsedMs>0){const previous=progress.fastestWinMs[level];progress.fastestWinMs[level]=previous===null?elapsedMs:Math.min(previous,elapsedMs);}
}
