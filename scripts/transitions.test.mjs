import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DURATION, REST, SKIN_AT, WHEEL_AT, pose, transitionKind} from '../src/experiences/transitions.js';

const classic={id:'classic',wheel:false}, persona5={id:'persona5',wheel:'persona5'};
const near=(actual,expected,message)=>assert(Math.abs(actual-expected)<1e-9,`${message}: ${actual} ≠ ${expected}`);

for(const kind of ['enter','exit'])test(`${kind} starts and ends with the PSP at rest`,()=>{
 const start=pose(kind,0);
 near(start.rotY,0,'start rotation');near(start.scale,1,'start scale');near(start.hop,0,'start hop');near(start.frame,0,'start frame');
 assert.equal(pose(kind,DURATION[kind]),REST);
 const almost=pose(kind,DURATION[kind]-1);
 near(Math.cos(almost.rotY),1,'end rotation is a whole turn');near(almost.frame,1,'end frame');
});

for(const kind of ['enter','exit'])test(`${kind} swaps the skin while the screen faces away`,()=>{
 assert(Math.cos(pose(kind,SKIN_AT[kind]).rotY)<-.9);
});

test('the wheel pops out before the enter transition finishes',()=>{
 assert(WHEEL_AT>SKIN_AT.enter&&WHEEL_AT<DURATION.enter);
});

test('moving to or between game experiences moves the PSP; colour changes do not',()=>{
 assert.equal(transitionKind(persona5,{id:'gta',wheel:'gta'}),'enter');
 assert.equal(transitionKind(classic,persona5),'enter');
 assert.equal(transitionKind(persona5,classic),'exit');
 assert.equal(transitionKind(classic,{id:'other',wheel:false}),null);
 assert.equal(transitionKind(classic,classic),null);
});
