// FantDev Trading Platform - Enhanced Service Worker
// Advanced PWA functionality with intelligent caching, prefetching, and offline support

const VERSION = '2.0.0';
const BUILD_DATE = new Date().toISOString();

// Cache configuration
const CACHE_CONFIG = {
  version: VERSION,
  caches: {
    static: `fantdev-static-v${VERSION}`,
    dynamic: `fantdev-dynamic-v${VERSION}`,
    images: `fantdev-images-v${VERSION}`,
    api: `fantdev-api-v${VERSION}`,
    fonts: `fantdev-fonts-v${VERSION}`
  },
  ttl: {
    static: 7 * 24 * 60 * 60 * 1000, // 7 days
    dynamic: 24 * 60 * 60 * 1000,    // 1 day
    images: 30 * 24 * 60 * 60 * 1000, // 30 days
    api: 5 * 60 * 1000,               // 5 minutes
    fonts: 365 * 24 * 60 * 60 * 1000  // 1 year
  },
  maxSize: {
    total: 100 * 1024 * 1024,        // 100 MB total
    perCache: 25 * 1024 * 1024       // 25 MB per cache
  }
};

// Performance metrics
const METRICS = {
  cacheHits: 0,
  cacheMisses: 0,
  networkRequests: 0,
  failedRequests: 0,
  avgResponseTime: 0,
  totalResponseTime: 0,
  requestCount: 0
};

// Critical resources to prefetch
const CRITICAL_RESOURCES = [
  '/',
  '/portals/portal-hub.html',
  '/static/css/design-system.css',
  '/static/css/components.css',
  '/static/js/components.js',
  '/static/js/utils.js'
];

// Static assets to cache immediately
const STATIC_ASSETS = [
  ...CRITICAL_RESOURCES,
  '/portals/admin-portal.html',
  '/portals/customer-portal.html',
  '/portals/manager.html',
  '/portals/dashboard.html',
  '/dashboard/modern-optimized.html',
  '/demos/advanced-demo.html',
  '/demos/feedback-widget.html',
  '/demos/navigation-test.html',
  '/static/css/utilities.css',
  '/static/css/components.css',
  '/static/css/advanced-components.css',
  '/static/css/fantdev-components.css',
  '/static/css/advanced-demo.css',
  '/static/css/feedback-widget.css',
  '/static/css/navigation-test.css',
  '/static/js/advanced-components.js',
  '/static/js/component-library.js',
  '/static/js/icon-helper.js',
  '/static/js/image-optimizer.js',
  '/static/js/websocket-client.js',
  '/static/js/enhanced-api-client.js',
  '/static/js/advanced-demo.js',
  '/static/js/feedback-widget.js',
  '/static/js/navigation-test.js',
  '/images/icons.svg',
  '/images/favicon-32x32.png',
  '/images/favicon-16x16.png',
  '/images/apple-touch-icon.png',
  '/manifest.json'
];

// Resource categorization patterns
const RESOURCE_PATTERNS = {
  static: /\.(css|js|html)$/i,
  images: /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i,
  fonts: /\.(woff|woff2|ttf|eot|otf)$/i,
  api: /\/(api|graphql)\//i,
  dynamic: /\/(data|content|feed)\//i
};

// Offline fallback pages
const OFFLINE_PAGES = {
  default: '/offline.html',
  api: { error: 'API temporarily unavailable', code: 503 },
  image: '/images/icon-128x128.png'
};

// Installation event with enhanced error handling
self.addEventListener('install', (event) => {
  console.log(`[SW v${VERSION}] Installing service worker...`);
  
  event.waitUntil(
    Promise.all([
      cacheStaticAssets(),
      prefetchCriticalResources(),
      setupIndexedDB()
    ]).then(() => {
      console.log(`[SW v${VERSION}] Installation complete`);
      return self.skipWaiting();
    }).catch((error) => {
      console.error(`[SW v${VERSION}] Installation failed:`, error);
      // Report error to analytics if available
      reportError('install', error);
    })
  );
});

