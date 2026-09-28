self.addEventListener("install", (e) => {
  console.log("[Service Worker] Install");
});

self.addEventListener("fetch", (e) => {
  // Offline caching could be added here later
});
