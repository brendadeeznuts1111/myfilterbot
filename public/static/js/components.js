/**
 * FantDev Trading - Modern Component Library
 * Reusable UI components with modern web standards
 */

class ComponentLibrary {
  constructor() {
    this.components = new Map();
    this.init();
  }

  init() {
    this.setupGlobalEventListeners();
    this.autoInitialize();
  }

  // Global event delegation
  setupGlobalEventListeners() {
    document.addEventListener('click', (e) => {
      // Modal triggers
      if (e.target.matches('[data-modal]')) {
        e.preventDefault();
        this.openModal(e.target.dataset.modal);
      }

      // Dropdown toggles
      if (e.target.matches('[data-dropdown]')) {
        e.preventDefault();
        this.toggleDropdown(e.target.dataset.dropdown);
      }

      // Tooltip triggers
      if (e.target.matches('[data-tooltip]')) {
        this.showTooltip(e.target, e.target.dataset.tooltip);
      }

      // Close dropdowns when clicking outside
      if (!e.target.closest('[data-dropdown]')) {
        this.closeAllDropdowns();
      }
    });

    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  // Auto-initialize components
  autoInitialize() {
    // Initialize tooltips
    document.querySelectorAll('[data-tooltip]').forEach(element => {
      this.createTooltip(element);
    });

    // Initialize dropdowns
    document.querySelectorAll('[data-dropdown]').forEach(element => {
      this.createDropdown(element);
    });
  }

  // Modal Component
  createModal(id, options = {}) {
    const defaultOptions = {
      title: 'Modal',
      content: '',
      size: 'md', // sm, md, lg, xl
      closable: true,
      backdrop: true,
      onOpen: null,
      onClose: null
    };

    const config = { ...defaultOptions, ...options };
    
    const modal = document.createElement('div');
    modal.className = 'fantdev-modal';
    modal.id = id;
    modal.setAttribute('data-component', 'modal');
    
    const sizeClasses = {
      sm: 'fantdev-modal-sm',
      md: 'fantdev-modal-md',
      lg: 'fantdev-modal-lg',
      xl: 'fantdev-modal-xl'
    };

    modal.innerHTML = `
      <div class="fantdev-modal-backdrop"></div>
      <div class="fantdev-modal-container ${sizeClasses[config.size]}">
        <div class="fantdev-modal-header">
          <h3 class="fantdev-modal-title">${config.title}</h3>
          ${config.closable ? '<button class="fantdev-modal-close" aria-label="Close">&times;</button>' : ''}
        </div>
        <div class="fantdev-modal-body">
          ${config.content}
        </div>
      </div>
    `;

    // Add event listeners
    if (config.closable) {
      const closeBtn = modal.querySelector('.fantdev-modal-close');
      const backdrop = modal.querySelector('.fantdev-modal-backdrop');
      
      closeBtn.addEventListener('click', () => this.closeModal(id));
      if (config.backdrop) {
        backdrop.addEventListener('click', () => this.closeModal(id));
      }
    }

    document.body.appendChild(modal);
    this.components.set(id, { type: 'modal', element: modal, config });

    return modal;
  }

  openModal(id) {
    const component = this.components.get(id);
    if (component && component.type === 'modal') {
      component.element.classList.add('fantdev-modal-open');
      document.body.style.overflow = 'hidden';
      
      if (component.config.onOpen) {
        component.config.onOpen(component.element);
      }
    }
  }

  closeModal(id) {
    const component = this.components.get(id);
    if (component && component.type === 'modal') {
      component.element.classList.remove('fantdev-modal-open');
      document.body.style.overflow = '';
      
      if (component.config.onClose) {
        component.config.onClose(component.element);
      }
    }
  }

  closeAllModals() {
    this.components.forEach((component, id) => {
      if (component.type === 'modal') {
        this.closeModal(id);
      }
    });
  }

  // Dropdown Component
  createDropdown(trigger, options = {}) {
    const defaultOptions = {
      content: '',
      position: 'bottom', // top, bottom, left, right
      autoClose: true,
      onOpen: null,
      onClose: null
    };

    const config = { ...defaultOptions, ...options };
    const id = trigger.dataset.dropdown;
    
    let dropdown = document.getElementById(id);
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.className = 'fantdev-dropdown';
      dropdown.id = id;
      dropdown.setAttribute('data-component', 'dropdown');
      dropdown.innerHTML = config.content;
      document.body.appendChild(dropdown);
    }

    this.components.set(id, { type: 'dropdown', element: dropdown, trigger, config });
    this.positionDropdown(dropdown, trigger, config.position);
  }

