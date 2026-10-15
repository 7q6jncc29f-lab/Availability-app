/* Availability 2.3: strictly scoped offline support for the test page. */
const SHELL_CACHE='availability-v23-offline-shell-1';
const TEST='test.v2.3.html';
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(SHELL_CACHE).then(async cache=>{
    try{await cache.add(new Request(TEST,{cache:'reload'}))}catch(e){}
  }).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  const path=new URL(req.url).pathname;
  if(req.method!=='GET'||!path.endsWith('/'+TEST))return; // Never intercept live index.html.
  event.respondWith((async()=>{
    const cache=await caches.open(SHELL_CACHE);
    try{
      const response=await fetch(req);
      if(response.ok)await cache.put(req,response.clone());
      return response;
    }catch(e){
      const cached=await cache.match(req,{ignoreSearch:true});
      if(cached)return cached;
      throw e;
    }
  })());
});