// Activation event with intelligent cleanup
self.addEventListener('activate', (event) => {
  console.log(`[SW v${VERSION}] Activating service worker...`);
  
  event.waitUntil(
    Promise.all([
      cleanupOldCaches(),
      migrateData(),
      self.clients.claim()
    ]).then(() => {
      console.log(`[SW v${VERSION}] Activation complete`);
      // Notify all clients about update
      broadcastUpdate();
    })
  );
});

// Enhanced fetch event with intelligent routing
self.addEventListener('fetch', (event) => {
  const startTime = performance.now();
  const { request } = event;
  
  // Skip non-GET requests and non-HTTP(S) protocols
  if (request.method !== 'GET' || !request.url.match(/^https?:\/\//i)) {
    return;
  }
  
  event.respondWith(
    handleRequest(request).then((response) => {
      // Record metrics
      recordMetrics(startTime, true);
      return response;
    }).catch((error) => {
      recordMetrics(startTime, false);
      console.error(`[SW v${VERSION}] Request failed:`, request.url, error);
      return getOfflineFallback(request);
    })
  );
});

// Intelligent request handling with multiple strategies
async function handleRequest(request) {
  const url = new URL(request.url);
  const resourceType = getResourceType(request);
  
  // Apply strategy based on resource type
  switch (resourceType) {
    case 'static':
      return await cacheFirst(request, CACHE_CONFIG.caches.static);
    
    case 'api':
      return await networkFirstWithTimeout(request, 3000, CACHE_CONFIG.caches.api);
    
    case 'images':
      return await staleWhileRevalidate(request, CACHE_CONFIG.caches.images);
    
    case 'fonts':
      return await cacheFirst(request, CACHE_CONFIG.caches.fonts);
    
    case 'dynamic':
      return await networkFirst(request, CACHE_CONFIG.caches.dynamic);
    
    default:
      return await raceStrategy(request);
  }
}

// Cache first strategy with TTL check
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    const cacheAge = getCacheAge(cachedResponse);
    const ttl = CACHE_CONFIG.ttl[getCacheType(cacheName)];
    
    if (cacheAge < ttl) {
      METRICS.cacheHits++;
      return cachedResponse;
    }
  }
  
  METRICS.cacheMisses++;
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    const responseToCache = networkResponse.clone();
    await cache.put(request, addCacheHeaders(responseToCache));
  }
  
  return networkResponse;
}

// Network first with timeout fallback
async function networkFirstWithTimeout(request, timeout, cacheName) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    METRICS.networkRequests++;
    const networkResponse = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log(`[SW v${VERSION}] Serving from cache after timeout:`, request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}

// Network first strategy
async function networkFirst(request, cacheName) {
  try {
    METRICS.networkRequests++;
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      METRICS.cacheHits++;
      return cachedResponse;
    }
    
    METRICS.failedRequests++;
    throw error;
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const networkResponsePromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);
  
  if (cachedResponse) {
    METRICS.cacheHits++;
    // Update in background
    networkResponsePromise.then(() => {
      console.log(`[SW v${VERSION}] Updated cache in background:`, request.url);
    });
    return cachedResponse;
  }
  
  METRICS.cacheMisses++;
  return await networkResponsePromise;
}

