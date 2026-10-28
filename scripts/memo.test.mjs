import {test} from 'node:test';
import assert from 'node:assert/strict';
import {memoDraftUrl, validMemoCode} from '../src/memo.js';

test('the memo invite accepts the configured code with case/spacing tolerance',()=>{
 assert(validMemoCode('CAMWAD-MILIND'));
 assert(validMemoCode('  camwad-milind  '));
 for(const code of ['', 'wrong', 'CAMWAD', 'CAMWAD-MILIND-extra'])assert(!validMemoCode(code));
});

test('memo drafts keep names, newlines and special characters inside the email body',()=>{
 const url=new URL(memoDraftUrl('mailto:msmeetar@uwaterloo.ca','  Ana & Sam  ','  A beach memory!\nRodrigues + friends? #1  '));
 assert.equal(url.protocol,'mailto:');assert.equal(url.pathname,'msmeetar@uwaterloo.ca');
 assert.equal(url.searchParams.get('subject'),'A memory for your portfolio');
 const body=url.searchParams.get('body');
 assert(body.includes('From: Ana & Sam'));assert(body.includes('A beach memory!\nRodrigues + friends? #1'));
 assert.equal([...url.searchParams.keys()].length,2);
 assert(!body.includes('CAMWAD-MILIND'));
});

test('anonymous memo drafts use a friendly sender name',()=>{
 const url=new URL(memoDraftUrl('mailto:msmeetar@uwaterloo.ca','  ','Hello'));
 assert(url.searchParams.get('body').includes('From: A friend'));
});
