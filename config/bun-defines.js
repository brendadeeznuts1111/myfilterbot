/**
 * Bun --define Configuration
 * Static constants for build-time optimization and dead code elimination
 */

// Helper to format define flags for command line
const formatDefines = (defines) => {
  return Object.entries(defines)
    .map(([key, value]) => `--define ${key}=${JSON.stringify(value)}`)
    .join(' ');
};

// Development environment defines
const developmentDefines = {
  // Environment
  'process.env.NODE_ENV': 'development',
  'NODE_ENV': 'development',
  
  // Feature flags
  'process.env.FF_ANALYTICS': 'true',
  'process.env.FF_RBAC': 'true',
  'process.env.ENABLE_ADMIN_MOBILE': 'true',
  'FF_ANALYTICS': true,
  'FF_RBAC': true,
  'ENABLE_ADMIN_MOBILE': true,
  
  // Debug/Console
  'ENABLE_CONSOLE_LOGS': true,
  'ENABLE_DEBUG_MODE': true,
  'ENABLE_DEV_TOOLS': true,
  
  // API URLs (development)
  'process.env.REACT_APP_API_URL': 'http://localhost:3003',
  'process.env.ADMIN_SERVER_URL': 'http://localhost:3003',
  'process.env.PORTAL_SERVER_URL': 'http://localhost:5000',
  'process.env.WEBSOCKET_URL': 'ws://localhost:3003',
  'API_BASE_URL': 'http://localhost:3003/api',
  
  // Performance constants
  'WORKER_POOL_SIZE': 4,
  'MAX_CONCURRENT_REQUESTS': 50,
  'CACHE_TTL': 300,
  
  // Thresholds
  'LOW_BALANCE_THRESHOLD': 100,
  'LARGE_DEPOSIT_THRESHOLD': 1000,
  'LARGE_WITHDRAWAL_THRESHOLD': 500,
  'INACTIVE_DAYS_THRESHOLD': 3,
};

// Production environment defines
const productionDefines = {
  // Environment
  'process.env.NODE_ENV': 'production',
  'NODE_ENV': 'production',
  
  // Feature flags (can be toggled per deployment)
  'process.env.FF_ANALYTICS': 'true',
  'process.env.FF_RBAC': 'true',
  'process.env.ENABLE_ADMIN_MOBILE': 'true',
  'FF_ANALYTICS': true,
  'FF_RBAC': true,
  'ENABLE_ADMIN_MOBILE': true,
  
  // Debug/Console (disabled in production)
  'ENABLE_CONSOLE_LOGS': false,
  'ENABLE_DEBUG_MODE': false,
  'ENABLE_DEV_TOOLS': false,
  
  // API URLs (production)
  'process.env.REACT_APP_API_URL': 'https://api.fantdev.trading',
  'process.env.ADMIN_SERVER_URL': 'https://admin.fantdev.trading',
  'process.env.PORTAL_SERVER_URL': 'https://fantdev.trading',
  'process.env.WEBSOCKET_URL': 'wss://fantdev.trading',
  'API_BASE_URL': 'https://api.fantdev.trading',
  
  // Performance constants (optimized for production)
  'WORKER_POOL_SIZE': 8,
  'MAX_CONCURRENT_REQUESTS': 100,
  'CACHE_TTL': 600,
  
  // Thresholds
  'LOW_BALANCE_THRESHOLD': 100,
  'LARGE_DEPOSIT_THRESHOLD': 1000,
  'LARGE_WITHDRAWAL_THRESHOLD': 500,
  'INACTIVE_DAYS_THRESHOLD': 3,
};

// Test environment defines
const testDefines = {
  // Environment
  'process.env.NODE_ENV': 'test',
  'NODE_ENV': 'test',
  
  // Feature flags (all enabled for testing)
  'process.env.FF_ANALYTICS': 'true',
  'process.env.FF_RBAC': 'true',
  'process.env.ENABLE_ADMIN_MOBILE': 'true',
  'FF_ANALYTICS': true,
  'FF_RBAC': true,
  'ENABLE_ADMIN_MOBILE': true,
  
  // Debug/Console (enabled for test debugging)
  'ENABLE_CONSOLE_LOGS': true,
  'ENABLE_DEBUG_MODE': true,
  'ENABLE_DEV_TOOLS': false,
  
  // API URLs (test environment)
  'process.env.REACT_APP_API_URL': 'http://localhost:3003',
  'process.env.ADMIN_SERVER_URL': 'http://localhost:3003',
  'process.env.PORTAL_SERVER_URL': 'http://localhost:5000',
  'process.env.WEBSOCKET_URL': 'ws://localhost:3003',
  'API_BASE_URL': 'http://localhost:3003/api',
  
  // Performance constants (reduced for testing)
  'WORKER_POOL_SIZE': 2,
  'MAX_CONCURRENT_REQUESTS': 10,
  'CACHE_TTL': 60,
  
  // Thresholds
  'LOW_BALANCE_THRESHOLD': 100,
  'LARGE_DEPOSIT_THRESHOLD': 1000,
  'LARGE_WITHDRAWAL_THRESHOLD': 500,
  'INACTIVE_DAYS_THRESHOLD': 3,
};

// Export configurations
module.exports = {
  development: developmentDefines,
  production: productionDefines,
  test: testDefines,
  
  // Helper functions
  formatDefines,
  
  // Get defines for current environment
  getDefines: (env = process.env.NODE_ENV || 'development') => {
    switch (env) {
      case 'production':
        return productionDefines;
      case 'test':
        return testDefines;
      default:
        return developmentDefines;
    }
  },
  
  // Get formatted define flags for CLI
  getDefineFlags: (env = process.env.NODE_ENV || 'development') => {
    const defines = module.exports.getDefines(env);
    return formatDefines(defines);
  },
  
  // Build command helpers
  getBuildCommand: (entryPoint, env = 'production') => {
    const defines = module.exports.getDefines(env);
    const defineFlags = formatDefines(defines);
    return `bun build ${defineFlags} --target=bun --splitting --minify --sourcemap=external --outdir=dist ${entryPoint}`;
  },
  
  getRunCommand: (entryPoint, env = 'development') => {
    const defines = module.exports.getDefines(env);
    const defineFlags = formatDefines(defines);
    return `bun ${defineFlags} ${entryPoint}`;
  },
};