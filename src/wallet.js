export const DAILY_COINS=50; // provisional
export function dayKey(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function claimDaily(wallet,day=dayKey()){
 if(wallet.day===day)return false;
 wallet.day=day;wallet.coins+=DAILY_COINS;return true;
}
export function charge(wallet,amount){if(wallet.coins<amount)return false;wallet.coins-=amount;return true;}