  toggleDropdown(id) {
    const component = this.components.get(id);
    if (component && component.type === 'dropdown') {
      const isOpen = component.element.classList.contains('fantdev-dropdown-open');
      
      if (isOpen) {
        this.closeDropdown(id);
      } else {
        this.openDropdown(id);
      }
    }
  }

  openDropdown(id) {
    const component = this.components.get(id);
    if (component && component.type === 'dropdown') {
      component.element.classList.add('fantdev-dropdown-open');
      this.positionDropdown(component.element, component.trigger, component.config.position);
      
      if (component.config.onOpen) {
        component.config.onOpen(component.element);
      }
    }
  }

  closeDropdown(id) {
    const component = this.components.get(id);
    if (component && component.type === 'dropdown') {
      component.element.classList.remove('fantdev-dropdown-open');
      
      if (component.config.onClose) {
        component.config.onClose(component.element);
      }
    }
  }

  closeAllDropdowns() {
    this.components.forEach((component, id) => {
      if (component.type === 'dropdown') {
        this.closeDropdown(id);
      }
    });
  }

  positionDropdown(dropdown, trigger, position) {
    const triggerRect = trigger.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();
    
    let top, left;
    
    switch (position) {
      case 'top':
        top = triggerRect.top - dropdownRect.height - 8;
        left = triggerRect.left + (triggerRect.width - dropdownRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + 8;
        left = triggerRect.left + (triggerRect.width - dropdownRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - dropdownRect.height) / 2;
        left = triggerRect.left - dropdownRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - dropdownRect.height) / 2;
        left = triggerRect.right + 8;
        break;
    }
    
    // Ensure dropdown stays within viewport
    top = Math.max(8, Math.min(top, window.innerHeight - dropdownRect.height - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - dropdownRect.width - 8));
    
    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
  }

  // Tooltip Component
  createTooltip(element, options = {}) {
    const defaultOptions = {
      content: element.dataset.tooltip,
      position: 'top', // top, bottom, left, right
      delay: 200,
      theme: 'dark' // dark, light
    };

    const config = { ...defaultOptions, ...options };
    const id = `tooltip-${Math.random().toString(36).substr(2, 9)}`;
    
    const tooltip = document.createElement('div');
    tooltip.className = `fantdev-tooltip fantdev-tooltip-${config.theme}`;
    tooltip.id = id;
    tooltip.setAttribute('data-component', 'tooltip');
    tooltip.textContent = config.content;
    tooltip.style.position = 'absolute';
    tooltip.style.zIndex = '1000';
    
    document.body.appendChild(tooltip);
    
    this.components.set(id, { type: 'tooltip', element: tooltip, trigger: element, config });
    
    return tooltip;
  }

