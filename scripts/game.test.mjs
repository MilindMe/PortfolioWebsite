import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PAYOUTS, READY_FOR, ROUNDS, gameDue, gameReducer, gameSound, newGame, roundPay, withClock} from '../src/xmb/game.js';

const roll=['up','cross','left','square','down','triangle','circle'];
const at=(now,action)=>({...action,now,roll});
// A game in round's play phase, its timer started at 0.
function playing(round=0){
 let game=gameReducer(newGame(),at(0,{type:'CONFIRM'}));
 for(let r=0;r<round;r++){
  game=gameReducer(game,at(0,{type:'TICK'}));
  for(const button of game.seq)game=gameReducer(game,at(1,{type:'PRESS',button}));
 }
 return gameReducer(game,at(0,{type:'TICK'}));
}

test('rounds grow from four buttons to seven, one at a time, starting with five seconds',()=>{
 assert.deepEqual(ROUNDS.map(round=>round.length),[4,5,6,7]);
 assert.equal(ROUNDS[0].time,5000);
});

test('✕ starts the first round after its card, and its timer then runs',()=>{
 const ready=gameReducer(newGame(),at(100,{type:'CONFIRM',button:'cross'}));
 assert.equal(ready.status,'ready');assert.deepEqual(ready.seq,roll.slice(0,4));
 assert.equal(gameDue(ready),100+READY_FOR);
 const play=gameReducer(ready,at(1300,{type:'TICK'}));
 assert.equal(play.status,'play');assert.equal(gameDue(play),1300+ROUNDS[0].time);
});

test('the right buttons advance, a wrong one starts the sequence over',()=>{
 let game=playing();
 game=gameReducer(game,at(10,{type:'UP',button:'up'}));
 game=gameReducer(game,at(20,{type:'CONFIRM',button:'cross'}));
 assert.equal(game.pos,2);
 game=gameReducer(game,at(30,{type:'PRESS',button:'triangle'}));
 assert.equal(game.pos,0);assert.equal(game.missAt,30);assert.equal(game.status,'play');
});

test('clearing a round deals the next, longer one; clearing the fourth wins',()=>{
 assert.equal(playing(1).seq.length,5);
 let game=playing(3);
 assert.equal(game.round,3);
 for(const button of game.seq)game=gameReducer(game,at(1,{type:'PRESS',button}));
 assert.equal(game.status,'won');
});

test('running out of time loses, and ✕ retries from round one',()=>{
 const lost=gameReducer(playing(2),at(9999,{type:'TICK'}));
 assert.equal(lost.status,'lost');
 assert.equal(gameReducer(playing(),at(6000,{type:'PRESS',button:'up'})).status,'lost');
 const retry=gameReducer(lost,at(0,{type:'CONFIRM'}));
 assert.equal(retry.status,'ready');assert.equal(retry.round,0);
});

test('Home and the screen\'s back hint always quit; ○ quits only from the cards',()=>{
 assert.equal(gameReducer(playing(),at(1,{type:'BACK',button:'home'})),null);
 assert.equal(gameReducer(playing(),at(1,{type:'BACK'})),null);
 assert.equal(gameReducer(newGame(),at(1,{type:'BACK',button:'circle'})),null);
 assert.notEqual(gameReducer(playing(),at(1,{type:'BACK',button:'circle'})),null);
});

test('only actions in the game view get the clock and a sequence',()=>{
 const stamped=withClock({view:'game'},{type:'TICK'});
 assert.equal(typeof stamped.now,'number');assert.equal(stamped.roll.length,7);
 assert.ok(stamped.roll.every((button,i)=>button!==stamped.roll[i-1]));
 assert.deepEqual(withClock({view:'menu'},{type:'UP'}),{type:'UP'});
});

test('sounds: ok to start and clear, down per right button, cancel for a miss or time up',()=>{
 const game=playing();
 assert.equal(gameSound(newGame(),gameReducer(newGame(),at(0,{type:'CONFIRM'}))),'ok');
 assert.equal(gameSound(game,gameReducer(game,at(1,{type:'PRESS',button:'up'}))),'down');
 assert.equal(gameSound(game,gameReducer(game,at(1,{type:'PRESS',button:'circle'}))),'cancel');
 assert.equal(gameSound(game,gameReducer(game,at(1,{type:'TICK'}))),'cancel');
});

test('clearing a round pays its payout; other moves pay nothing',()=>{
 const clear=game=>game.seq.reduce((next,button)=>gameReducer(next,at(1,{type:'PRESS',button})),game);
 for(let round=0;round<ROUNDS.length;round++)assert.equal(roundPay(playing(round),clear(playing(round))),PAYOUTS[round]);
 const game=playing();
 assert.equal(roundPay(game,gameReducer(game,at(1,{type:'PRESS',button:game.seq[0]}))),0);
 assert.equal(roundPay(game,gameReducer(game,at(0,{type:'TICK'}))),0);
 assert.equal(roundPay(game,null),0);
 assert.equal(roundPay(null,newGame()),0);
});
