/**
 * FantDev Trading - Modern JavaScript Utilities
 * ES6+ utilities for enhanced web development
 */

// Modern utility functions using ES6+ features
const Utils = {
  // DOM Manipulation
  DOM: {
    // Create element with attributes and children
    createElement(tag, attributes = {}, children = []) {
      const element = document.createElement(tag);
      
      // Set attributes
      Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
          element.className = value;
        } else if (key === 'textContent') {
          element.textContent = value;
        } else if (key === 'innerHTML') {
          element.innerHTML = value;
        } else if (key.startsWith('data-')) {
          element.setAttribute(key, value);
        } else {
          element[key] = value;
        }
      });
      
      // Append children
      children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else {
          element.appendChild(child);
        }
      });
      
      return element;
    },

    // Query selector with error handling
    query(selector, parent = document) {
      const element = parent.querySelector(selector);
      if (!element) {
        console.warn(`Element not found: ${selector}`);
      }
      return element;
    },

    // Query all elements
    queryAll(selector, parent = document) {
      return Array.from(parent.querySelectorAll(selector));
    },

    // Add event listener with cleanup
    on(element, event, handler, options = {}) {
      element.addEventListener(event, handler, options);
      return () => element.removeEventListener(event, handler, options);
    },

    // Remove event listener
    off(element, event, handler, options = {}) {
      element.removeEventListener(event, handler, options);
    },

    // Toggle classes
    toggleClass(element, className, force) {
      if (force !== undefined) {
        element.classList.toggle(className, force);
      } else {
        element.classList.toggle(className);
      }
    },

    // Add multiple classes
    addClasses(element, ...classes) {
      element.classList.add(...classes);
    },

    // Remove multiple classes
    removeClasses(element, ...classes) {
      element.classList.remove(...classes);
    },

    // Check if element has any of the classes
    hasAnyClass(element, ...classes) {
      return classes.some(cls => element.classList.contains(cls));
    },

    // Get computed styles
    getStyles(element, property) {
      return window.getComputedStyle(element).getPropertyValue(property);
    },

    // Set CSS custom property
    setCSSProperty(element, property, value) {
      element.style.setProperty(property, value);
    },

    // Get CSS custom property
    getCSSProperty(element, property) {
      return element.style.getPropertyValue(property);
    }
  },

  // Array utilities
  Array: {
    // Chunk array into smaller arrays
    chunk(array, size) {
      return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
        array.slice(i * size, i * size + size)
      );
    },

    // Remove duplicates while preserving order
    unique(array) {
      return [...new Set(array)];
    },

    // Group array by key function
    groupBy(array, keyFn) {
      return array.reduce((groups, item) => {
        const key = keyFn(item);
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
        return groups;
      }, {});
    },

    // Sort array by multiple criteria
    sortBy(array, ...criteria) {
      return array.sort((a, b) => {
        for (const criterion of criteria) {
          const aVal = typeof criterion === 'function' ? criterion(a) : a[criterion];
          const bVal = typeof criterion === 'function' ? criterion(b) : b[criterion];
          
          if (aVal < bVal) return -1;
          if (aVal > bVal) return 1;
        }
        return 0;
      });
    },

    // Find index with custom predicate
    findIndex(array, predicate) {
      return array.findIndex(predicate);
    },

    // Remove item by predicate
    remove(array, predicate) {
      const index = array.findIndex(predicate);
      if (index > -1) {
        array.splice(index, 1);
        return true;
      }
      return false;
    }
  },

  // Object utilities
  Object: {
    // Deep clone object
    clone(obj) {
      if (obj === null || typeof obj !== 'object') return obj;
      if (obj instanceof Date) return new Date(obj.getTime());
      if (obj instanceof Array) return obj.map(item => Utils.Object.clone(item));
      if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            cloned[key] = Utils.Object.clone(obj[key]);
          }
        }
        return cloned;
      }
      return obj;
    },

    // Merge objects deeply
    merge(target, ...sources) {
      if (!sources.length) return target;
      const source = sources.shift();
      
      if (source && typeof source === 'object') {
        for (const key in source) {
          if (source.hasOwnProperty(key)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
              target[key] = target[key] || {};
              Utils.Object.merge(target[key], source[key]);
            } else {
              target[key] = source[key];
            }
          }
        }
      }
      
      return Utils.Object.merge(target, ...sources);
    },

    // Pick specific keys from object
    pick(obj, keys) {
      return keys.reduce((result, key) => {
        if (obj.hasOwnProperty(key)) {
          result[key] = obj[key];
        }
        return result;
      }, {});
    },

    // Omit specific keys from object
    omit(obj, keys) {
      return Object.keys(obj)
        .filter(key => !keys.includes(key))
        .reduce((result, key) => {
          result[key] = obj[key];
          return result;
        }, {});
    },

    // Check if object is empty
    isEmpty(obj) {
      return obj && Object.keys(obj).length === 0;
    }
  },

  // String utilities
  String: {
    // Capitalize first letter
    capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    // Convert to camelCase
    toCamelCase(str) {
      return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    },

    // Convert to kebab-case
    toKebabCase(str) {
      return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    },

    // Convert to PascalCase
    toPascalCase(str) {
      return str.charAt(0).toUpperCase() + str.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    },

    // Truncate string with ellipsis
    truncate(str, length, suffix = '...') {
      return str.length > length ? str.substring(0, length) + suffix : str;
    },

    // Generate random string
    random(length = 8) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    }
  },

  // Number utilities
  Number: {
    // Format number with commas
    format(num, decimals = 0) {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    },

    // Format currency
    formatCurrency(amount, currency = 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount);
    },

    // Format percentage
    formatPercent(value, decimals = 2) {
      return `${(value * 100).toFixed(decimals)}%`;
    },

    // Clamp number between min and max
    clamp(num, min, max) {
      return Math.min(Math.max(num, min), max);
    },

    // Round to specific decimal places
    round(num, decimals = 0) {
      const factor = Math.pow(10, decimals);
      return Math.round(num * factor) / factor;
    }
  },

  // Date utilities
  Date: {
    // Format date
    format(date, format = 'YYYY-MM-DD') {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');

      return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
    },

    // Get relative time (e.g., "2 hours ago")
    relativeTime(date) {
      const now = new Date();
      const diff = now - new Date(date);
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
      if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      return 'Just now';
    },

    // Check if date is today
    isToday(date) {
      const today = new Date();
      const d = new Date(date);
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    },

    // Add days to date
    addDays(date, days) {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    }
  },

  // Async utilities
  Async: {
    // Delay execution
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Retry function with exponential backoff
    async retry(fn, maxAttempts = 3, baseDelay = 1000) {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await fn();
        } catch (error) {
          if (attempt === maxAttempts) throw error;
          
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await Utils.Async.delay(delay);
        }
      }
    },

    // Debounce function
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    // Throttle function
    throttle(func, limit) {
      let inThrottle;
      return function(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    }
  },

  // Storage utilities
  Storage: {
    // Set item with expiration
    setWithExpiry(key, value, ttl) {
      const item = {
        value: value,
        expiry: Date.now() + ttl
      };
      localStorage.setItem(key, JSON.stringify(item));
    },

    // Get item with expiration check
    getWithExpiry(key) {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);
      if (Date.now() > item.expiry) {
        localStorage.removeItem(key);
        return null;
      }
      return item.value;
    },

    // Remove expired items
    cleanupExpired() {
      Object.keys(localStorage).forEach(key => {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          if (item.expiry && Date.now() > item.expiry) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // Not a JSON item, skip
        }
      });
    }
  },

  // Validation utilities
  Validation: {
    // Email validation
    isEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },

    // URL validation
    isURL(url) {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    },

    // Phone number validation (basic)
    isPhone(phone) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(phone.replace(/\s/g, ''));
    },

    // Password strength checker
    checkPasswordStrength(password) {
      let score = 0;
      if (password.length >= 8) score++;
      if (/[a-z]/.test(password)) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[0-9]/.test(password)) score++;
      if (/[^A-Za-z0-9]/.test(password)) score++;
      
      if (score < 2) return 'weak';
      if (score < 4) return 'medium';
      return 'strong';
    }
  },

  // Performance utilities
  Performance: {
    // Measure execution time
    measure(name, fn) {
      const start = performance.now();
      const result = fn();
      const end = performance.now();
      console.log(`${name} took ${(end - start).toFixed(2)}ms`);
      return result;
    },

    // Async measure execution time
    async measureAsync(name, fn) {
      const start = performance.now();
      const result = await fn();
      const end = performance.now();
      console.log(`${name} took ${(end - start).toFixed(2)}ms`);
      return result;
    },

    // Throttle scroll events
    throttleScroll(callback, delay = 16) {
      let ticking = false;
      return function() {
        if (!ticking) {
          requestAnimationFrame(() => {
            callback.apply(this, arguments);
            ticking = false;
          });
          ticking = true;
        }
      };
    }
  }
};

// Export for both ES6 modules and global use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
} else if (typeof window !== 'undefined') {
  window.Utils = Utils;
}

// Auto-cleanup expired storage items
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    Utils.Storage.cleanupExpired();
  });
}
