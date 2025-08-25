/**
 * FantDev Trading - Icon Helper Utility
 * Easy SVG icon usage from sprite sheet
 */

class IconHelper {
  constructor() {
    this.iconCache = new Map();
    this.init();
  }

  init() {
    // Load icon sprite if not already loaded
    if (!document.querySelector('#fantdev-icon-sprite')) {
      this.loadIconSprite();
    }
  }

  loadIconSprite() {
    fetch('/static/icons/icons.svg')
      .then(response => response.text())
      .then(svgContent => {
        const div = document.createElement('div');
        div.id = 'fantdev-icon-sprite';
        div.style.display = 'none';
        div.innerHTML = svgContent;
        document.body.appendChild(div);
      })
      .catch(error => {
        console.warn('Could not load icon sprite:', error);
      });
  }

  /**
   * Create an icon element
   * @param {string} iconName - Name of the icon (e.g., 'home', 'settings')
   * @param {Object} options - Icon options
   * @returns {HTMLElement} SVG icon element
   */
  createIcon(iconName, options = {}) {
    const {
      size = 24,
      color = 'currentColor',
      className = '',
      title = '',
      onClick = null,
      ...otherAttributes
    } = options;

    // Check if icon exists in sprite
    const iconId = `icon-${iconName}`;
    const iconElement = document.querySelector(`#${iconId}`);
    
    if (!iconElement) {
      console.warn(`Icon '${iconName}' not found in sprite`);
      return this.createFallbackIcon(iconName, size);
    }

    // Clone the icon
    const icon = iconElement.cloneNode(true);
    icon.removeAttribute('id');
    
    // Set attributes
    icon.setAttribute('width', size);
    icon.setAttribute('height', size);
    icon.setAttribute('fill', color);
    
    if (className) {
      icon.classList.add(...className.split(' '));
    }
    
    if (title) {
      icon.setAttribute('title', title);
    }

    // Add click handler if provided
    if (onClick) {
      icon.style.cursor = 'pointer';
      icon.addEventListener('click', onClick);
    }

    // Add other attributes
    Object.entries(otherAttributes).forEach(([key, value]) => {
      icon.setAttribute(key, value);
    });

    return icon;
  }

