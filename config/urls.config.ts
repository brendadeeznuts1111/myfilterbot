// Centralized URL configuration for the Fantdev Trading Bot
// This replaces hardcoded localhost URLs throughout the codebase

export interface URLConfig {
  // Development URLs
  development: {
    adminPortal: string;
    customerPortal: string;
    paymentAPI: string;
    telegramBot: string;
    cloudflareWorker: string;
    websocket: string;
    api: string;
  };
  
  // Production URLs
  production: {
    adminPortal: string;
    customerPortal: string;
    paymentAPI: string;
    telegramBot: string;
    cloudflareWorker: string;
    websocket: string;
    api: string;
  };
  
  // External service URLs
  external: {
    telegramAPI: string;
    telegramWebApp: string;
    telegramBotFather: string;
    bunDocs: string;
    reactDocs: string;
    tailwindDocs: string;
    pythonTelegramBotDocs: string;
  };
  
  // Static asset paths
  assets: {
    images: string;
    static: string;
    css: string;
    js: string;
  };
}

// Default configuration
export const defaultURLs: URLConfig = {
  development: {
    adminPortal: process.env.ADMIN_SERVER_URL || 'http://localhost:3003',
    customerPortal: process.env.PORTAL_SERVER_URL || 'http://localhost:5000',
    paymentAPI: process.env.PAYMENT_API_URL || 'http://localhost:5001',
    telegramBot: process.env.TELEGRAM_BOT_URL || 'http://localhost:3004',
    cloudflareWorker: process.env.CLOUDFLARE_WORKER_URL || 'http://localhost:8787',
    websocket: process.env.WEBSOCKET_URL || 'http://localhost:3003',
    api: process.env.API_BASE_URL || 'http://localhost:3003/api',
  },
  
  production: {
    adminPortal: process.env.PROD_ADMIN_SERVER_URL || 'https://admin.fantdev.trading',
    customerPortal: process.env.PROD_PORTAL_SERVER_URL || 'https://fantdev.trading',
    paymentAPI: process.env.PROD_PAYMENT_API_URL || 'https://api.fantdev.trading',
    telegramBot: process.env.PROD_TELEGRAM_BOT_URL || 'https://bot.fantdev.trading',
    cloudflareWorker: process.env.PROD_CLOUDFLARE_WORKER_URL || 'https://worker.fantdev.trading',
    websocket: process.env.PROD_WEBSOCKET_URL || 'wss://fantdev.trading',
    api: process.env.PROD_API_BASE_URL || 'https://api.fantdev.trading',
  },
  
  external: {
    telegramAPI: 'https://core.telegram.org/bots/api',
    telegramWebApp: 'https://telegram.org/js/telegram-web-app.js',
    telegramBotFather: 'https://t.me/botfather',
    bunDocs: 'https://bun.sh/docs',
    reactDocs: 'https://react.dev/',
    tailwindDocs: 'https://tailwindcss.com/',
    pythonTelegramBotDocs: 'https://docs.python-telegram-bot.org/',
  },
  
  assets: {
    images: '/images',
    static: '/static',
    css: '/static/css',
    js: '/static/js',
  },
};

// Get current environment
export const getCurrentEnvironment = (): 'development' | 'production' => {
  return (process.env.NODE_ENV || 'development') as 'development' | 'production';
};

// Get URLs for current environment
export const getURLs = (): URLConfig['development'] | URLConfig['production'] => {
  const env = getCurrentEnvironment();
  return defaultURLs[env];
};

// Get specific URL
export const getURL = (type: keyof URLConfig['development'] | keyof URLConfig['production']): string => {
  const urls = getURLs();
  return urls[type as keyof typeof urls];
};

// Get external URL
export const getExternalURL = (type: keyof URLConfig['external']): string => {
  return defaultURLs.external[type];
};

// Get asset URL
export const getAssetURL = (type: keyof URLConfig['assets'], path: string = ''): string => {
  const base = defaultURLs.assets[type];
  return path ? `${base}/${path}` : base;
};

// Utility functions
export const isDevelopment = (): boolean => getCurrentEnvironment() === 'development';
export const isProduction = (): boolean => getCurrentEnvironment() === 'production';

// Export default configuration
export default defaultURLs;
