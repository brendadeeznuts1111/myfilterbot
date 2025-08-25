/**
 * Navigation Initialization Script
 * Replaces inline JavaScript with proper event delegation
 * Handles all navigation interactions without jQuery
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNavigation);
  } else {
    initializeNavigation();
  }

  /**
   * Initialize navigation system
   */
  function initializeNavigation() {
    // Import navigation handler if available
    const navigationHandler = window.navigationHandler || createBasicNavigationHandler();
    
    // Set up event delegation for navigation clicks
    setupNavigationEventDelegation(navigationHandler);
    
    // Initialize mobile toggle
    setupMobileToggle();
    
    // Initialize settings modal handler
    setupSettingsModal();
    
    // Initialize view mode switchers
    setupViewModeSwitchers();
    
    // Restore saved navigation state
    restoreNavigationState();
    
    // Set up keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Initialize tooltips for navigation items
    initializeTooltips();
  }

  /**
   * Create a basic navigation handler if the TypeScript module isn't loaded
   */
  function createBasicNavigationHandler() {
    return {
      handleNavigationAction: async function(action) {
        console.log('Navigation action:', action);
        
        // Map actions to their handlers
        const actionHandlers = {
          'show-settings-modal': () => showSettingsModal(),
          'switch-to-desktop': () => switchViewMode('desktop'),
          'switch-to-mobile': () => switchViewMode('mobile')
        };
        
        if (actionHandlers[action]) {
          actionHandlers[action]();
          return { success: true };
        }
        
        // For API actions, make the request
        const endpoint = getEndpointForAction(action);
        if (endpoint) {
          return await fetchFromAPI(endpoint);
        }
        
        return { success: false, error: 'Unknown action' };
      }
    };
  }

  /**
   * Set up event delegation for all navigation clicks
   */
  function setupNavigationEventDelegation(navigationHandler) {
    // Find all navigation containers
    const navContainers = document.querySelectorAll('.fantdev-nav, .nav, ul.navigation');
    
    navContainers.forEach(container => {
      container.addEventListener('click', async function(event) {
        // Find the closest navigation link
        const link = event.target.closest('a[data-action], .nav-link[data-action]');
        
        if (!link) return;
        
        // Prevent default navigation
        event.preventDefault();
        event.stopPropagation();
        
        // Get the action from data attribute
        const action = link.getAttribute('data-action');
        
        if (!action) return;
        
        // Handle the action
        try {
          // Add loading state
          link.classList.add('loading');
          
          // Execute the navigation action
          const response = await navigationHandler.handleNavigationAction(action);
          
          if (response.success) {
            // Update active state
            updateActiveNavItem(link);
            
            // Dispatch success event
            dispatchNavigationEvent('navigation:success', {
              action,
              data: response.data
            });
            
            // Update dashboard content if handler is available
            if (window.dashboard && window.dashboard.loadContent) {
              window.dashboard.loadContent(response.data);
            }
          } else {
            // Show error
            console.error('Navigation action failed:', response.error);
            dispatchNavigationEvent('navigation:error', {
              action,
              error: response.error
            });
          }
        } catch (error) {
          console.error('Navigation error:', error);
        } finally {
          // Remove loading state
          link.classList.remove('loading');
        }
      });
    });
    
    // Handle submenu toggles
    container.addEventListener('click', function(event) {
      const toggle = event.target.closest('.has-sub > a, .fantdev-nav-link-expandable');
      
      if (!toggle) return;
      
      event.preventDefault();
      
      // Toggle submenu
      const parentItem = toggle.parentElement;
      const isExpanded = parentItem.classList.contains('expanded');
      
      if (isExpanded) {
        parentItem.classList.remove('expanded');
        saveNavigationState('collapsed', toggle.getAttribute('data-id'));
      } else {
        parentItem.classList.add('expanded');
        saveNavigationState('expanded', toggle.getAttribute('data-id'));
      }
    });
  }

  /**
   * Show settings modal without jQuery
   */
  function showSettingsModal() {
    // Find the settings modal
    let modal = document.querySelector('#update-settings, .modal#update-settings');
    
    if (!modal) {
      // Create modal if it doesn't exist
      modal = createSettingsModal();
    }
    
    // Show the modal
    modal.style.display = 'block';
    modal.classList.add('show');
    
    // Add backdrop
    let backdrop = document.querySelector('.modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop fade show';
      document.body.appendChild(backdrop);
    }
    
    // Add event listeners for closing
    modal.querySelector('.close, [data-dismiss="modal"]')?.addEventListener('click', hideSettingsModal);
    backdrop.addEventListener('click', hideSettingsModal);
  }

  /**
   * Hide settings modal
   */
  function hideSettingsModal() {
    const modal = document.querySelector('#update-settings, .modal#update-settings');
    const backdrop = document.querySelector('.modal-backdrop');
    
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
    
    if (backdrop) {
      backdrop.remove();
    }
  }

  /**
   * Create settings modal if it doesn't exist
   */
  function createSettingsModal() {
    const modal = document.createElement('div');
    modal.id = 'update-settings';
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Settings</h5>
            <button type="button" class="close" data-dismiss="modal">
              <span>&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <p>Settings content goes here</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary">Save changes</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  /**
   * Switch view mode between desktop and mobile
   */
  function switchViewMode(mode) {
    // Update body classes
    document.body.classList.toggle('mobile-view', mode === 'mobile');
    document.body.classList.toggle('desktop-view', mode === 'desktop');
    
    // Update viewport for mobile
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      if (mode === 'mobile') {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0');
      } else {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
    }
    
    // Save preference
    localStorage.setItem('viewMode', mode);
    
    // Dispatch event
    dispatchNavigationEvent('viewmode:changed', { mode });
  }

  /**
   * Set up mobile navigation toggle
   */
  function setupMobileToggle() {
    const toggleBtn = document.querySelector('.mobile-nav-toggle, .navbar-toggle');
    const sidebar = document.querySelector('.fantdev-sidebar, .sidebar');
    
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        sidebar.classList.toggle('collapsed');
      });
    }
  }

  /**
   * Set up view mode switchers
   */
  function setupViewModeSwitchers() {
    // Remove any existing onclick attributes
    document.querySelectorAll('[onclick*="switchViewMode"], [onclick*="switch-to-"]').forEach(element => {
      element.removeAttribute('onclick');
    });
  }

  /**
   * Set up settings modal handler
   */
  function setupSettingsModal() {
    // Remove jQuery onclick handlers
    document.querySelectorAll('[onclick*="modal(\'show\')"]').forEach(element => {
      element.removeAttribute('onclick');
      
      // Add proper event listener if it's a settings trigger
      if (element.textContent.includes('Settings') || element.querySelector('.fa-cog')) {
        element.addEventListener('click', function(e) {
          e.preventDefault();
          showSettingsModal();
        });
      }
    });
  }

  /**
   * Update active navigation item
   */
  function updateActiveNavItem(clickedLink) {
    // Remove active class from all items
    document.querySelectorAll('.fantdev-nav-link-active, .nav-link.active').forEach(item => {
      item.classList.remove('fantdev-nav-link-active', 'active');
    });
    
    // Add active class to clicked item
    clickedLink.classList.add('fantdev-nav-link-active', 'active');
    
    // Save to localStorage
    const itemId = clickedLink.getAttribute('data-id') || clickedLink.getAttribute('href');
    if (itemId) {
      localStorage.setItem('activeNavItem', itemId);
    }
  }

  /**
   * Restore navigation state from localStorage
   */
  function restoreNavigationState() {
    // Restore active item
    const activeItemId = localStorage.getItem('activeNavItem');
    if (activeItemId) {
      const activeLink = document.querySelector(`[data-id="${activeItemId}"], [href="${activeItemId}"]`);
      if (activeLink) {
        activeLink.classList.add('fantdev-nav-link-active', 'active');
      }
    }
    
    // Restore expanded submenus
    const expandedItems = JSON.parse(localStorage.getItem('expandedNavItems') || '[]');
    expandedItems.forEach(itemId => {
      const item = document.querySelector(`[data-id="${itemId}"]`);
      if (item && item.parentElement) {
        item.parentElement.classList.add('expanded');
      }
    });
    
    // Restore view mode
    const viewMode = localStorage.getItem('viewMode');
    if (viewMode) {
      switchViewMode(viewMode);
    }
  }

  /**
   * Save navigation state to localStorage
   */
  function saveNavigationState(action, itemId) {
    const expandedItems = JSON.parse(localStorage.getItem('expandedNavItems') || '[]');
    
    if (action === 'expanded') {
      if (!expandedItems.includes(itemId)) {
        expandedItems.push(itemId);
      }
    } else if (action === 'collapsed') {
      const index = expandedItems.indexOf(itemId);
      if (index > -1) {
        expandedItems.splice(index, 1);
      }
    }
    
    localStorage.setItem('expandedNavItems', JSON.stringify(expandedItems));
  }

  /**
   * Set up keyboard shortcuts for navigation
   */
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(event) {
      // Ctrl/Cmd + K for search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        focusNavigationSearch();
      }
      
      // Escape to close modals
      if (event.key === 'Escape') {
        hideSettingsModal();
      }
    });
  }

  /**
   * Focus navigation search if available
   */
  function focusNavigationSearch() {
    const searchInput = document.querySelector('.nav-search, .navigation-search, input[placeholder*="Search"]');
    if (searchInput) {
      searchInput.focus();
    }
  }

  /**
   * Initialize tooltips for navigation items
   */
  function initializeTooltips() {
    document.querySelectorAll('[data-tooltip], [title]').forEach(element => {
      const tooltipText = element.getAttribute('data-tooltip') || element.getAttribute('title');
      
      if (tooltipText) {
        // Remove title to prevent default tooltip
        element.removeAttribute('title');
        
        // Add tooltip on hover
        element.addEventListener('mouseenter', function(e) {
          showTooltip(e.target, tooltipText);
        });
        
        element.addEventListener('mouseleave', function() {
          hideTooltip();
        });
      }
    });
  }

  /**
   * Show tooltip
   */
  function showTooltip(element, text) {
    let tooltip = document.querySelector('.navigation-tooltip');
    
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'navigation-tooltip';
      document.body.appendChild(tooltip);
    }
    
    tooltip.textContent = text;
    tooltip.style.display = 'block';
    
    // Position tooltip
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.right + 10 + 'px';
    tooltip.style.top = rect.top + (rect.height / 2) - (tooltip.offsetHeight / 2) + 'px';
  }

  /**
   * Hide tooltip
   */
  function hideTooltip() {
    const tooltip = document.querySelector('.navigation-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Get API endpoint for action
   */
  function getEndpointForAction(action) {
    const endpoints = {
      'get-transactions': '/api/dashboard/transactions',
      'get-agent-performance': '/api/reports/agent-performance',
      'get-analysis': '/api/reports/analysis',
      'get-ip-tracker': '/api/security/ip-tracker',
      'get-transaction-history': '/api/reports/transaction-history',
      'get-collections': '/api/reports/collections',
      'get-deleted-wagers': '/api/reports/deleted-wagers',
      'get-bet-ticker': '/api/tools/bet-ticker',
      'get-ticketwriter': '/api/tools/ticketwriter',
      'get-sportsbook-lines': '/api/tools/sportsbook-lines',
      'get-scores': '/api/tools/scores',
      'add-account': '/api/customers/add',
      'get-live-betting-limits': '/api/betting/live-limits',
      'get-billing': '/api/billing',
      'get-rules': '/api/content/rules',
      'get-contact': '/api/content/contact'
    };
    
    return endpoints[action];
  }

  /**
   * Fetch from API
   */
  async function fetchFromAPI(endpoint) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (localStorage.getItem('authToken') || '')
        }
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Dispatch custom navigation event
   */
  function dispatchNavigationEvent(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }

})();