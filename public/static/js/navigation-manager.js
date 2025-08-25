/**
 * Navigation Manager - Centralized navigation system
 * Provides unified navigation across all components and pages
 */

class NavigationManager {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.history = [];
    this.observers = [];
    this.init();
  }

  init() {
    this.setupRoutes();
    this.setupEventListeners();
    this.setupScrollSpy();
    this.setupKeyboardNavigation();
  }

  setupRoutes() {
    // Define all application routes
    this.routes.set('dashboard', {
      path: '/dashboard/modern-optimized.html',
      title: 'Trading Dashboard',
      icon: '📊',
      description: 'Real-time trading dashboard'
    });
    
    this.routes.set('admin', {
      path: '/portals/admin-portal.html',
      title: 'Admin Portal',
      icon: '⚙️',
      description: 'System administration'
    });
    
    this.routes.set('customer', {
      path: '/portals/customer-portal.html',
      title: 'Customer Portal',
      icon: '👥',
      description: 'Customer management'
    });
    
    this.routes.set('miniapp', {
      path: '/miniapp/index.html',
      title: 'Telegram Mini App',
      icon: '📱',
      description: 'Mobile trading app'
    });
  }

  setupEventListeners() {
    // Handle navigation events
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-navigate]');
      if (link) {
        e.preventDefault();
        const route = link.dataset.navigate;
        this.navigate(route);
      }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      this.handlePopState(e);
    });
  }

  setupScrollSpy() {
    const sections = document.querySelectorAll('[data-section]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.updateActiveSection(entry.target.dataset.section);
        }
      });
    }, { threshold: 0.3 });

    sections.forEach(section => observer.observe(section));
  }

  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && e.shiftKey) {
        this.handleKeyboardNavigation('previous');
      } else if (e.key === 'Tab') {
        this.handleKeyboardNavigation('next');
      }
    });
  }

  navigate(route, options = {}) {
    const routeConfig = this.routes.get(route);
    if (!routeConfig) {
      console.error(`Route ${route} not found`);
      return;
    }

    // Update current route
    this.currentRoute = route;
    this.history.push({ route, timestamp: Date.now() });

    // Update URL
    if (!options.replace) {
      history.pushState({ route }, routeConfig.title, routeConfig.path);
    } else {
      history.replaceState({ route }, routeConfig.title, routeConfig.path);
    }

    // Notify observers
    this.notifyObservers('routeChange', { route, routeConfig });

    // Update navigation UI
    this.updateNavigationUI(route);
  }

  updateActiveSection(sectionId) {
    // Update active state for navigation items
    document.querySelectorAll('[data-section-link]').forEach(link => {
      link.classList.toggle('active', link.dataset.sectionLink === sectionId);
    });
  }

  updateNavigationUI(route) {
    // Update active navigation states
    document.querySelectorAll('[data-navigate]').forEach(link => {
      link.classList.toggle('active', link.dataset.navigate === route);
    });
  }

  handlePopState(e) {
    const { route } = e.state || {};
    if (route) {
      this.currentRoute = route;
      this.notifyObservers('routeChange', { route, fromHistory: true });
    }
  }

  handleKeyboardNavigation(direction) {
    // Implement keyboard navigation logic
    const navItems = Array.from(document.querySelectorAll('[data-navigate]'));
    const activeIndex = navItems.findIndex(item => item.classList.contains('active'));
    
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (activeIndex + 1) % navItems.length;
    } else {
      nextIndex = (activeIndex - 1 + navItems.length) % navItems.length;
    }
    
    navItems[nextIndex].focus();
  }

  addObserver(callback) {
    this.observers.push(callback);
  }

  notifyObservers(event, data) {
    this.observers.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Navigation observer error:', error);
      }
    });
  }

  getRouteHistory() {
    return [...this.history];
  }

  getCurrentRoute() {
    return this.currentRoute;
  }
}

// Global navigation instance
window.NavigationManager = NavigationManager;
