/* Availability V2.5: cache-first, strictly limited to the V2.4 test URL.
   The live app (index.html), other test versions and external services are untouched. */
const CACHE='availability-v25-shell-current';
const PREVIOUS='availability-v25-shell-previous';
const PAGE='test.v2.5.html';
const pageUrl=new URL(PAGE,self.registration.scope).href;
const validShell=async response=>{
  if(!response||!response.ok)return false;
  try{const html=await response.clone().text();return html.includes('Availability — V2.5 Test')&&html.includes("const APP_VERSION='2.5-counting-test'")}
  catch(e){return false}
};
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const response=await fetch(new Request(pageUrl,{cache:'reload'}));
    if(!await validShell(response))throw new Error('Incomplete offline app update');
    const current=await caches.open(CACHE);
    const backup=await caches.open(PREVIOUS);
    const earlier=await current.match(pageUrl);
    if(earlier&&await validShell(earlier))await backup.put(pageUrl,earlier);
    await current.put(pageUrl,response);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const requested=new URL(request.url).href.split('?')[0];
  const older=new URL('test.v2.4.html',self.registration.scope).href;
  if(requested===older){
    event.respondWith((async()=>{
      try{return await fetch(request)}catch(e){
        return await caches.match(older)||new Response('Unavailable offline',{status:503});
      }
    })());
    return;
  }
  if(requested!==pageUrl)return;
  event.respondWith((async()=>{
    const current=await caches.open(CACHE);
    const hit=await current.match(pageUrl);
    if(hit&&await validShell(hit)){
      // Serve instantly offline/online; stage a verified update for next time.
      event.waitUntil((async()=>{
        try{
          const fresh=await fetch(new Request(pageUrl,{cache:'no-cache'}));
          if(!await validShell(fresh))return;
          const backup=await caches.open(PREVIOUS);
          await backup.put(pageUrl,hit.clone());
          await current.put(pageUrl,fresh);
        }catch(e){}
      })());
      return hit;
    }
    try{
      const fresh=await fetch(request);
      if(!await validShell(fresh))throw new Error('Invalid shell');
      await current.put(pageUrl,fresh.clone());
      return fresh;
    }catch(e){
      const backup=await caches.open(PREVIOUS);
      const previous=await backup.match(pageUrl);
      if(previous&&await validShell(previous))return previous;
      return new Response('<h1>Availability temporarily unavailable</h1><p>Open once online to restore offline files.</p>',{status:503,headers:{'Content-Type':'text/html'}});
    }
  })());
});
