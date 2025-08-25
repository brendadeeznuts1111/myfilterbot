#!/usr/bin/env python3
"""
Social Media Preview Image Generator
Creates Open Graph and Twitter Card images for all portals
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
import json
from datetime import datetime

class SocialImageGenerator:
    """Generate social media preview images for portals"""
    
    def __init__(self):
        self.output_dir = "images"
        self.ensure_output_dir()
        
        # Standard dimensions for social media
        self.dimensions = {
            'og': (1200, 630),  # Open Graph
            'twitter': (1200, 628),  # Twitter Card
            'linkedin': (1200, 627),  # LinkedIn
            'facebook': (1200, 630),  # Facebook
            'thumbnail': (400, 300)  # Small thumbnail
        }
        
        # Brand colors
        self.colors = {
            'primary': '#667eea',
            'secondary': '#764ba2',
            'success': '#48bb78',
            'dark': '#2d3748',
            'light': '#f7fafc',
            'white': '#ffffff',
            'gradient_start': '#667eea',
            'gradient_end': '#764ba2'
        }
    
    def ensure_output_dir(self):
        """Create output directory if it doesn't exist"""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
            print(f"✅ Created output directory: {self.output_dir}")
    
    def create_gradient_background(self, size, start_color, end_color):
        """Create a gradient background"""
        width, height = size
        base = Image.new('RGB', size, start_color)
        top = Image.new('RGB', size, end_color)
        
        mask = Image.new('L', size)
        mask_data = []
        for y in range(height):
            mask_data.extend([int(255 * (y / height))] * width)
        mask.putdata(mask_data)
        
        base.paste(top, (0, 0), mask)
        return base
    
    def add_pattern_overlay(self, image):
        """Add a subtle pattern overlay"""
        overlay = Image.new('RGBA', image.size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(overlay)
        
        # Add dots pattern
        for x in range(0, image.width, 30):
            for y in range(0, image.height, 30):
                if (x + y) % 60 == 0:
                    draw.ellipse([x-2, y-2, x+2, y+2], fill=(255, 255, 255, 20))
        
        # Composite with original
        return Image.alpha_composite(image.convert('RGBA'), overlay).convert('RGB')
    
    def create_portal_preview(self, portal_type, dimensions_key='og'):
        """Create a preview image for a specific portal"""
        size = self.dimensions[dimensions_key]
        
        # Portal configurations
        portals = {
            'customer': {
                'title': 'Customer Trading Portal',
                'subtitle': 'Real-Time Dashboard & Analytics',
                'features': ['Live Balance Updates', 'P&L Tracking', 'Transaction History', 'WebSocket Updates'],
                'icon': '💼',
                'gradient': (self.colors['primary'], self.colors['secondary'])
            },
            'admin': {
                'title': 'Admin Command Center',
                'subtitle': 'Complete Operations Management',
                'features': ['Customer Management', 'Transaction Monitoring', 'Advanced Analytics', 'System Control'],
                'icon': '🛡️',
                'gradient': (self.colors['secondary'], self.colors['primary'])
            },
            'dashboard': {
                'title': 'Filter Bot Dashboard',
                'subtitle': 'Message Analytics & Monitoring',
                'features': ['Real-Time Filtering', 'Pattern Detection', 'Activity Tracking', 'Export Tools'],
                'icon': '📊',
                'gradient': (self.colors['primary'], self.colors['success'])
            }
        }
        
        config = portals.get(portal_type, portals['customer'])
        
        # Create gradient background
        img = self.create_gradient_background(size, config['gradient'][0], config['gradient'][1])
        img = self.add_pattern_overlay(img)
        
        # Create drawing context
        draw = ImageDraw.Draw(img)
        
        # Try to use a nice font, fallback to default if not available
        try:
            title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 72)
            subtitle_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
            feature_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
            brand_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 28)
        except:
            # Fallback to default font
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
            feature_font = ImageFont.load_default()
            brand_font = ImageFont.load_default()
        
        # Add white overlay box for text
        box_margin = 80
        box_top = 120
        box_height = size[1] - 240
        draw.rounded_rectangle(
            [box_margin, box_top, size[0] - box_margin, box_top + box_height],
            radius=20,
            fill=(255, 255, 255, 240)
        )
        
        # Add icon (skip emoji font for now)
        draw.text((size[0]//2, box_top + 60), config['icon'], 
                 font=title_font,
                 anchor="mm")
        
        # Add title
        draw.text((size[0]//2, box_top + 140), config['title'], 
                 fill=self.colors['dark'], font=title_font, anchor="mm")
        
        # Add subtitle
        draw.text((size[0]//2, box_top + 200), config['subtitle'], 
                 fill=self.colors['secondary'], font=subtitle_font, anchor="mm")
        
        # Add features
        feature_y = box_top + 280
        for feature in config['features']:
            draw.text((size[0]//2, feature_y), f"✓ {feature}", 
                     fill=self.colors['dark'], font=feature_font, anchor="mm")
            feature_y += 40
        
        # Add brand
        draw.text((size[0]//2, size[1] - 60), "FANTDEV TRADING SYSTEMS", 
                 fill=self.colors['white'], font=brand_font, anchor="mm")
        
        # Save image
        filename = f"{portal_type}-{dimensions_key}.jpg"
        filepath = os.path.join(self.output_dir, filename)
        img.save(filepath, 'JPEG', quality=95, optimize=True)
        
        return filepath
    
    def create_all_portal_images(self):
        """Generate all social media images for all portals"""
        portals = ['customer', 'admin', 'dashboard']
        platforms = ['og', 'twitter', 'thumbnail']
        
        generated_files = []
        
        for portal in portals:
            for platform in platforms:
                filepath = self.create_portal_preview(portal, platform)
                generated_files.append(filepath)
                print(f"✅ Generated: {filepath}")
        
        return generated_files
    
    def create_favicon(self):
        """Create favicon images"""
        sizes = [16, 32, 48, 64, 128, 256]
        
        for size in sizes:
            # Create base image with gradient
            img = self.create_gradient_background((size, size), 
                                                 self.colors['primary'], 
                                                 self.colors['secondary'])
            
            # Add "F" letter for Fantdev
            draw = ImageDraw.Draw(img)
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", int(size * 0.6))
            except:
                font = ImageFont.load_default()
            
            draw.text((size//2, size//2), "F", fill=self.colors['white'], 
                     font=font, anchor="mm")
            
            # Save favicon
            if size == 16 or size == 32:
                filename = f"favicon-{size}x{size}.png"
            else:
                filename = f"icon-{size}x{size}.png"
            
            filepath = os.path.join(self.output_dir, filename)
            img.save(filepath, 'PNG', optimize=True)
            print(f"✅ Generated favicon: {filepath}")
        
        # Create apple-touch-icon
        apple_size = 180
        img = self.create_gradient_background((apple_size, apple_size),
                                             self.colors['primary'],
                                             self.colors['secondary'])
        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 108)
        except:
            font = ImageFont.load_default()
        draw.text((apple_size//2, apple_size//2), "F", fill=self.colors['white'],
                 font=font, anchor="mm")
        
        filepath = os.path.join(self.output_dir, "apple-touch-icon.png")
        img.save(filepath, 'PNG', optimize=True)
        print(f"✅ Generated: {filepath}")
    
    def generate_manifest(self):
        """Generate manifest.json for PWA"""
        manifest = {
            "name": "Fantdev Trading Bot Dashboard",
            "short_name": "Fantdev",
            "description": "Advanced trading bot management system with real-time analytics",
            "start_url": "/",
            "display": "standalone",
            "background_color": "#667eea",
            "theme_color": "#667eea",
            "orientation": "portrait-primary",
            "icons": [
                {
                    "src": "/images/icon-48x48.png",
                    "sizes": "48x48",
                    "type": "image/png",
                    "purpose": "any maskable"
                },
                {
                    "src": "/images/icon-64x64.png",
                    "sizes": "64x64",
                    "type": "image/png",
                    "purpose": "any maskable"
                },
                {
                    "src": "/images/icon-128x128.png",
                    "sizes": "128x128",
                    "type": "image/png",
                    "purpose": "any maskable"
                },
                {
                    "src": "/images/icon-256x256.png",
                    "sizes": "256x256",
                    "type": "image/png",
                    "purpose": "any maskable"
                },
                {
                    "src": "/images/apple-touch-icon.png",
                    "sizes": "180x180",
                    "type": "image/png"
                }
            ],
            "categories": ["finance", "business", "productivity"],
            "screenshots": [
                {
                    "src": "/images/customer-og.jpg",
                    "sizes": "1200x630",
                    "type": "image/jpeg",
                    "label": "Customer Portal Dashboard"
                },
                {
                    "src": "/images/admin-og.jpg",
                    "sizes": "1200x630",
                    "type": "image/jpeg",
                    "label": "Admin Command Center"
                }
            ]
        }
        
        with open('manifest.json', 'w') as f:
            json.dump(manifest, f, indent=2)
        print("✅ Generated: manifest.json")
        
        return manifest

def main():
    """Main execution"""
    print("🎨 Social Media Image Generator for Fantdev Trading Bot")
    print("=" * 60)
    
    generator = SocialImageGenerator()
    
    # Generate all portal images
    print("\n📸 Generating portal preview images...")
    generator.create_all_portal_images()
    
    # Generate favicons
    print("\n🎯 Generating favicon images...")
    generator.create_favicon()
    
    # Generate PWA manifest
    print("\n📱 Generating PWA manifest...")
    generator.generate_manifest()
    
    print("\n✨ All images generated successfully!")
    print(f"📁 Images saved to: {generator.output_dir}/")
    
    # Summary
    print("\n📊 Summary:")
    print("- 9 social media preview images (3 portals × 3 platforms)")
    print("- 7 favicon/icon images (various sizes)")
    print("- 1 PWA manifest.json file")
    print("\n🎉 Your portals are now fully optimized for social sharing!")

if __name__ == "__main__":
    # Check for required library
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("❌ PIL/Pillow is required. Install with: pip install Pillow")
        exit(1)
    
    main()