// Feature flags that can be statically replaced by Bun's --define
// These will be replaced at build time with actual boolean values
declare const FF_ANALYTICS: boolean;
declare const FF_RBAC: boolean;
declare const ENABLE_ADMIN_MOBILE: boolean;

// Fallback to environment variables if defines are not provided
const getFeatureFlag = (definedValue: boolean | undefined, envKey: string): boolean => {
  // If the value is defined (replaced by Bun), use it
  if (typeof definedValue === 'boolean') {
    return definedValue;
  }
  // Otherwise, fall back to environment variable
  return process.env[envKey] === 'true';
};

export const features = {
  analyticsV2: typeof FF_ANALYTICS !== 'undefined' ? FF_ANALYTICS : process.env.FF_ANALYTICS === 'true',
  rbac: typeof FF_RBAC !== 'undefined' ? FF_RBAC : process.env.FF_RBAC === 'true',
  adminMobile: typeof ENABLE_ADMIN_MOBILE !== 'undefined' ? ENABLE_ADMIN_MOBILE : process.env.ENABLE_ADMIN_MOBILE === 'true',
};