// Race strategy - fastest wins
async function raceStrategy(request) {
  const cachePromise = caches.match(request);
  const networkPromise = fetch(request);
  
  try {
    const response = await Promise.race([
      cachePromise.then(r => r || Promise.reject('No cache')),
      networkPromise
    ]);
    
    // Update cache if network won
    if (response === await networkPromise && response.ok) {
      const cache = await caches.open(CACHE_CONFIG.caches.dynamic);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Try the other promise
    const cached = await cachePromise;
    if (cached) return cached;
    
    return await networkPromise;
  }
}

// Helper functions
function getResourceType(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  for (const [type, pattern] of Object.entries(RESOURCE_PATTERNS)) {
    if (pattern.test(pathname)) {
      return type;
    }
  }
  
  return 'dynamic';
}

function getCacheType(cacheName) {
  for (const [type, name] of Object.entries(CACHE_CONFIG.caches)) {
    if (name === cacheName) return type;
  }
  return 'dynamic';
}

function getCacheAge(response) {
  const cacheDate = response.headers.get('sw-cache-date');
  if (!cacheDate) return Infinity;
  return Date.now() - new Date(cacheDate).getTime();
}

function addCacheHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cache-date', new Date().toISOString());
  headers.set('sw-version', VERSION);
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

// Cache management functions
async function cacheStaticAssets() {
  const cache = await caches.open(CACHE_CONFIG.caches.static);
  
  // Cache in chunks to avoid overwhelming the browser
  const chunkSize = 5;
  for (let i = 0; i < STATIC_ASSETS.length; i += chunkSize) {
    const chunk = STATIC_ASSETS.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (error) {
          console.warn(`[SW v${VERSION}] Failed to cache:`, url, error);
        }
      })
    );
  }
}

async function prefetchCriticalResources() {
  const cache = await caches.open(CACHE_CONFIG.caches.static);
  
  await Promise.all(
    CRITICAL_RESOURCES.map(async (url) => {
      try {
        const response = await fetch(url, { priority: 'high' });
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.warn(`[SW v${VERSION}] Failed to prefetch:`, url);
      }
    })
  );
}

async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = Object.values(CACHE_CONFIG.caches);
  
  await Promise.all(
    cacheNames.map(async (cacheName) => {
      if (!currentCaches.includes(cacheName)) {
        console.log(`[SW v${VERSION}] Deleting old cache:`, cacheName);
        await caches.delete(cacheName);
      } else {
        // Clean up old entries in current caches
        await cleanupCache(cacheName);
      }
    })
  );
}

async function cleanupCache(cacheName) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  const cacheType = getCacheType(cacheName);
  const ttl = CACHE_CONFIG.ttl[cacheType];
  
  let cacheSize = 0;
  const deletePromises = [];
  
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const age = getCacheAge(response);
      const size = parseInt(response.headers.get('content-length') || '0');
      
      if (age > ttl || cacheSize + size > CACHE_CONFIG.maxSize.perCache) {
        deletePromises.push(cache.delete(request));
      } else {
        cacheSize += size;
      }
    }
  }
  
  await Promise.all(deletePromises);
}

// WebSocket reconnection management
let wsReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      await self.skipWaiting();
      break;
    
    case 'GET_VERSION':
      event.ports[0].postMessage({ 
        version: VERSION,
        buildDate: BUILD_DATE,
        metrics: METRICS
      });
      break;
    
    case 'CLEAR_CACHE':
      await clearCache(data?.cacheName);
      event.ports[0].postMessage({ success: true });
      break;
    
    case 'GET_METRICS':
      event.ports[0].postMessage(getMetrics());
      break;
    
    case 'WS_RECONNECT':
      handleWebSocketReconnection(event.ports[0]);
      break;
    
    case 'PREFETCH':
      await prefetchResources(data?.urls || []);
      event.ports[0].postMessage({ success: true });
      break;
  }
});

function handleWebSocketReconnection(port) {
  if (wsReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    port.postMessage({ 
      status: 'failed', 
      message: 'Max reconnection attempts reached' 
    });
    return;
  }
  
  const delay = RECONNECT_DELAYS[Math.min(wsReconnectAttempts, RECONNECT_DELAYS.length - 1)];
  
  setTimeout(() => {
    wsReconnectAttempts++;
    port.postMessage({ 
      status: 'reconnecting', 
      attempt: wsReconnectAttempts,
      nextDelay: delay
    });
  }, delay);
}

