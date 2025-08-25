/**
 * Vanilla JS Table Component
 * Real-time sorting, filtering, and pagination
 */

export class DataTable {
  constructor(config) {
    this.config = {
      cols: [],
      api: '',
      pageSize: 50,
      ...config
    };
    
    this.query = {
      page: 1,
      size: this.config.pageSize,
      sort: null,
      filter: ''
    };
    
    this.data = null;
    this.container = null;
    this.elements = {};
  }

  /**
   * Render the table component
   */
  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'data-table-wrapper';
    wrapper.innerHTML = `
      <div class="table-controls">
        <div class="table-search">
          <input type="text" class="search-input" placeholder="Search..." />
          <button class="search-btn"><i class="fas fa-search"></i></button>
        </div>
        <div class="table-actions">
          <select class="page-size">
            <option value="25">25 rows</option>
            <option value="50" selected>50 rows</option>
            <option value="100">100 rows</option>
            <option value="250">250 rows</option>
          </select>
          <button class="refresh-btn"><i class="fas fa-sync"></i></button>
          <button class="export-btn"><i class="fas fa-download"></i> Export</button>
        </div>
      </div>
      
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              ${this.config.cols.map(col => `
                <th data-key="${col.key}" class="${col.sortable !== false ? 'sortable' : ''}">
                  ${col.label}
                  <span class="sort-icon">
                    <i class="fas fa-sort"></i>
                  </span>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="${this.config.cols.length}" class="loading">Loading...</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="table-footer">
        <div class="table-info">
          Showing <span class="info-start">0</span> to <span class="info-end">0</span> 
          of <span class="info-total">0</span> entries
          <span class="info-filtered"></span>
        </div>
        <div class="table-pagination">
          <button class="page-btn page-first" disabled><i class="fas fa-angle-double-left"></i></button>
          <button class="page-btn page-prev" disabled><i class="fas fa-angle-left"></i></button>
          <span class="page-numbers"></span>
          <button class="page-btn page-next" disabled><i class="fas fa-angle-right"></i></button>
          <button class="page-btn page-last" disabled><i class="fas fa-angle-double-right"></i></button>
        </div>
      </div>
    `;
    
    this.container = wrapper;
    this.cacheElements();
    this.attachEvents();
    this.load();
    
    return wrapper;
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      table: this.container.querySelector('.data-table'),
      tbody: this.container.querySelector('tbody'),
      thead: this.container.querySelector('thead'),
      searchInput: this.container.querySelector('.search-input'),
      searchBtn: this.container.querySelector('.search-btn'),
      refreshBtn: this.container.querySelector('.refresh-btn'),
      exportBtn: this.container.querySelector('.export-btn'),
      pageSizeSelect: this.container.querySelector('.page-size'),
      infoStart: this.container.querySelector('.info-start'),
      infoEnd: this.container.querySelector('.info-end'),
      infoTotal: this.container.querySelector('.info-total'),
      infoFiltered: this.container.querySelector('.info-filtered'),
      pageNumbers: this.container.querySelector('.page-numbers'),
      pageFirst: this.container.querySelector('.page-first'),
      pagePrev: this.container.querySelector('.page-prev'),
      pageNext: this.container.querySelector('.page-next'),
      pageLast: this.container.querySelector('.page-last')
    };
  }

  /**
   * Attach event listeners
   */
  attachEvents() {
    // Sorting
    this.elements.thead.addEventListener('click', (e) => {
      const th = e.target.closest('th');
      if (!th || !th.dataset.key) return;
      
      const col = this.config.cols.find(c => c.key === th.dataset.key);
      if (col && col.sortable !== false) {
        this.sort(th.dataset.key);
      }
    });
    
    // Search
    this.elements.searchBtn.addEventListener('click', () => this.search());
    this.elements.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.search();
    });
    
    // Refresh
    this.elements.refreshBtn.addEventListener('click', () => this.load());
    
    // Export
    this.elements.exportBtn.addEventListener('click', () => this.export());
    
    // Page size
    this.elements.pageSizeSelect.addEventListener('change', (e) => {
      this.query.size = parseInt(e.target.value);
      this.query.page = 1;
      this.load();
    });
    
    // Pagination
    this.elements.pageFirst.addEventListener('click', () => this.goToPage(1));
    this.elements.pagePrev.addEventListener('click', () => this.goToPage(this.query.page - 1));
    this.elements.pageNext.addEventListener('click', () => this.goToPage(this.query.page + 1));
    this.elements.pageLast.addEventListener('click', () => this.goToPage(this.data?.pages || 1));
  }

  /**
   * Load data from API
   */
  async load() {
    try {
      this.setLoading(true);
      
      const params = new URLSearchParams();
      Object.entries(this.query).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params.append(key, value);
        }
      });
      
      const response = await fetch(`${this.config.api}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      this.data = await response.json();
      this.renderData();
      this.updatePagination();
    } catch (error) {
      console.error('Failed to load table data:', error);
      this.showError('Failed to load data');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Render table data
   */
  renderData() {
    if (!this.data || !this.data.rows) {
      this.elements.tbody.innerHTML = `
        <tr>
          <td colspan="${this.config.cols.length}" class="no-data">No data available</td>
        </tr>
      `;
      return;
    }
    
    const rows = this.data.rows.map(row => {
      const cells = this.config.cols.map(col => {
        let value = row[col.key];
        
        // Apply formatter if provided
        if (col.formatter) {
          value = col.formatter(value, row);
        } else {
          // Default formatting
          if (value == null) {
            value = '-';
          } else if (col.type === 'currency') {
            value = this.formatCurrency(value);
          } else if (col.type === 'date') {
            value = this.formatDate(value);
          } else if (col.type === 'status') {
            value = `<span class="status status-${value}">${value}</span>`;
          }
        }
        
        return `<td class="${col.className || ''}">${value}</td>`;
      }).join('');
      
      return `<tr>${cells}</tr>`;
    }).join('');
    
    this.elements.tbody.innerHTML = rows || `
      <tr>
        <td colspan="${this.config.cols.length}" class="no-data">No data available</td>
      </tr>
    `;
  }

  /**
   * Update pagination controls
   */
  updatePagination() {
    if (!this.data) return;
    
    const { page, pages, total, filtered, rows } = this.data;
    const start = total === 0 ? 0 : (page - 1) * this.query.size + 1;
    const end = Math.min(start + rows.length - 1, filtered || total);
    
    // Update info
    this.elements.infoStart.textContent = start;
    this.elements.infoEnd.textContent = end;
    this.elements.infoTotal.textContent = total;
    
    if (filtered != null && filtered < total) {
      this.elements.infoFiltered.textContent = `(filtered from ${total} total entries)`;
    } else {
      this.elements.infoFiltered.textContent = '';
    }
    
    // Update page buttons
    this.elements.pageFirst.disabled = page <= 1;
    this.elements.pagePrev.disabled = page <= 1;
    this.elements.pageNext.disabled = page >= pages;
    this.elements.pageLast.disabled = page >= pages;
    
    // Update page numbers
    this.renderPageNumbers(page, pages);
  }

  /**
   * Render page number buttons
   */
  renderPageNumbers(current, total) {
    if (total <= 1) {
      this.elements.pageNumbers.innerHTML = '';
      return;
    }
    
    const buttons = [];
    const maxButtons = 5;
    let start = Math.max(1, current - Math.floor(maxButtons / 2));
    let end = Math.min(total, start + maxButtons - 1);
    
    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }
    
    for (let i = start; i <= end; i++) {
      const active = i === current ? 'active' : '';
      buttons.push(`
        <button class="page-number ${active}" data-page="${i}">${i}</button>
      `);
    }
    
    this.elements.pageNumbers.innerHTML = buttons.join('');
    
    // Attach click handlers
    this.elements.pageNumbers.querySelectorAll('.page-number').forEach(btn => {
      btn.addEventListener('click', () => {
        this.goToPage(parseInt(btn.dataset.page));
      });
    });
  }

  /**
   * Sort by column
   */
  sort(key) {
    // Toggle sort direction
    if (this.query.sort && this.query.sort.startsWith(key)) {
      this.query.sort = this.query.sort.endsWith(':asc') ? `${key}:desc` : `${key}:asc`;
    } else {
      this.query.sort = `${key}:asc`;
    }
    
    // Update sort icons
    this.updateSortIcons();
    
    // Reset to first page and reload
    this.query.page = 1;
    this.load();
  }

  /**
   * Update sort icons
   */
  updateSortIcons() {
    this.elements.thead.querySelectorAll('th').forEach(th => {
      const icon = th.querySelector('.sort-icon i');
      if (!icon) return;
      
      const key = th.dataset.key;
      if (this.query.sort && this.query.sort.startsWith(key)) {
        if (this.query.sort.endsWith(':asc')) {
          icon.className = 'fas fa-sort-up';
        } else {
          icon.className = 'fas fa-sort-down';
        }
        th.classList.add('sorted');
      } else {
        icon.className = 'fas fa-sort';
        th.classList.remove('sorted');
      }
    });
  }

  /**
   * Search/filter data
   */
  search() {
    this.query.filter = this.elements.searchInput.value.trim();
    this.query.page = 1;
    this.load();
  }

  /**
   * Go to specific page
   */
  goToPage(page) {
    if (page < 1 || page > (this.data?.pages || 1)) return;
    this.query.page = page;
    this.load();
  }

  /**
   * Export data
   */
  async export() {
    try {
      const params = new URLSearchParams(this.query);
      params.set('export', 'csv');
      params.delete('page'); // Export all pages
      params.delete('size');
      
      const response = await fetch(`${this.config.api}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    }
  }

  /**
   * Set loading state
   */
  setLoading(loading) {
    if (loading) {
      this.container.classList.add('loading');
      this.elements.tbody.innerHTML = `
        <tr>
          <td colspan="${this.config.cols.length}" class="loading">
            <i class="fas fa-spinner fa-spin"></i> Loading...
          </td>
        </tr>
      `;
    } else {
      this.container.classList.remove('loading');
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    this.elements.tbody.innerHTML = `
      <tr>
        <td colspan="${this.config.cols.length}" class="error">
          <i class="fas fa-exclamation-triangle"></i> ${message}
        </td>
      </tr>
    `;
  }

  /**
   * Format currency
   */
  formatCurrency(value) {
    if (typeof value !== 'number') return value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  /**
   * Format date
   */
  formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  /**
   * Get auth token from cookie
   */
  getAuthToken() {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('dashboard_session='));
    return cookie ? cookie.split('=')[1] : '';
  }
}

/**
 * Render a simple table (backwards compatibility)
 */
export function renderTable(config) {
  const table = new DataTable(config);
  return table.render();
}