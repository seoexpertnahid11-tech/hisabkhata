// হিসাবখাতা: অফলাইন সাপোর্ট
// অ্যাপ আপডেট করলে নিচের ভার্সন নম্বর বাড়িয়ে দিন (v2, v3 ...), তাহলে সবার ফোনে নতুন ভার্সন যাবে।
const VERSION = 'hisabkhata-v3';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // লগইন আর হিসাবের ডেটা সবসময় সরাসরি সার্ভার থেকে
  if (url.hostname.endsWith('supabase.co')) return;

  // পেজ খোলা: নেট থাকলে নতুনটা, না থাকলে জমানো কপি
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('/index.html', copy)); return res; })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  const cacheable = url.origin === self.location.origin ||
    /(^|\.)fonts\.googleapis\.com$|(^|\.)fonts\.gstatic\.com$|(^|\.)cdn\.jsdelivr\.net$/.test(url.hostname);
  if (!cacheable) return;

  // ফন্ট, আইকন, লাইব্রেরি: আগে জমানো কপি দেখায়, পেছনে নতুনটা নিয়ে রাখে
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