// Background sync for offline actions
self.addEventListener('sync', async (event) => {
  console.log(`[SW v${VERSION}] Background sync:`, event.tag);
  
  switch (event.tag) {
    case 'sync-actions':
      event.waitUntil(syncOfflineActions());
      break;
    
    case 'sync-metrics':
      event.waitUntil(syncMetrics());
      break;
    
    case 'update-check':
      event.waitUntil(checkForUpdates());
      break;
  }
});

async function syncOfflineActions() {
  const db = await getDB();
  const tx = db.transaction('offline-actions', 'readwrite');
  const store = tx.objectStore('offline-actions');
  const actions = await store.getAll();
  
  for (const action of actions) {
    try {
      const response = await fetch(action.url, action.options);
      if (response.ok) {
        await store.delete(action.id);
        console.log(`[SW v${VERSION}] Synced action:`, action.id);
      }
    } catch (error) {
      console.error(`[SW v${VERSION}] Failed to sync:`, action.id, error);
    }
  }
}

// Push notifications with rich content
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'New notification from FantDev Trading',
    icon: data.icon || '/images/icon-192x192.png',
    badge: '/images/icon-64x64.png',
    image: data.image,
    vibrate: [100, 50, 100],
    tag: data.tag || 'default',
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    timestamp: Date.now(),
    data: {
      ...data,
      dateOfArrival: Date.now(),
      primaryKey: data.id || Date.now()
    },
    actions: data.actions || [
      { action: 'open', title: 'Open', icon: '/images/icon-48x48.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/images/icon-48x48.png' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'FantDev Trading', options)
  );
});

// Enhanced notification click handling
self.addEventListener('notificationclick', (event) => {
  const { action, notification } = event;
  const data = notification.data;
  
  notification.close();
  
  event.waitUntil(
    handleNotificationAction(action, data)
  );
});

async function handleNotificationAction(action, data) {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  switch (action) {
    case 'open':
      const url = data.url || '/portals/portal-hub.html';
      const client = clients.find(c => c.url === url && 'focus' in c);
      
      if (client) {
        await client.focus();
      } else {
        await self.clients.openWindow(url);
      }
      break;
    
    case 'dismiss':
      // Track dismissal
      await trackEvent('notification_dismissed', data);
      break;
    
    default:
      // Handle custom actions
      if (data.actions && data.actions[action]) {
        await fetch(data.actions[action].endpoint, {
          method: 'POST',
          body: JSON.stringify({ action, data })
        });
      }
  }
}

// IndexedDB setup and operations
let db;

async function setupIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fantdev-sw-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Create stores
      if (!database.objectStoreNames.contains('offline-actions')) {
        database.createObjectStore('offline-actions', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!database.objectStoreNames.contains('metrics')) {
        database.createObjectStore('metrics', { keyPath: 'timestamp' });
      }
      
      if (!database.objectStoreNames.contains('cache-metadata')) {
        const store = database.createObjectStore('cache-metadata', { keyPath: 'url' });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('size', 'size');
      }
    };
  });
}

async function getDB() {
  if (!db) {
    await setupIndexedDB();
  }
  return db;
}

// Metrics and analytics
function recordMetrics(startTime, success) {
  const responseTime = performance.now() - startTime;
  
  METRICS.totalResponseTime += responseTime;
  METRICS.requestCount++;
  METRICS.avgResponseTime = METRICS.totalResponseTime / METRICS.requestCount;
  
  if (!success) {
    METRICS.failedRequests++;
  }
  
  // Store in IndexedDB for persistence
  if (METRICS.requestCount % 100 === 0) {
    storeMetrics();
  }
}

async function storeMetrics() {
  try {
    const database = await getDB();
    const tx = database.transaction('metrics', 'readwrite');
    const store = tx.objectStore('metrics');
    
    await store.put({
      timestamp: Date.now(),
      ...METRICS,
      version: VERSION
    });
  } catch (error) {
    console.error(`[SW v${VERSION}] Failed to store metrics:`, error);
  }
}

