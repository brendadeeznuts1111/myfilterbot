/**
 * FantDev Trading Platform - Image Optimization System
 * Enhanced image loading with lazy loading, WebP support, and responsive images
 */

class ImageOptimizer {
    constructor(options = {}) {
        this.options = {
            lazyLoading: true,
            webpSupport: true,
            responsiveImages: true,
            placeholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Mb2FkaW5nLi4uPC90ZXh0Pjwvc3ZnPg==',
            errorPlaceholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+',
            rootMargin: '50px',
            threshold: 0.1,
            ...options
        };
        
        this.webpSupported = null;
        this.observer = null;
        this.init();
    }
    
    async init() {
        await this.checkWebPSupport();
        this.setupLazyLoading();
        this.optimizeExistingImages();
        this.setupResponsiveImages();
    }
    
    // Check WebP support
    async checkWebPSupport() {
        if (this.webpSupported !== null) return this.webpSupported;
        
        return new Promise((resolve) => {
            const webP = new Image();
            webP.onload = webP.onerror = () => {
                this.webpSupported = (webP.height === 2);
                resolve(this.webpSupported);
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    }
    
    // Setup lazy loading with Intersection Observer
    setupLazyLoading() {
        if (!this.options.lazyLoading || !('IntersectionObserver' in window)) {
            return;
        }
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: this.options.rootMargin,
            threshold: this.options.threshold
        });
        
        // Observe all lazy images
        document.querySelectorAll('img[data-src], picture[data-src]').forEach(img => {
            this.observer.observe(img);
        });
    }
    
    // Load individual image
    async loadImage(element) {
        const isImg = element.tagName === 'IMG';
        const isPicture = element.tagName === 'PICTURE';
        
        if (isImg) {
            await this.loadImgElement(element);
        } else if (isPicture) {
            await this.loadPictureElement(element);
        }
    }
    
    // Load IMG element
    async loadImgElement(img) {
        const src = img.dataset.src;
        const srcset = img.dataset.srcset;
        
        if (!src) return;
        
        // Show loading placeholder
        if (!img.src || img.src === this.options.placeholder) {
            img.src = this.options.placeholder;
        }
        
        try {
            // Create optimized source
            const optimizedSrc = await this.getOptimizedSrc(src);
            
            // Preload image
            await this.preloadImage(optimizedSrc);
            
            // Set source and srcset
            img.src = optimizedSrc;
            if (srcset) {
                img.srcset = await this.getOptimizedSrcset(srcset);
            }
            
            // Add loaded class for animations
            img.classList.add('img-loaded');
            img.removeAttribute('data-src');
            img.removeAttribute('data-srcset');
            
        } catch (error) {
            console.error('Failed to load image:', src, error);
            img.src = this.options.errorPlaceholder;
            img.classList.add('img-error');
        }
    }
    
    // Load PICTURE element
    async loadPictureElement(picture) {
        const sources = picture.querySelectorAll('source[data-srcset]');
        const img = picture.querySelector('img');
        
        try {
            // Load all sources
            for (const source of sources) {
                const srcset = source.dataset.srcset;
                if (srcset) {
                    source.srcset = await this.getOptimizedSrcset(srcset);
                    source.removeAttribute('data-srcset');
                }
            }
            
            // Load main image
            if (img && img.dataset.src) {
                await this.loadImgElement(img);
            }
            
            picture.classList.add('picture-loaded');
            
        } catch (error) {
            console.error('Failed to load picture:', error);
            if (img) {
                img.src = this.options.errorPlaceholder;
                img.classList.add('img-error');
            }
        }
    }
    
    // Get optimized source URL
    async getOptimizedSrc(src) {
        if (!this.options.webpSupport || !this.webpSupported) {
            return src;
        }
        
        // Convert to WebP if supported and not already WebP
        if (!src.includes('.webp') && (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png'))) {
            const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
            
            // Check if WebP version exists
            if (await this.checkImageExists(webpSrc)) {
                return webpSrc;
            }
        }
        
        return src;
    }
    
    // Get optimized srcset
    async getOptimizedSrcset(srcset) {
        if (!this.options.webpSupport || !this.webpSupported) {
            return srcset;
        }
        
        const sources = srcset.split(',').map(s => s.trim());
        const optimizedSources = await Promise.all(
            sources.map(async (source) => {
                const [url, descriptor] = source.split(' ');
                const optimizedUrl = await this.getOptimizedSrc(url);
                return descriptor ? `${optimizedUrl} ${descriptor}` : optimizedUrl;
            })
        );
        
        return optimizedSources.join(', ');
    }
    
    // Check if image exists
    async checkImageExists(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    }
    
    // Preload image
    preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
    
    // Optimize existing images
    optimizeExistingImages() {
        document.querySelectorAll('img:not([data-src])').forEach(img => {
            if (!img.complete) {
                img.addEventListener('load', () => {
                    img.classList.add('img-loaded');
                });
                img.addEventListener('error', () => {
                    img.src = this.options.errorPlaceholder;
                    img.classList.add('img-error');
                });
            } else {
                img.classList.add('img-loaded');
            }
        });
    }
    
    // Setup responsive images
    setupResponsiveImages() {
        if (!this.options.responsiveImages) return;
        
        // Add responsive image classes
        document.querySelectorAll('img').forEach(img => {
            if (!img.classList.contains('img-responsive')) {
                img.classList.add('img-responsive');
            }
        });
    }
    
    // Add new images to lazy loading
    observeNewImages() {
        if (!this.observer) return;
        
        document.querySelectorAll('img[data-src]:not(.img-observed), picture[data-src]:not(.picture-observed)').forEach(element => {
            this.observer.observe(element);
            element.classList.add(element.tagName === 'IMG' ? 'img-observed' : 'picture-observed');
        });
    }
    
    // Create responsive image element
    createResponsiveImage(src, alt = '', sizes = {}) {
        const picture = document.createElement('picture');
        
        // Add source elements for different screen sizes
        Object.entries(sizes).forEach(([breakpoint, imageSrc]) => {
            const source = document.createElement('source');
            source.media = `(min-width: ${breakpoint})`;
            source.dataset.srcset = imageSrc;
            picture.appendChild(source);
        });
        
        // Add main image
        const img = document.createElement('img');
        img.dataset.src = src;
        img.alt = alt;
        img.classList.add('img-responsive');
        img.src = this.options.placeholder;
        
        picture.appendChild(img);
        
        // Observe for lazy loading
        if (this.observer) {
            this.observer.observe(picture);
        }
        
        return picture;
    }
    
    // Create lazy image element
    createLazyImage(src, alt = '', className = '') {
        const img = document.createElement('img');
        img.dataset.src = src;
        img.alt = alt;
        img.className = `img-responsive ${className}`.trim();
        img.src = this.options.placeholder;
        
        // Observe for lazy loading
        if (this.observer) {
            this.observer.observe(img);
        }
        
        return img;
    }
    
    // Destroy optimizer
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

// CSS for image optimization (inject into head)
const imageOptimizerCSS = `
    .img-responsive {
        max-width: 100%;
        height: auto;
        display: block;
    }
    
    .img-loaded {
        opacity: 1;
        transition: opacity 0.3s ease-in-out;
    }
    
    .img-error {
        opacity: 0.5;
        filter: grayscale(100%);
    }
    
    img[data-src] {
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
    }
    
    .picture-loaded img {
        opacity: 1;
    }
    
    /* Loading animation */
    @keyframes imageLoading {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
    }
    
    img[src*="data:image/svg+xml"] {
        animation: imageLoading 1.5s ease-in-out infinite;
    }
    
    /* Responsive image containers */
    .img-container {
        position: relative;
        overflow: hidden;
    }
    
    .img-container img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    /* Aspect ratio containers */
    .img-16-9 { aspect-ratio: 16/9; }
    .img-4-3 { aspect-ratio: 4/3; }
    .img-1-1 { aspect-ratio: 1/1; }
    .img-3-2 { aspect-ratio: 3/2; }
`;

// Inject CSS
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = imageOptimizerCSS;
    document.head.appendChild(style);
}

// Global instance
let globalImageOptimizer = null;

// Initialize on DOM ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            globalImageOptimizer = new ImageOptimizer();
        });
    } else {
        globalImageOptimizer = new ImageOptimizer();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageOptimizer;
}

// Global access
if (typeof window !== 'undefined') {
    window.ImageOptimizer = ImageOptimizer;
    window.imageOptimizer = globalImageOptimizer;
}
