import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';

// Exercise the real HTML transform and shared React renderer, without a browser.
test('initial HTML and readable preview contain the shared portfolio without JavaScript',async()=>{
 const server=await createServer({server:{middlewareMode:true,watch:null},optimizeDeps:{noDiscovery:true}});
 try{
  const template=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const html=await server.transformIndexHtml('/',template);
  const {renderPortfolio,renderPreview}=await server.ssrLoadModule('/src/portfolioHtml.jsx');
  const copy=renderPortfolio(), preview=renderPreview();
  assert(html.includes(`<div id="root">${copy}</div>`));
  assert(!html.includes('<!--portfolio-content-->'));
  for(const text of ['Milind Meetarbhan','TextNow – Incoming','Revvity','BDO IT Consulting','PricewaterhouseCoopers','University of Waterloo','TwoTogether']){
   assert(copy.includes(text),text);
   assert(preview.includes(text),text);
  }
  assert.equal((copy.match(/<time>/g)??[]).length,5);
  assert(!copy.includes('What you shipped.'));
  assert(copy.includes('href="mailto:msmeetar@uwaterloo.ca"'));
  assert(!copy.includes('<img'),'Text copy must not trigger image downloads');
  assert(!preview.includes('<script'),'Preview must work without JavaScript');
  assert(preview.includes('name="robots" content="noindex"'));
  // Content edits must reach both render paths and be escaped, never interpreted as HTML.
  const {categories}=await server.ssrLoadModule('/src/xmb/content.js');
  const detail=categories[0].items[0].detail, original=detail.body;
  try{
   detail.body='<script>alert("copy")</script> & text';
   for(const rendered of [renderPortfolio(),renderPreview()]){
    assert(rendered.includes('&lt;script&gt;'));
    assert(!rendered.includes('<script>alert'));
   }
  }finally{detail.body=original;}
 }finally{await server.close();}
});