  showTooltip(element, content) {
    const tooltipId = Array.from(this.components.entries())
      .find(([_, component]) => component.trigger === element)?.[0];
    
    if (tooltipId) {
      const component = this.components.get(tooltipId);
      const tooltip = component.element;
      
      // Position tooltip
      const rect = element.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let top, left;
      switch (component.config.position) {
        case 'top':
          top = rect.top - tooltipRect.height - 8;
          left = rect.left + (rect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = rect.bottom + 8;
          left = rect.left + (rect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = rect.top + (rect.height - tooltipRect.height) / 2;
          left = rect.left - tooltipRect.width - 8;
          break;
        case 'right':
          top = rect.top + (rect.height - tooltipRect.height) / 2;
          left = rect.right + 8;
          break;
      }
      
      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
      tooltip.classList.add('fantdev-tooltip-visible');
      
      // Auto-hide tooltip
      setTimeout(() => {
        tooltip.classList.remove('fantdev-tooltip-visible');
      }, 3000);
    }
  }

  // Toast Component
  showToast(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `fantdev-toast fantdev-toast-${type}`;
    toast.setAttribute('data-component', 'toast');
    toast.innerHTML = `
      <div class="fantdev-toast-content">
        <span class="fantdev-toast-message">${message}</span>
        <button class="fantdev-toast-close" aria-label="Close">&times;</button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Add close functionality
    const closeBtn = toast.querySelector('.fantdev-toast-close');
    closeBtn.addEventListener('click', () => {
      this.hideToast(toast);
    });
    
    // Show toast
    setTimeout(() => {
      toast.classList.add('fantdev-toast-visible');
    }, 100);
    
    // Auto-hide
    setTimeout(() => {
      this.hideToast(toast);
    }, duration);
    
    return toast;
  }

  hideToast(toast) {
    toast.classList.remove('fantdev-toast-visible');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  // Form Components
  createFormValidator(form, rules) {
    const validator = {
      form,
      rules,
      errors: new Map(),
      
      validate() {
        this.errors.clear();
        
        Object.entries(this.rules).forEach(([fieldName, fieldRules]) => {
          const field = this.form.querySelector(`[name="${fieldName}"]`);
          if (field) {
            const value = field.value.trim();
            const fieldErrors = [];
            
            fieldRules.forEach(rule => {
              if (rule.required && !value) {
                fieldErrors.push(rule.message || 'This field is required');
              } else if (rule.minLength && value.length < rule.minLength) {
                fieldErrors.push(rule.message || `Minimum length is ${rule.minLength} characters`);
              } else if (rule.maxLength && value.length > rule.maxLength) {
                fieldErrors.push(rule.message || `Maximum length is ${rule.maxLength} characters`);
              } else if (rule.pattern && !rule.pattern.test(value)) {
                fieldErrors.push(rule.message || 'Invalid format');
              } else if (rule.custom && !rule.custom(value)) {
                fieldErrors.push(rule.message || 'Invalid value');
              }
            });
            
            if (fieldErrors.length > 0) {
              this.errors.set(fieldName, fieldErrors);
            }
          }
        });
        
        return this.errors.size === 0;
      },
      
      showErrors() {
        this.errors.forEach((errors, fieldName) => {
          const field = this.form.querySelector(`[name="${fieldName}"]`);
          if (field) {
            field.classList.add('fantdev-form-error');
            
            // Remove existing error messages
            const existingError = field.parentNode.querySelector('.fantdev-form-error-message');
            if (existingError) {
              existingError.remove();
            }
            
            // Add error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'fantdev-form-error-message';
            errorDiv.textContent = errors[0];
            field.parentNode.appendChild(errorDiv);
          }
        });
      },
      
      clearErrors() {
        this.errors.clear();
        this.form.querySelectorAll('.fantdev-form-error').forEach(field => {
          field.classList.remove('fantdev-form-error');
        });
        this.form.querySelectorAll('.fantdev-form-error-message').forEach(error => {
          error.remove();
        });
      }
    };
    
    return validator;
  }

  // Table Component
  createDataTable(container, data, options = {}) {
    const defaultOptions = {
      columns: [],
      sortable: true,
      searchable: true,
      pagination: true,
      pageSize: 10,
      responsive: true
    };

    const config = { ...defaultOptions, ...options };
    
    const table = document.createElement('div');
    table.className = 'fantdev-data-table';
    table.setAttribute('data-component', 'data-table');
    
    // Build table HTML
    let tableHTML = '';
    
    if (config.searchable) {
      tableHTML += `
        <div class="fantdev-table-search">
          <input type="text" placeholder="Search..." class="fantdev-search-input">
        </div>
      `;
    }
    
    tableHTML += `
      <div class="fantdev-table-container">
        <table class="fantdev-table">
          <thead>
            <tr>
              ${config.columns.map(col => `
                <th class="${config.sortable ? 'fantdev-sortable' : ''}" data-column="${col.key}">
                  ${col.label}
                  ${config.sortable ? '<span class="fantdev-sort-icon">↕</span>' : ''}
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${this.renderTableRows(data, config.columns)}
          </tbody>
        </table>
      </div>
    `;
    
    if (config.pagination) {
      tableHTML += `
        <div class="fantdev-table-pagination">
          <div class="fantdev-pagination-info">
            Showing <span class="fantdev-pagination-start">1</span> to 
            <span class="fantdev-pagination-end">${Math.min(config.pageSize, data.length)}</span> of 
            <span class="fantdev-pagination-total">${data.length}</span> results
          </div>
          <div class="fantdev-pagination-controls">
            <button class="fantdev-pagination-prev" disabled>Previous</button>
            <button class="fantdev-pagination-next" ${data.length <= config.pageSize ? 'disabled' : ''}>Next</button>
          </div>
        </div>
      `;
    }
    
    table.innerHTML = tableHTML;
    container.appendChild(table);
    
    // Add event listeners and functionality
    this.setupDataTableEvents(table, data, config);
    
    return table;
  }

  renderTableRows(data, columns) {
    return data.map(row => `
      <tr>
        ${columns.map(col => `
          <td>${col.render ? col.render(row[col.key], row) : row[col.key] || ''}</td>
        `).join('')}
      </tr>
    `).join('');
  }

  setupDataTableEvents(table, data, config) {
    // Search functionality
    const searchInput = table.querySelector('.fantdev-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = data.filter(row => 
          Object.values(row).some(value => 
            String(value).toLowerCase().includes(searchTerm)
          )
        );
        this.updateTableData(table, filteredData, config);
      });
    }
    
    // Sorting functionality
    if (config.sortable) {
      const sortableHeaders = table.querySelectorAll('.fantdev-sortable');
      sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
          const column = header.dataset.column;
          this.sortTable(table, data, column, config);
        });
      });
    }
    
    // Pagination functionality
    if (config.pagination) {
      const prevBtn = table.querySelector('.fantdev-pagination-prev');
      const nextBtn = table.querySelector('.fantdev-pagination-next');
      
      if (prevBtn && nextBtn) {
        let currentPage = 1;
        
        prevBtn.addEventListener('click', () => {
          if (currentPage > 1) {
            currentPage--;
            this.updatePagination(table, data, currentPage, config);
          }
        });
        
        nextBtn.addEventListener('click', () => {
          const maxPage = Math.ceil(data.length / config.pageSize);
          if (currentPage < maxPage) {
            currentPage++;
            this.updatePagination(table, data, currentPage, config);
          }
        });
      }
    }
  }

  updateTableData(table, data, config) {
    const tbody = table.querySelector('tbody');
    if (tbody) {
      tbody.innerHTML = this.renderTableRows(data, config.columns);
    }
    
    if (config.pagination) {
      this.updatePagination(table, data, 1, config);
    }
  }

  sortTable(table, data, column, config) {
    const sortedData = [...data].sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];
      
      if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal);
      }
      return aVal - bVal;
    });
    
    this.updateTableData(table, sortedData, config);
  }

  updatePagination(table, data, currentPage, config) {
    const start = (currentPage - 1) * config.pageSize + 1;
    const end = Math.min(currentPage * config.pageSize, data.length);
    const total = data.length;
    
    const startSpan = table.querySelector('.fantdev-pagination-start');
    const endSpan = table.querySelector('.fantdev-pagination-end');
    const totalSpan = table.querySelector('.fantdev-pagination-total');
    const prevBtn = table.querySelector('.fantdev-pagination-prev');
    const nextBtn = table.querySelector('.fantdev-pagination-next');
    
    if (startSpan) startSpan.textContent = start;
    if (endSpan) endSpan.textContent = end;
    if (totalSpan) totalSpan.textContent = total;
    
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage >= Math.ceil(total / config.pageSize);
  }
}

// Initialize component library
if (typeof window !== 'undefined') {
  window.FantDevComponents = new ComponentLibrary();
}
