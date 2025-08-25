# Static Assets Directory

This directory contains static frontend assets for the Fantdev Trading Bot admin portals and web interfaces.

## 📂 Directory Structure

```
static/
├── css/
│   └── fantdev-components.css    # Unified component styles with theme support
├── js/
│   └── fantdev-core.js          # Core JavaScript functionality
└── README.md                    # This documentation
```

## 🎨 CSS Components (`/css`)

### `fantdev-components.css`
**Purpose**: Unified component system with complete light/dark theme support

**Features**:
- ✅ Complete CSS custom properties (CSS variables) system
- ✅ Light and dark theme variants
- ✅ Responsive design utilities
- ✅ Pre-built UI components (buttons, cards, forms, etc.)
- ✅ Animation and transition utilities
- ✅ Trading-specific styling (balance displays, status indicators)

**Key Sections**:
- **Theme Variables**: Root-level CSS custom properties for colors, spacing, typography
- **Component Styles**: Reusable components (buttons, cards, tables, etc.)
- **Layout Utilities**: Flexbox, grid, spacing utilities
- **Theme Support**: Dark mode overrides with `[data-theme="dark"]` selectors

**Usage in HTML**:
```html
<link rel="stylesheet" href="/static/css/fantdev-components.css">
<div class="card">
  <div class="card-header">Dashboard</div>
  <div class="card-body">Content here</div>
</div>
```

## ⚙️ JavaScript Core (`/js`)

### `fantdev-core.js`
**Purpose**: Core JavaScript functionality shared across all portal pages

**Classes & Features**:

#### `FantDevApp` (Main Application Class)
- **Theme Management**: Automatic light/dark theme switching with localStorage persistence
- **Notification System**: Toast notifications and panel management
- **Event Handling**: Centralized event listeners for UI interactions
- **Chart Integration**: Theme-aware chart updates (compatible with Chart.js/Recharts)
- **User Interface**: Dropdown menus, panels, and interactive elements

**Key Methods**:
```javascript
// Initialize the app
const app = new FantDevApp();

// Theme management
app.toggleTheme();                    // Switch between light/dark themes
app.setupTheme();                     // Apply saved theme from localStorage

// Notifications
app.showToast(message, type);         // Show toast notification
app.loadNotifications();              // Load notification panel

// UI State
app.toggleUserDropdown();             // Toggle user dropdown menu
app.toggleNotificationPanel();        // Toggle notification panel
```

**Event System**:
- Custom events for theme changes: `themeChanged`
- Keyboard shortcuts support
- Responsive UI state management

## 🔗 Integration with Main Application

### Portal Pages
These static assets are used by:
- **Admin Portal** (`/public/portals/admin-portal.html`)
- **Customer Portal** (`/public/portals/customer-portal.html`)
- **Dashboard** (`/public/portals/dashboard.html`)

### Server Integration
The static assets are served by:
- **Admin Server** (`src/admin-server.ts`) - Main production server
- **Development Server** (`src/dev-server.ts`) - Development environment

### Usage Pattern
```html
<!DOCTYPE html>
<html>
<head>
    <!-- Theme-aware CSS -->
    <link rel="stylesheet" href="/static/css/fantdev-components.css">
</head>
<body>
    <!-- Page content using component classes -->
    <div class="app-container">
        <nav class="navbar">...</nav>
        <main class="main-content">...</main>
    </div>
    
    <!-- Core JavaScript functionality -->
    <script src="/static/js/fantdev-core.js"></script>
    <script>
        // Initialize the app
        window.fantdevApp = new FantDevApp();
    </script>
</body>
</html>
```

## 📱 Responsive Design

The CSS framework includes:
- **Mobile-first approach** with progressive enhancement
- **Breakpoint system**: `sm` (640px+), `md` (768px+), `lg` (1024px+), `xl` (1280px+)
- **Flexible grid system** using CSS Grid and Flexbox
- **Touch-friendly interfaces** for mobile devices

## 🌙 Theme System

### Light Theme (Default)
- Primary colors: Blue palette (#2563eb)
- Background: Clean whites and light grays
- Text: Dark grays for readability

### Dark Theme
- Primary colors: Adapted blue palette for dark backgrounds
- Background: Deep grays and blacks
- Text: Light colors for contrast
- Automatic switching preserves user preference

### Theme Implementation
```css
:root {
  --primary: #2563eb;        /* Light theme */
}

[data-theme="dark"] {
  --primary: #60a5fa;        /* Dark theme override */
}
```

## 🔧 Development Guidelines

### Adding New Components
1. Add component styles to `fantdev-components.css`
2. Include both light and dark theme variants
3. Use CSS custom properties for consistency
4. Test responsive behavior across breakpoints

### JavaScript Extensions
1. Extend `FantDevApp` class for new functionality
2. Use event-driven architecture for loose coupling
3. Maintain localStorage persistence for user preferences
4. Follow existing naming conventions

## 📊 Performance Considerations

- **CSS**: Optimized selectors, minimal specificity conflicts
- **JavaScript**: Lazy loading, event delegation, efficient DOM manipulation
- **Caching**: Static assets are cacheable by browsers and CDNs
- **Bundle Size**: Minimal dependencies, no external frameworks required

## 🔍 Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **CSS Features**: CSS Custom Properties, CSS Grid, Flexbox
- **JavaScript**: ES6+ features (classes, arrow functions, async/await)

## 🚀 Production Notes

- Assets are served with appropriate cache headers
- CSS is minified in production builds
- JavaScript can be bundled with application code if needed
- Theme persistence works across browser sessions
- No external dependencies required

---

*Last Updated: August 2025 | Version: 2.1.0*