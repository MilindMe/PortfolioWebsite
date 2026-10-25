// Start with the shell, in parallel with the lazy three.js chunk. Sharing the
// actual fetch avoids WebKit downloading an HTML fetch preload a second time.
export const MODEL_URL='/models/psp-v3.glb';
let request=null, progress=0;
const listeners=new Set();

export function loadModelBytes(onProgress){
 if(onProgress){listeners.add(onProgress);onProgress(progress);}
 if(!request){
  progress=0;
  const report=value=>{progress=value;for(const listener of listeners)listener(value);};
  request=fetch(MODEL_URL).then(async response=>{
   if(!response.ok)throw new Error(`Unable to load PSP model (${response.status})`);
   // Compressed responses describe compressed bytes in Content-Length, whereas
   // the stream is decoded. Only use the length when both count the same bytes.
   const total=response.headers.get('Content-Encoding')?0:Number(response.headers.get('Content-Length'));
   if(!response.body){const bytes=await response.arrayBuffer();report(1);return bytes;}
   const reader=response.body.getReader(), chunks=[];
   let loaded=0;
   try{
    for(;;){
     const {done,value}=await reader.read();if(done)break;
     chunks.push(value);loaded+=value.byteLength;
     if(total>0)report(Math.min(1,loaded/total));
    }
   }finally{reader.releaseLock();}
   const bytes=new Uint8Array(loaded);let offset=0;
   for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   report(1);return bytes.buffer;
  }).catch(error=>{request=null;progress=0;throw error;});
 }
 return request.finally(()=>{if(onProgress)listeners.delete(onProgress);});
}

export function preloadModel(){void loadModelBytes().catch(()=>{});}
