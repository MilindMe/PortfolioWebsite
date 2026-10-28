import {test} from 'node:test';
import assert from 'node:assert/strict';

// A stand-in for the browser's localStorage, so earned trophies persist between calls like they do on the page.
const store=new Map();
globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value))};
const {awardTrophy,earnedTrophies,onTrophy,trophies}=await import('../src/trophies.js');

test('a trophy is earned once, announced once and remembered',()=>{
 const id=Object.keys(trophies)[0], heard=[];
 const stop=onTrophy(trophy=>heard.push(trophy.id));
 assert.equal(awardTrophy(id),true);
 assert.equal(awardTrophy(id),false);
 assert.deepEqual(heard,[id]);
 assert(earnedTrophies().has(id));
 stop();
});

test('unknown trophies are ignored',()=>{
 assert.equal(awardTrophy('no-such-trophy'),false);
});

test('earning the last trophy G.O.A.T needs awards it straight after',()=>{
 const heard=[], stop=onTrophy(trophy=>heard.push(trophy)), needs=trophies.goat.requires;
 assert.equal(needs.length,7);
 needs.slice(0,-1).forEach(awardTrophy);
 assert(!earnedTrophies().has('goat'));
 awardTrophy(needs.at(-1));
 assert(earnedTrophies().has('goat'));
 assert.deepEqual(heard.slice(-2).map(trophy=>trophy.id),[needs.at(-1),'goat']);
 assert.equal(heard.at(-1).grade,'platinum');
 assert(!('requires' in heard.at(-1)),'the card is sent without the requires list');
 stop();
});
