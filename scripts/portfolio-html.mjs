import {createServer} from 'vite';

// Render only the semantic copy; the WebGL application remains client-rendered.
export function portfolioHtml(){
 let root, built;
 async function render(server){
  const module=await server.ssrLoadModule('/src/portfolioHtml.jsx');
  return {content:module.renderPortfolio(),preview:module.renderPreview()};
 }
 async function buildCopy(){
  if(!built)built=(async()=>{
   const server=await createServer({root,configFile:false,appType:'custom',server:{middlewareMode:true,watch:null},optimizeDeps:{noDiscovery:true}});
   try{return await render(server);}finally{await server.close();}
  })();
  return built;
 }
 return {
  name:'portfolio-html',
  configResolved(config){root=config.root;},
  configureServer(server){
   server.middlewares.use(async(req,res,next)=>{
    if(req.url?.split('?')[0]!=='/content.html')return next();
    try{
     const {preview}=await render(server);
     res.setHeader('Content-Type','text/html; charset=utf-8');
     res.setHeader('Cache-Control','no-cache');
     res.end(preview);
    }catch(error){next(error);}
   });
  },
  transformIndexHtml:{order:'pre',async handler(html,ctx){
   const {content}=await(ctx.server?render(ctx.server):buildCopy());
   return html.replace('<!--portfolio-content-->',content);
  }},
  async generateBundle(){
   const {preview}=await buildCopy();
   this.emitFile({type:'asset',fileName:'content.html',source:preview});
  },
 };
}
