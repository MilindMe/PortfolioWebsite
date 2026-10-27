// Button Rush, the mini game under Games. Each round shows a sequence of PSP buttons to press in order before its
// timer runs out; a wrong button sends the player back to the start of the sequence. Four rounds, from four buttons
// to seven. Lives in the XMB state as state.game while state.view is 'game'.
export const ROUNDS=[{length:4,time:5000},{length:5,time:5000},{length:6,time:5000},{length:7,time:5000}];
// How long the "Round n" card shows before that round's timer starts, in ms.
export const READY_FOR=1200;
export const BUTTONS=['up','right','down','left','triangle','circle','cross','square'];
// What clearing each round pays in the GTA theme, in dollars, added to the cash bar (see CashBar.jsx).
export const PAYOUTS=[250,500,1000,2500];
export const BUTTON_LABELS={up:'Up',right:'Right',down:'Down',left:'Left',triangle:'Triangle',circle:'Circle',cross:'Cross',square:'Square'};

// status: 'title' before the first round, 'ready' while a round's card shows (until startsAt), 'play' while its timer
// runs (until endsAt), then 'lost', or 'won' after the last round. pos is how far into seq the player is, and missAt
// is when the last wrong button was pressed, so the screen can flash.
export const newGame=()=>({status:'title',round:0,seq:[],pos:0,startsAt:0,endsAt:0,missAt:0});

// A random sequence long enough for the last round, never the same button twice in a row.
function roll(){
 const seq=[];
 while(seq.length<ROUNDS.at(-1).length){
  const button=BUTTONS[Math.floor(Math.random()*BUTTONS.length)];
  if(button!==seq.at(-1))seq.push(button);
 }
 return seq;
}

// Stamps actions bound for the game with the time and a fresh random sequence, so gameReducer stays pure. App.jsx
// runs every action through this before reducing.
export const withClock=(state,action)=>state.view==='game'?{...action,now:performance.now(),roll:roll()}:action;

const ready=(round,{now,roll})=>({status:'ready',round,seq:roll.slice(0,ROUNDS[round].length),pos:0,startsAt:now+READY_FOR,endsAt:0,missAt:0});

// Returns the next game, or null to leave it. Actions carry button when they came from a PSP button or its key:
// Home (and Esc) always quits, ✕ starts or retries and ○ leaves from the title, lost and won cards. A BACK with no
// button (the screen's hint) quits too. TICK comes from App.jsx when startsAt or endsAt is reached.
export function gameReducer(game,action){
 const {button}=action;
 if(button==='home'||(action.type==='BACK'&&!button))return null;
 if(action.type==='TICK'){
  if(game.status==='ready')return {...game,status:'play',endsAt:action.now+ROUNDS[game.round].time};
  if(game.status==='play')return {...game,status:'lost'};
  return game;
 }
 if(game.status==='title'||game.status==='lost'||game.status==='won'){
  if(button==='circle')return null;
  return action.type==='CONFIRM'||button==='cross'?ready(0,action):game;
 }
 if(game.status!=='play'||!button)return game;
 if(action.now>=game.endsAt)return {...game,status:'lost'};
 if(button!==game.seq[game.pos])return {...game,pos:0,missAt:action.now};
 if(game.pos+1<game.seq.length)return {...game,pos:game.pos+1};
 return game.round+1<ROUNDS.length?ready(game.round+1,action):{...game,pos:game.seq.length,status:'won'};
}

// When the game next needs a TICK (the end of a round's card or of its timer), or null.
export function gameDue(game){
 return game?.status==='ready'?game.startsAt:game?.status==='play'?game.endsAt:null;
}

// The menu sound a game action makes: ok to start and clear a round, down for each right button, cancel for a wrong
// one or running out of time.
export function gameSound(previous,next){
 if(next.missAt!==previous.missAt||(next.status==='lost'&&previous.status!=='lost'))return 'cancel';
 if(next.status!==previous.status||next.round!==previous.round)return next.status==='play'?null:'ok';
 return next.pos!==previous.pos?'down':null;
}

// The cash a game action earns: the payout of the round it cleared, or 0.
export function roundPay(previous,next){
 if(previous?.status!=='play'||!next)return 0;
 return next.round>previous.round||next.status==='won'?PAYOUTS[previous.round]:0;
}
