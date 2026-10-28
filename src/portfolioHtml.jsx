import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import PortfolioContents from './xmb/PortfolioContents';

export function renderPortfolio(){
 return renderToStaticMarkup(<PortfolioContents className="sr-only"/>);
}

export function renderPreview(){
 return `<!doctype html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>Portfolio copy — Milind Meetarbhan</title>
<style>body{max-width:760px;margin:40px auto;padding:0 24px;font:18px/1.65 system-ui,sans-serif;color:#202124}a{color:#1759ad}h1,h2,h3,h4{line-height:1.25}h2{margin-top:40px}p{white-space:pre-line}li{margin:8px 0}button{font:inherit}header{border-bottom:1px solid #ccc;padding-bottom:20px}</style>
</head><body><header><a href="/">Open the PSP portfolio</a><p>This is the portfolio’s semantic copy, generated from the same content as the PSP. It is available without JavaScript. The memo button works in the interactive portfolio.</p></header>
${renderToStaticMarkup(<PortfolioContents/>)}</body></html>`;
}
