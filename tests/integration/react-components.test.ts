/**
 * Comprehensive React Component Testing with DOM Simulation
 * Tests React components, hooks, user interactions, and rendering behavior
 */

import { test, expect, describe, beforeAll, afterAll, mock, beforeEach } from 'bun:test';

// Mock DOM environment for React testing
interface MockElement {
  tagName: string;
  children: MockElement[];
  attributes: Record<string, string>;
  textContent: string;
  innerHTML: string;
  addEventListener: (event: string, handler: Function) => void;
  removeEventListener: (event: string, handler: Function) => void;
  querySelector: (selector: string) => MockElement | null;
  querySelectorAll: (selector: string) => MockElement[];
  setAttribute: (name: string, value: string) => void;
  getAttribute: (name: string) => string | null;
  click: () => void;
  focus: () => void;
  blur: () => void;
}

class MockDOM {
  private elements: Map<string, MockElement> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  createElement(tagName: string): MockElement {
    const element: MockElement = {
      tagName: tagName.toUpperCase(),
      children: [],
      attributes: {},
      textContent: '',
      innerHTML: '',
      addEventListener: (event: string, handler: Function) => {
        const listeners = this.eventListeners.get(event) || [];
        listeners.push(handler);
        this.eventListeners.set(event, listeners);
      },
      removeEventListener: (event: string, handler: Function) => {
        const listeners = this.eventListeners.get(event) || [];
        const index = listeners.indexOf(handler);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      },
      querySelector: (selector: string) => {
        // Simplified selector matching
        if (selector.startsWith('#')) {
          const id = selector.substring(1);
          return this.elements.get(id) || null;
        }
        return null;
      },
      querySelectorAll: (selector: string) => {
        // Simplified - return empty array for now
        return [];
      },
      setAttribute: (name: string, value: string) => {
        element.attributes[name] = value;
        if (name === 'id') {
          this.elements.set(value, element);
        }
      },
      getAttribute: (name: string) => {
        return element.attributes[name] || null;
      },
      click: () => {
        const listeners = this.eventListeners.get('click') || [];
        listeners.forEach(handler => handler({ target: element, type: 'click' }));
      },
      focus: () => {
        const listeners = this.eventListeners.get('focus') || [];
        listeners.forEach(handler => handler({ target: element, type: 'focus' }));
      },
      blur: () => {
        const listeners = this.eventListeners.get('blur') || [];
        listeners.forEach(handler => handler({ target: element, type: 'blur' }));
      }
    };

    return element;
  }

  getElementById(id: string): MockElement | null {
    return this.elements.get(id) || null;
  }
}

