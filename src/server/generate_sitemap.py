#!/usr/bin/env python3
"""
Sitemap Generator for SEO
Generates sitemap.xml for search engine optimization
"""

import os
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

class SitemapGenerator:
    """Generate sitemap.xml for the trading bot portals"""
    
    def __init__(self, base_url="https://fantdev.trading"):
        self.base_url = base_url.rstrip('/')
        self.pages = []
        
    def add_page(self, loc, lastmod=None, changefreq='weekly', priority=0.5):
        """Add a page to the sitemap"""
        page = {
            'loc': loc,
            'lastmod': lastmod or datetime.now().strftime('%Y-%m-%d'),
            'changefreq': changefreq,
            'priority': str(priority)
        }
        self.pages.append(page)
    
    def generate_sitemap(self):
        """Generate the sitemap XML"""
        # Create root element with namespace
        root = ET.Element('urlset')
        root.set('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
        root.set('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
        root.set('xsi:schemaLocation', 
                'http://www.sitemaps.org/schemas/sitemap/0.9 '
                'http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd')
        
        # Add each page
        for page in self.pages:
            url = ET.SubElement(root, 'url')
            
            # Add URL location
            loc = ET.SubElement(url, 'loc')
            loc.text = f"{self.base_url}{page['loc']}"
            
            # Add last modified date
            lastmod = ET.SubElement(url, 'lastmod')
            lastmod.text = page['lastmod']
            
            # Add change frequency
            changefreq = ET.SubElement(url, 'changefreq')
            changefreq.text = page['changefreq']
            
            # Add priority
            priority = ET.SubElement(url, 'priority')
            priority.text = page['priority']
        
        # Create tree and return as string
        tree = ET.ElementTree(root)
        
        # Format the XML nicely
        self.indent(root)
        
        return ET.tostring(root, encoding='unicode', xml_declaration=True)
    
    def indent(self, elem, level=0):
        """Add indentation to XML for readability"""
        i = "\n" + level * "  "
        if len(elem):
            if not elem.text or not elem.text.strip():
                elem.text = i + "  "
            if not elem.tail or not elem.tail.strip():
                elem.tail = i
            for elem in elem:
                self.indent(elem, level+1)
            if not elem.tail or not elem.tail.strip():
                elem.tail = i
        else:
            if level and (not elem.tail or not elem.tail.strip()):
                elem.tail = i
    
    def save_sitemap(self, filename='sitemap.xml'):
        """Save the sitemap to a file"""
        xml_content = self.generate_sitemap()
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(xml_content)
        
        return filename
    
    def generate_robots_txt(self):
        """Generate robots.txt file"""
        robots_content = f"""# Robots.txt for Fantdev Trading Bot
# Generated: {datetime.now().strftime('%Y-%m-%d')}

# Allow all bots by default
User-agent: *
Allow: /

# Disallow admin and API endpoints
User-agent: *
Disallow: /api/
Disallow: /admin/
Disallow: /debug/
Disallow: /config/
Disallow: /*.json$
Disallow: /*.log$

# Disallow specific bots if needed
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

# Crawl delay (in seconds)
Crawl-delay: 1

# Sitemap location
Sitemap: {self.base_url}/sitemap.xml

# Additional directives
# Allow specific files
Allow: /images/*.jpg
Allow: /images/*.png
Allow: /manifest.json

# Block sensitive files
Disallow: /customer_database.json
Disallow: /customer_config.json
Disallow: /*.py
Disallow: /*.pyc
Disallow: /__pycache__/
Disallow: /.git/
Disallow: /.env
Disallow: /backup/
Disallow: /src/

# Host directive (optional, specifies preferred domain)
Host: {self.base_url}
"""
        return robots_content
    
    def save_robots_txt(self, filename='robots.txt'):
        """Save robots.txt file"""
        content = self.generate_robots_txt()
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return filename

def main():
    """Main execution"""
    print("🗺️ Sitemap Generator for Fantdev Trading Bot")
    print("=" * 60)
    
    # Initialize generator
    generator = SitemapGenerator("https://fantdev.trading")
    
    # Define pages with their properties
    pages = [
        {
            'loc': '/',
            'changefreq': 'daily',
            'priority': 1.0,
            'description': 'Main landing page'
        },
        {
            'loc': '/portal',
            'changefreq': 'hourly',
            'priority': 0.9,
            'description': 'Customer trading portal'
        },
        {
            'loc': '/dashboard',
            'changefreq': 'daily',
            'priority': 0.8,
            'description': 'Filter bot dashboard'
        },
        {
            'loc': '/admin',
            'changefreq': 'daily',
            'priority': 0.7,
            'description': 'Admin command center'
        },
        {
            'loc': '/login',
            'changefreq': 'monthly',
            'priority': 0.6,
            'description': 'Login page'
        },
        {
            'loc': '/register',
            'changefreq': 'monthly',
            'priority': 0.6,
            'description': 'Registration page'
        },
        {
            'loc': '/about',
            'changefreq': 'monthly',
            'priority': 0.5,
            'description': 'About page'
        },
        {
            'loc': '/features',
            'changefreq': 'weekly',
            'priority': 0.7,
            'description': 'Features overview'
        },
        {
            'loc': '/api-docs',
            'changefreq': 'weekly',
            'priority': 0.4,
            'description': 'API documentation'
        },
        {
            'loc': '/privacy',
            'changefreq': 'yearly',
            'priority': 0.3,
            'description': 'Privacy policy'
        },
        {
            'loc': '/terms',
            'changefreq': 'yearly',
            'priority': 0.3,
            'description': 'Terms of service'
        },
        {
            'loc': '/contact',
            'changefreq': 'monthly',
            'priority': 0.5,
            'description': 'Contact page'
        }
    ]
    
    # Add pages to sitemap
    print("\n📍 Adding pages to sitemap:\n")
    for page in pages:
        generator.add_page(
            loc=page['loc'],
            changefreq=page['changefreq'],
            priority=page['priority']
        )
        print(f"  ✅ {page['loc']} - {page['description']}")
    
    # Generate and save sitemap
    print("\n📝 Generating sitemap.xml...")
    sitemap_file = generator.save_sitemap()
    print(f"✅ Sitemap saved to: {sitemap_file}")
    
    # Get file size
    sitemap_size = os.path.getsize(sitemap_file)
    print(f"   Size: {sitemap_size} bytes")
    print(f"   URLs: {len(pages)}")
    
    # Generate and save robots.txt
    print("\n🤖 Generating robots.txt...")
    robots_file = generator.save_robots_txt()
    print(f"✅ Robots.txt saved to: {robots_file}")
    
    # Create a sitemap index if needed (for large sites)
    print("\n📊 Summary:")
    print(f"- Total pages in sitemap: {len(pages)}")
    print(f"- Sitemap URL: {generator.base_url}/sitemap.xml")
    print(f"- Robots.txt URL: {generator.base_url}/robots.txt")
    
    print("\n💡 Next steps:")
    print("1. Upload sitemap.xml and robots.txt to your web root")
    print("2. Submit sitemap to Google Search Console")
    print("3. Submit sitemap to Bing Webmaster Tools")
    print("4. Test robots.txt with Google's robots.txt Tester")
    print("5. Monitor crawl stats in Search Console")
    
    print("\n🎉 SEO files generated successfully!")

if __name__ == "__main__":
    main()