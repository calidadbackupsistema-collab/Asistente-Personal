/* TARS · Service worker: abre la app sin internet y guarda las librerías externas */
const SHELL_CACHE='tars-shell-v1';
const CDN_CACHE='tars-cdn-v1';
const KEEP=[SHELL_CACHE,CDN_CACHE,'tars-voice-v1'];
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const CDN_HOSTS=['www.gstatic.com','cdnjs.cloudflare.com','cdn.jsdelivr.net'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(SHELL_CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>!KEEP.includes(k)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  // App: primero red (para recibir actualizaciones), si no hay internet usa la copia guardada
  if(url.origin===self.location.origin){
    if(req.mode==='navigate'||url.pathname.endsWith('/')||url.pathname.endsWith('.html')){
      e.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(SHELL_CACHE).then(c=>c.put('./index.html',copy));return res})
        .catch(()=>caches.match('./index.html')));
      return;
    }
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{const copy=res.clone();caches.open(SHELL_CACHE).then(c=>c.put(req,copy));return res})));
    return;
  }

  // Librerías (Firebase, motor de voz): primero la copia guardada
  if(CDN_HOSTS.includes(url.hostname)){
    e.respondWith(caches.open(CDN_CACHE).then(c=>c.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok||res.type==='opaque')c.put(req,res.clone());return res}))));
  }
  // Todo lo demás (Firestore, Google, Claude, modelo de voz) pasa directo
});