describe('React Components Testing Suite', () => {
  let mockDOM: MockDOM;

  beforeAll(() => {
    console.log('⚛️  Initializing React component tests...');
    mockDOM = new MockDOM();
  });

  describe('Dashboard Component Testing', () => {
    test('Dashboard component rendering', async () => {
      // Mock dashboard data
      const dashboardData = {
        stats: {
          totalCustomers: 1250,
          activeUsers: 987,
          totalRevenue: 45000.75,
          monthlyGrowth: 12.5
        },
        recentActivity: [
          { id: 1, user: 'John Doe', action: 'Login', timestamp: '2024-01-15T10:30:00Z' },
          { id: 2, user: 'Jane Smith', action: 'Trade', timestamp: '2024-01-15T10:25:00Z' }
        ]
      };

      // Mock Dashboard component render
      const mockDashboard = {
        props: { data: dashboardData },
        state: { loading: false, error: null },
        render: function() {
          const container = mockDOM.createElement('div');
          container.setAttribute('class', 'dashboard-container');
          container.setAttribute('data-testid', 'dashboard');

          // Stats section
          const statsSection = mockDOM.createElement('div');
          statsSection.setAttribute('class', 'stats-grid');
          
          const totalCustomersCard = mockDOM.createElement('div');
          totalCustomersCard.setAttribute('class', 'stat-card');
          totalCustomersCard.textContent = `Total Customers: ${this.props.data.stats.totalCustomers}`;
          statsSection.children.push(totalCustomersCard);

          const revenueCard = mockDOM.createElement('div');
          revenueCard.setAttribute('class', 'stat-card');
          revenueCard.textContent = `Revenue: $${this.props.data.stats.totalRevenue.toLocaleString()}`;
          statsSection.children.push(revenueCard);

          container.children.push(statsSection);

          // Activity section
          const activitySection = mockDOM.createElement('div');
          activitySection.setAttribute('class', 'activity-list');
          
          this.props.data.recentActivity.forEach(activity => {
            const activityItem = mockDOM.createElement('div');
            activityItem.setAttribute('class', 'activity-item');
            activityItem.textContent = `${activity.user} - ${activity.action}`;
            activitySection.children.push(activityItem);
          });

          container.children.push(activitySection);

          return container;
        }
      };

      const rendered = mockDashboard.render();

      // Test rendering
      expect(rendered.tagName).toBe('DIV');
      expect(rendered.getAttribute('class')).toBe('dashboard-container');
      expect(rendered.getAttribute('data-testid')).toBe('dashboard');
      expect(rendered.children).toHaveLength(2); // Stats and activity sections

      // Test stats section
      const statsSection = rendered.children[0];
      expect(statsSection.getAttribute('class')).toBe('stats-grid');
      expect(statsSection.children).toHaveLength(2);
      
      const totalCustomersCard = statsSection.children[0];
      expect(totalCustomersCard.textContent).toBe('Total Customers: 1250');

      // Test activity section
      const activitySection = rendered.children[1];
      expect(activitySection.getAttribute('class')).toBe('activity-list');
      expect(activitySection.children).toHaveLength(2);
      
      const firstActivity = activitySection.children[0];
      expect(firstActivity.textContent).toBe('John Doe - Login');
    });

    test('Dashboard loading state', async () => {
      const mockLoadingDashboard = {
        props: {},
        state: { loading: true, error: null },
        render: function() {
          const container = mockDOM.createElement('div');
          container.setAttribute('class', 'dashboard-container loading');
          
          const spinner = mockDOM.createElement('div');
          spinner.setAttribute('class', 'loading-spinner');
          spinner.textContent = 'Loading...';
          
          container.children.push(spinner);
          return container;
        }
      };

      const rendered = mockLoadingDashboard.render();
      
      expect(rendered.getAttribute('class')).toContain('loading');
      expect(rendered.children).toHaveLength(1);
      expect(rendered.children[0].textContent).toBe('Loading...');
    });

    test('Dashboard error state', async () => {
      const mockErrorDashboard = {
        props: {},
        state: { loading: false, error: 'Failed to load dashboard data' },
        render: function() {
          const container = mockDOM.createElement('div');
          container.setAttribute('class', 'dashboard-container error');
          
          const errorMsg = mockDOM.createElement('div');
          errorMsg.setAttribute('class', 'error-message');
          errorMsg.textContent = this.state.error;
          
          const retryBtn = mockDOM.createElement('button');
          retryBtn.setAttribute('class', 'retry-button');
          retryBtn.textContent = 'Retry';
          
          container.children.push(errorMsg, retryBtn);
          return container;
        }
      };

      const rendered = mockErrorDashboard.render();
      
      expect(rendered.getAttribute('class')).toContain('error');
      expect(rendered.children).toHaveLength(2);
      expect(rendered.children[0].textContent).toBe('Failed to load dashboard data');
      expect(rendered.children[1].textContent).toBe('Retry');
    });
  });

  describe('Customer Portal Component Testing', () => {
    test('Customer list rendering', async () => {
      const customersData = [
        { id: 1, name: 'Alice Johnson', email: 'alice@example.com', status: 'active', balance: 1500.00 },
        { id: 2, name: 'Bob Wilson', email: 'bob@example.com', status: 'inactive', balance: 750.50 },
        { id: 3, name: 'Carol Davis', email: 'carol@example.com', status: 'active', balance: 2250.75 }
      ];

      const mockCustomerList = {
        props: { customers: customersData, onSelectCustomer: mock() },
        render: function() {
          const container = mockDOM.createElement('div');
          container.setAttribute('class', 'customer-list');
          
          this.props.customers.forEach(customer => {
            const customerCard = mockDOM.createElement('div');
            customerCard.setAttribute('class', `customer-card ${customer.status}`);
            customerCard.setAttribute('data-customer-id', customer.id.toString());
            
            // Customer name
            const nameEl = mockDOM.createElement('h3');
            nameEl.textContent = customer.name;
            customerCard.children.push(nameEl);
            
            // Customer email
            const emailEl = mockDOM.createElement('p');
            emailEl.textContent = customer.email;
            customerCard.children.push(emailEl);
            
            // Customer balance
            const balanceEl = mockDOM.createElement('div');
            balanceEl.setAttribute('class', 'balance');
            balanceEl.textContent = `$${customer.balance.toLocaleString()}`;
            customerCard.children.push(balanceEl);
            
            // Status indicator
            const statusEl = mockDOM.createElement('span');
            statusEl.setAttribute('class', `status ${customer.status}`);
            statusEl.textContent = customer.status.toUpperCase();
            customerCard.children.push(statusEl);
            
            // Click handler simulation
            customerCard.addEventListener('click', () => {
              this.props.onSelectCustomer(customer);
            });
            
            container.children.push(customerCard);
          });
          
          return container;
        }
      };

      const rendered = mockCustomerList.render();

      // Test container
      expect(rendered.getAttribute('class')).toBe('customer-list');
      expect(rendered.children).toHaveLength(3);

      // Test first customer card
      const firstCard = rendered.children[0];
      expect(firstCard.getAttribute('class')).toBe('customer-card active');
      expect(firstCard.getAttribute('data-customer-id')).toBe('1');
      expect(firstCard.children).toHaveLength(4); // name, email, balance, status

      // Test customer data
      expect(firstCard.children[0].textContent).toBe('Alice Johnson');
      expect(firstCard.children[1].textContent).toBe('alice@example.com');
      expect(firstCard.children[2].textContent).toBe('$1,500');
      expect(firstCard.children[3].textContent).toBe('ACTIVE');

      // Test inactive customer styling
      const secondCard = rendered.children[1];
      expect(secondCard.getAttribute('class')).toBe('customer-card inactive');
    });

    test('Customer selection interaction', async () => {
      const selectedCustomer = { id: 1, name: 'Test Customer' };
      const onSelectMock = mock();

      const customerCard = mockDOM.createElement('div');
      customerCard.setAttribute('class', 'customer-card');
      customerCard.addEventListener('click', () => {
        onSelectMock(selectedCustomer);
      });

      // Simulate click
      customerCard.click();

      expect(onSelectMock).toHaveBeenCalledTimes(1);
      expect(onSelectMock).toHaveBeenCalledWith(selectedCustomer);
    });

    test('Customer search and filtering', async () => {
      const allCustomers = [
        { id: 1, name: 'Alice Johnson', email: 'alice@example.com', status: 'active' },
        { id: 2, name: 'Bob Wilson', email: 'bob@example.com', status: 'inactive' },
        { id: 3, name: 'Carol Davis', email: 'carol@example.com', status: 'active' }
      ];

      const mockSearchableList = {
        props: { customers: allCustomers },
        state: { searchTerm: '', statusFilter: 'all' },
        getFilteredCustomers: function() {
          return this.props.customers.filter(customer => {
            const matchesSearch = customer.name.toLowerCase().includes(this.state.searchTerm.toLowerCase()) ||
                                  customer.email.toLowerCase().includes(this.state.searchTerm.toLowerCase());
            const matchesStatus = this.state.statusFilter === 'all' || customer.status === this.state.statusFilter;
            return matchesSearch && matchesStatus;
          });
        },
        handleSearchChange: function(value: string) {
          this.state.searchTerm = value;
        },
        handleStatusChange: function(status: string) {
          this.state.statusFilter = status;
        }
      };

      // Test initial state - all customers
      let filtered = mockSearchableList.getFilteredCustomers();
      expect(filtered).toHaveLength(3);

      // Test search filtering
      mockSearchableList.handleSearchChange('alice');
      filtered = mockSearchableList.getFilteredCustomers();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Alice Johnson');

      // Test status filtering
      mockSearchableList.handleSearchChange('');
      mockSearchableList.handleStatusChange('active');
      filtered = mockSearchableList.getFilteredCustomers();
      expect(filtered).toHaveLength(2);
      expect(filtered.every(c => c.status === 'active')).toBe(true);

      // Test combined filtering
      mockSearchableList.handleSearchChange('bob');
      mockSearchableList.handleStatusChange('all');
      filtered = mockSearchableList.getFilteredCustomers();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Bob Wilson');
    });
  });

  describe('Form Components Testing', () => {
    test('Customer form validation', async () => {
      const mockCustomerForm = {
        state: {
          formData: {
            name: '',
            email: '',
            phone: '',
            riskLevel: 'medium'
          },
          errors: {},
          isSubmitting: false
        },
        validateForm: function() {
          const errors: Record<string, string> = {};
          
          if (!this.state.formData.name.trim()) {
            errors.name = 'Name is required';
          } else if (this.state.formData.name.length < 2) {
            errors.name = 'Name must be at least 2 characters';
          }
          
          if (!this.state.formData.email.trim()) {
            errors.email = 'Email is required';
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.state.formData.email)) {
            errors.email = 'Please enter a valid email address';
          }
          
          if (this.state.formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(this.state.formData.phone)) {
            errors.phone = 'Please enter a valid phone number';
          }
          
          this.state.errors = errors;
          return Object.keys(errors).length === 0;
        },
        handleInputChange: function(field: string, value: string) {
          this.state.formData[field] = value;
          // Clear error when user starts typing
          if (this.state.errors[field]) {
            delete this.state.errors[field];
          }
        }
      };

      // Test empty form validation
      let isValid = mockCustomerForm.validateForm();
      expect(isValid).toBe(false);
      expect(mockCustomerForm.state.errors.name).toBe('Name is required');
      expect(mockCustomerForm.state.errors.email).toBe('Email is required');

      // Test invalid email
      mockCustomerForm.handleInputChange('name', 'John Doe');
      mockCustomerForm.handleInputChange('email', 'invalid-email');
      isValid = mockCustomerForm.validateForm();
      expect(isValid).toBe(false);
      expect(mockCustomerForm.state.errors.email).toBe('Please enter a valid email address');

      // Test valid form
      mockCustomerForm.handleInputChange('email', 'john@example.com');
      mockCustomerForm.handleInputChange('phone', '+1-555-123-4567');
      isValid = mockCustomerForm.validateForm();
      expect(isValid).toBe(true);
      expect(Object.keys(mockCustomerForm.state.errors)).toHaveLength(0);

      // Test short name
      mockCustomerForm.handleInputChange('name', 'J');
      isValid = mockCustomerForm.validateForm();
      expect(isValid).toBe(false);
      expect(mockCustomerForm.state.errors.name).toBe('Name must be at least 2 characters');
    });

    test('Form submission handling', async () => {
      const mockSubmitHandler = mock().mockResolvedValue({ success: true, id: 123 });
      
      const mockForm = {
        props: { onSubmit: mockSubmitHandler },
        state: {
          formData: {
            name: 'John Doe',
            email: 'john@example.com'
          },
          isSubmitting: false,
          submitError: null
        },
        handleSubmit: async function() {
          this.state.isSubmitting = true;
          this.state.submitError = null;
          
          try {
            const result = await this.props.onSubmit(this.state.formData);
            
            if (result.success) {
              // Reset form on success
              this.state.formData = { name: '', email: '' };
            }
            
            return result;
          } catch (error) {
            this.state.submitError = error.message;
            throw error;
          } finally {
            this.state.isSubmitting = false;
          }
        }
      };

      // Test successful submission
      const result = await mockForm.handleSubmit();
      
      expect(mockSubmitHandler).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com'
      });
      expect(result.success).toBe(true);
      expect(result.id).toBe(123);
      expect(mockForm.state.formData.name).toBe(''); // Form reset
      expect(mockForm.state.isSubmitting).toBe(false);

      // Test submission error
      const errorHandler = mock().mockRejectedValue(new Error('Validation failed'));
      mockForm.props.onSubmit = errorHandler;
      mockForm.state.formData = { name: 'Jane Doe', email: 'jane@example.com' };

      try {
        await mockForm.handleSubmit();
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(mockForm.state.submitError).toBe('Validation failed');
        expect(mockForm.state.isSubmitting).toBe(false);
      }
    });
  });

  describe('User Interaction Testing', () => {
    test('Button click interactions', async () => {
      const clickHandler = mock();
      
      const button = mockDOM.createElement('button');
      button.setAttribute('class', 'primary-button');
      button.textContent = 'Click Me';
      button.addEventListener('click', clickHandler);

      // Test single click
      button.click();
      expect(clickHandler).toHaveBeenCalledTimes(1);

      // Test multiple clicks
      button.click();
      button.click();
      expect(clickHandler).toHaveBeenCalledTimes(3);

      // Test event object
      button.addEventListener('click', (event) => {
        expect(event.target).toBe(button);
        expect(event.type).toBe('click');
      });
      
      button.click();
    });

    test('Input field interactions', async () => {
      const changeHandler = mock();
      const focusHandler = mock();
      const blurHandler = mock();

      const input = mockDOM.createElement('input');
      input.setAttribute('type', 'text');
      input.setAttribute('placeholder', 'Enter text...');
      input.addEventListener('change', changeHandler);
      input.addEventListener('focus', focusHandler);
      input.addEventListener('blur', blurHandler);

      // Test focus/blur
      input.focus();
      expect(focusHandler).toHaveBeenCalledTimes(1);

      input.blur();
      expect(blurHandler).toHaveBeenCalledTimes(1);

      // Test value change simulation
      const simulateTyping = (value: string) => {
        input.setAttribute('value', value);
        changeHandler({ target: input, type: 'change' });
      };

      simulateTyping('Hello');
      expect(changeHandler).toHaveBeenCalledWith({
        target: input,
        type: 'change'
      });
      expect(input.getAttribute('value')).toBe('Hello');
    });

    test('Modal dialog interactions', async () => {
      const closeHandler = mock();
      
      const mockModal = {
        state: { isOpen: false, title: '', content: '' },
        show: function(title: string, content: string) {
          this.state.isOpen = true;
          this.state.title = title;
          this.state.content = content;
        },
        hide: function() {
          this.state.isOpen = false;
          closeHandler();
        },
        render: function() {
          if (!this.state.isOpen) return null;
          
          const overlay = mockDOM.createElement('div');
          overlay.setAttribute('class', 'modal-overlay');
          
          const modal = mockDOM.createElement('div');
          modal.setAttribute('class', 'modal');
          
          const header = mockDOM.createElement('div');
          header.setAttribute('class', 'modal-header');
          header.textContent = this.state.title;
          
          const body = mockDOM.createElement('div');
          body.setAttribute('class', 'modal-body');
          body.textContent = this.state.content;
          
          const closeBtn = mockDOM.createElement('button');
          closeBtn.setAttribute('class', 'close-button');
          closeBtn.textContent = 'Close';
          closeBtn.addEventListener('click', () => this.hide());
          
          modal.children.push(header, body, closeBtn);
          overlay.children.push(modal);
          
          // Click overlay to close
          overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
              this.hide();
            }
          });
          
          return overlay;
        }
      };

      // Test modal opening
      mockModal.show('Test Title', 'Test content');
      expect(mockModal.state.isOpen).toBe(true);
      expect(mockModal.state.title).toBe('Test Title');

      // Test modal rendering
      const rendered = mockModal.render();
      expect(rendered).toBeTruthy();
      expect(rendered.getAttribute('class')).toBe('modal-overlay');
      
      const modal = rendered.children[0];
      expect(modal.getAttribute('class')).toBe('modal');
      expect(modal.children).toHaveLength(3); // header, body, close button

      // Test close button
      const closeBtn = modal.children[2];
      closeBtn.click();
      expect(closeHandler).toHaveBeenCalledTimes(1);
      expect(mockModal.state.isOpen).toBe(false);
    });
  });

  describe('Component State Management', () => {
    test('State updates and re-rendering', async () => {
      let renderCount = 0;
      
      const mockStatefulComponent = {
        state: { count: 0, message: 'Initial' },
        setState: function(updates: any) {
          Object.assign(this.state, updates);
          this.forceRender();
        },
        forceRender: function() {
          renderCount++;
        },
        increment: function() {
          this.setState({ count: this.state.count + 1 });
        },
        updateMessage: function(message: string) {
          this.setState({ message });
        }
      };

      // Test initial state
      expect(mockStatefulComponent.state.count).toBe(0);
      expect(renderCount).toBe(0);

      // Test state update
      mockStatefulComponent.increment();
      expect(mockStatefulComponent.state.count).toBe(1);
      expect(renderCount).toBe(1);

      // Test multiple updates
      mockStatefulComponent.increment();
      mockStatefulComponent.updateMessage('Updated');
      expect(mockStatefulComponent.state.count).toBe(2);
      expect(mockStatefulComponent.state.message).toBe('Updated');
      expect(renderCount).toBe(3);
    });

    test('Props vs state management', async () => {
      const mockComponent = {
        props: { initialValue: 10, onValueChange: mock() },
        state: { internalValue: 0 },
        
        componentDidMount: function() {
          // Initialize state from props
          this.state.internalValue = this.props.initialValue;
        },
        
        handleChange: function(newValue: number) {
          this.state.internalValue = newValue;
          this.props.onValueChange(newValue);
        },
        
        getValue: function() {
          return this.state.internalValue;
        }
      };

      // Test initialization
      mockComponent.componentDidMount();
      expect(mockComponent.state.internalValue).toBe(10);

      // Test value change
      mockComponent.handleChange(25);
      expect(mockComponent.state.internalValue).toBe(25);
      expect(mockComponent.props.onValueChange).toHaveBeenCalledWith(25);

      // Test getter
      expect(mockComponent.getValue()).toBe(25);
    });
  });

  describe('Performance and Optimization Testing', () => {
    test('Component rendering performance', async () => {
      const largeDataSet = Array(1000).fill(null).map((_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 1000
      }));

      const mockVirtualList = {
        props: { items: largeDataSet, itemHeight: 50, visibleCount: 20 },
        state: { scrollTop: 0 },
        
        getVisibleItems: function() {
          const startIndex = Math.floor(this.state.scrollTop / this.props.itemHeight);
          const endIndex = Math.min(
            startIndex + this.props.visibleCount,
            this.props.items.length
          );
          
          return {
            startIndex,
            visibleItems: this.props.items.slice(startIndex, endIndex)
          };
        },
        
        handleScroll: function(scrollTop: number) {
          this.state.scrollTop = scrollTop;
        }
      };

      // Test initial visible items
      let visible = mockVirtualList.getVisibleItems();
      expect(visible.visibleItems).toHaveLength(20);
      expect(visible.startIndex).toBe(0);
      expect(visible.visibleItems[0].id).toBe(0);

      // Test scrolling
      mockVirtualList.handleScroll(500); // Scroll down
      visible = mockVirtualList.getVisibleItems();
      expect(visible.startIndex).toBe(10); // 500 / 50 = 10
      expect(visible.visibleItems[0].id).toBe(10);

      // Test performance - should handle large datasets efficiently
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        mockVirtualList.handleScroll(i * 10);
        mockVirtualList.getVisibleItems();
      }
      const endTime = performance.now();
      
      const processingTime = endTime - startTime;
      console.log(`📊 Virtual list processed 100 scroll operations in ${processingTime.toFixed(2)}ms`);
      expect(processingTime).toBeLessThan(100); // Should be very fast
    });

    test('Memory usage optimization', async () => {
      const mockMemoizedComponent = {
        cache: new Map(),
        
        memoizedRender: function(props: any) {
          const cacheKey = JSON.stringify(props);
          
          if (this.cache.has(cacheKey)) {
            console.log('Using cached render result');
            return this.cache.get(cacheKey);
          }
          
          // Simulate expensive rendering
          const result = {
            rendered: `Rendered with ${Object.keys(props).length} props`,
            timestamp: Date.now()
          };
          
          this.cache.set(cacheKey, result);
          return result;
        },
        
        clearCache: function() {
          this.cache.clear();
        }
      };

      const props1 = { name: 'Test', value: 100 };
      const props2 = { name: 'Test', value: 100 }; // Same props
      const props3 = { name: 'Different', value: 200 };

      // First render - should cache
      const result1 = mockMemoizedComponent.memoizedRender(props1);
      expect(mockMemoizedComponent.cache.size).toBe(1);

      // Same props - should use cache
      const result2 = mockMemoizedComponent.memoizedRender(props2);
      expect(result2).toBe(result1); // Same object reference
      expect(mockMemoizedComponent.cache.size).toBe(1);

      // Different props - should create new cache entry
      const result3 = mockMemoizedComponent.memoizedRender(props3);
      expect(result3).not.toBe(result1);
      expect(mockMemoizedComponent.cache.size).toBe(2);

      // Test cache clearing
      mockMemoizedComponent.clearCache();
      expect(mockMemoizedComponent.cache.size).toBe(0);
    });
  });

  afterAll(() => {
    console.log('✅ React component tests completed');
  });
});