  /**
   * Create a fallback icon when the requested icon is not found
   * @param {string} iconName - Name of the icon
   * @param {number} size - Size of the icon
   * @returns {HTMLElement} Fallback icon element
   */
  createFallbackIcon(iconName, size) {
    const fallback = document.createElement('div');
    fallback.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${Math.max(8, size * 0.3)}px;
      color: #999;
      font-family: monospace;
    `;
    fallback.textContent = iconName.substring(0, 2).toUpperCase();
    fallback.title = `Icon '${iconName}' not found`;
    return fallback;
  }

  /**
   * Create an icon button
   * @param {string} iconName - Name of the icon
   * @param {Object} options - Button options
   * @returns {HTMLButtonElement} Button element with icon
   */
  createIconButton(iconName, options = {}) {
    const {
      size = 24,
      color = 'currentColor',
      className = '',
      title = '',
      onClick = null,
      disabled = false,
      type = 'button',
      ...otherAttributes
    } = options;

    const button = document.createElement('button');
    button.type = type;
    button.disabled = disabled;
    
    if (className) {
      button.classList.add(...className.split(' '));
    }
    
    if (title) {
      button.title = title;
    }

    if (onClick) {
      button.addEventListener('click', onClick);
    }

    // Add other attributes
    Object.entries(otherAttributes).forEach(([key, value]) => {
      button.setAttribute(key, value);
    });

    const icon = this.createIcon(iconName, { size, color });
    button.appendChild(icon);

    return button;
  }

  /**
   * Create an icon link
   * @param {string} iconName - Name of the icon
   * @param {string} href - Link URL
   * @param {Object} options - Link options
   * @returns {HTMLAnchorElement} Link element with icon
   */
  createIconLink(iconName, href, options = {}) {
    const {
      size = 24,
      color = 'currentColor',
      className = '',
      title = '',
      target = '_self',
      ...otherAttributes
    } = options;

    const link = document.createElement('a');
    link.href = href;
    link.target = target;
    
    if (className) {
      link.classList.add(...className.split(' '));
    }
    
    if (title) {
      link.title = title;
    }

    // Add other attributes
    Object.entries(otherAttributes).forEach(([key, value]) => {
      link.setAttribute(key, value);
    });

    const icon = this.createIcon(iconName, { size, color });
    link.appendChild(icon);

    return link;
  }

  /**
   * Replace text content with an icon
   * @param {HTMLElement} element - Element to replace
   * @param {string} iconName - Name of the icon
   * @param {Object} options - Icon options
   */
  replaceWithIcon(element, iconName, options = {}) {
    const icon = this.createIcon(iconName, options);
    element.innerHTML = '';
    element.appendChild(icon);
  }

  /**
   * Add icon to existing element
   * @param {HTMLElement} element - Element to add icon to
   * @param {string} iconName - Name of the icon
   * @param {Object} options - Icon options
   * @param {string} position - Position to add icon ('before', 'after', 'prepend', 'append')
   */
  addIconTo(element, iconName, options = {}, position = 'prepend') {
    const icon = this.createIcon(iconName, options);
    
    switch (position) {
      case 'before':
        element.parentNode.insertBefore(icon, element);
        break;
      case 'after':
        element.parentNode.insertBefore(icon, element.nextSibling);
        break;
      case 'prepend':
        element.insertBefore(icon, element.firstChild);
        break;
      case 'append':
        element.appendChild(icon);
        break;
      default:
        element.appendChild(icon);
    }
  }

  /**
   * Create a loading spinner icon
   * @param {Object} options - Spinner options
   * @returns {HTMLElement} Spinning icon element
   */
  createSpinner(options = {}) {
    const {
      size = 24,
      color = 'currentColor',
      className = 'fantdev-spinner',
      ...otherAttributes
    } = options;

    const spinner = this.createIcon('spinner', {
      size,
      color,
      className: `${className} animate-spin`,
      ...otherAttributes
    });

    return spinner;
  }

  /**
   * Create an icon with badge
   * @param {string} iconName - Name of the icon
   * @param {string|number} badgeText - Badge text
   * @param {Object} options - Options for both icon and badge
   * @returns {HTMLElement} Container with icon and badge
   */
  createIconWithBadge(iconName, badgeText, options = {}) {
    const {
      size = 24,
      color = 'currentColor',
      badgeColor = '#ef4444',
      badgeTextColor = '#ffffff',
      badgeSize = 'small',
      ...otherAttributes
    } = options;

    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      display: inline-block;
    `;

    const icon = this.createIcon(iconName, { size, color, ...otherAttributes });
    container.appendChild(icon);

    const badge = document.createElement('span');
    badge.textContent = badgeText;
    badge.style.cssText = `
      position: absolute;
      top: -8px;
      right: -8px;
      background: ${badgeColor};
      color: ${badgeTextColor};
      border-radius: 50%;
      min-width: ${badgeSize === 'small' ? '16px' : '20px'};
      height: ${badgeSize === 'small' ? '16px' : '20px'};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${badgeSize === 'small' ? '10px' : '12px'};
      font-weight: bold;
      line-height: 1;
    `;

    container.appendChild(badge);
    return container;
  }

  /**
   * Get list of available icons
   * @returns {Array} Array of icon names
   */
  getAvailableIcons() {
    const icons = [];
    document.querySelectorAll('#fantdev-icon-sprite symbol').forEach(symbol => {
      const id = symbol.getAttribute('id');
      if (id && id.startsWith('icon-')) {
        icons.push(id.substring(5)); // Remove 'icon-' prefix
      }
    });
    return icons;
  }

  /**
   * Check if icon exists
   * @param {string} iconName - Name of the icon
   * @returns {boolean} True if icon exists
   */
  iconExists(iconName) {
    return document.querySelector(`#icon-${iconName}`) !== null;
  }

  /**
   * Create icon with custom styling
   * @param {string} iconName - Name of the icon
   * @param {Object} options - Icon options
   * @returns {HTMLElement} Styled icon element
   */
  createStyledIcon(iconName, options = {}) {
    const {
      size = 24,
      color = 'currentColor',
      className = '',
      style = {},
      ...otherAttributes
    } = options;

    const icon = this.createIcon(iconName, {
      size,
      color,
      className,
      ...otherAttributes
    });

    // Apply custom styles
    Object.assign(icon.style, style);

    return icon;
  }
}

// Initialize icon helper
if (typeof window !== 'undefined') {
  window.IconHelper = new IconHelper();
  
  // Add global convenience functions
  window.createIcon = (name, options) => window.IconHelper.createIcon(name, options);
  window.createIconButton = (name, options) => window.IconHelper.createIconButton(name, options);
  window.createIconLink = (name, href, options) => window.IconHelper.createIconLink(name, href, options);
  window.createSpinner = (options) => window.IconHelper.createSpinner(options);
}