function getMetrics() {
  const hitRate = METRICS.cacheHits / (METRICS.cacheHits + METRICS.cacheMisses) * 100;
  const successRate = (METRICS.requestCount - METRICS.failedRequests) / METRICS.requestCount * 100;
  
  return {
    ...METRICS,
    hitRate: hitRate.toFixed(2) + '%',
    successRate: successRate.toFixed(2) + '%',
    version: VERSION,
    uptime: Date.now() - parseInt(BUILD_DATE)
  };
}

// Update management
async function checkForUpdates() {
  try {
    const response = await fetch('/api/sw-version');
    const data = await response.json();
    
    if (data.version !== VERSION) {
      await notifyUpdate(data.version);
    }
  } catch (error) {
    console.error(`[SW v${VERSION}] Update check failed:`, error);
  }
}

async function notifyUpdate(newVersion) {
  const clients = await self.clients.matchAll();
  
  clients.forEach(client => {
    client.postMessage({
      type: 'UPDATE_AVAILABLE',
      currentVersion: VERSION,
      newVersion: newVersion,
      message: `A new version (${newVersion}) is available. Refresh to update.`
    });
  });
}

function broadcastUpdate() {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'SW_UPDATED',
        version: VERSION,
        buildDate: BUILD_DATE
      });
    });
  });
}

// Offline fallback generation
async function getOfflineFallback(request) {
  const url = new URL(request.url);
  const resourceType = getResourceType(request);
  
  // Try to serve from any cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Generate appropriate offline response
  switch (resourceType) {
    case 'api':
      return new Response(
        JSON.stringify(OFFLINE_PAGES.api),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    
    case 'images':
      const placeholderImage = await caches.match(OFFLINE_PAGES.image);
      return placeholderImage || generateSVGPlaceholder();
    
    default:
      const offlinePage = await caches.match(OFFLINE_PAGES.default);
      return offlinePage || generateOfflineHTML();
  }
}

function generateSVGPlaceholder() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="#f0f0f0"/>
      <text x="50%" y="50%" text-anchor="middle" fill="#999" font-size="20">
        Image Offline
      </text>
    </svg>
  `;
  
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' }
  });
}

function generateOfflineHTML() {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - FantDev Trading</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
          padding: 2rem;
        }
        h1 { font-size: 3rem; margin-bottom: 1rem; }
        p { font-size: 1.2rem; opacity: 0.9; }
        button {
          margin-top: 2rem;
          padding: 1rem 2rem;
          font-size: 1rem;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📡 You're Offline</h1>
        <p>Please check your internet connection and try again.</p>
        <button onclick="location.reload()">Retry</button>
      </div>
    </body>
    </html>
  `;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Error reporting
async function reportError(context, error) {
  try {
    await fetch('/api/sw-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context,
        error: error.message,
        stack: error.stack,
        version: VERSION,
        timestamp: Date.now()
      })
    });
  } catch (err) {
    // Silently fail - we're already in error handling
    console.error(`[SW v${VERSION}] Could not report error:`, err);
  }
}

// Track events for analytics
async function trackEvent(eventName, data) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        data,
        version: VERSION,
        timestamp: Date.now()
      })
    });
  } catch (error) {
    console.error(`[SW v${VERSION}] Failed to track event:`, error);
  }
}

// Helper to clear specific cache or all caches
async function clearCache(cacheName) {
  if (cacheName) {
    await caches.delete(cacheName);
  } else {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
}

// Prefetch resources on demand
async function prefetchResources(urls) {
  const cache = await caches.open(CACHE_CONFIG.caches.static);
  
  await Promise.all(
    urls.map(async (url) => {
      try {
        if (!await cache.match(url)) {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        }
      } catch (error) {
        console.warn(`[SW v${VERSION}] Prefetch failed:`, url);
      }
    })
  );
}

// Migration for data between versions
async function migrateData() {
  // Implement any data migration logic here
  console.log(`[SW v${VERSION}] Data migration check...`);
  // Example: migrate old cache structure to new one
}

console.log(`[SW v${VERSION}] Service worker loaded - Build: ${BUILD_DATE}`);
