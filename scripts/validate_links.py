#!/usr/bin/env python3
"""
Link Validation Script for Fantdev Trading Bot
Validates internal and external links in HTML and Markdown files
"""

import os
import re
import requests
import urllib.parse
from pathlib import Path
from typing import Dict, List, Tuple, Set
import json

class LinkValidator:
    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.broken_links: Dict[str, List[str]] = {}
        self.valid_links: Dict[str, List[str]] = {}
        self.external_links: Dict[str, List[str]] = {}
        self.skipped_links: Dict[str, List[str]] = {}
        
    def find_files(self, extensions: List[str] = None) -> List[Path]:
        """Find all files with specified extensions"""
        if extensions is None:
            extensions = ['.html', '.md', '.ts', '.tsx', '.js', '.jsx', '.py']
        
        files = []
        for ext in extensions:
            files.extend(self.base_dir.rglob(f"*{ext}"))
        
        return files
    
    def extract_links_from_html(self, file_path: Path) -> List[str]:
        """Extract links from HTML files"""
        links = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Find href attributes
            href_pattern = r'href=["\']([^"\']+)["\']'
            href_links = re.findall(href_pattern, content)
            links.extend(href_links)
            
            # Find src attributes
            src_pattern = r'src=["\']([^"\']+)["\']'
            src_links = re.findall(src_pattern, content)
            links.extend(src_links)
            
            # Find url() in CSS
            url_pattern = r'url\(["\']?([^"\')\s]+)["\']?\)'
            url_links = re.findall(url_pattern, content)
            links.extend(url_links)
            
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
        
        return links
    
    def extract_links_from_markdown(self, file_path: Path) -> List[str]:
        """Extract links from Markdown files"""
        links = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Find markdown links [text](url)
            md_pattern = r'\[([^\]]+)\]\(([^)]+)\)'
            md_links = re.findall(md_pattern, content)
            links.extend([url for _, url in md_links])
            
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
        
        return links
    
    def extract_links_from_code(self, file_path: Path) -> List[str]:
        """Extract links from code files"""
        links = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Find URLs in strings
            url_pattern = r'["\'](https?://[^"\']+)["\']'
            url_links = re.findall(url_pattern, content)
            links.extend(url_links)
            
            # Find localhost URLs
            localhost_pattern = r'["\'](http://localhost:[^"\']+)["\']'
            localhost_links = re.findall(localhost_pattern, content)
            links.extend(localhost_links)
            
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
        
        return links
    
    def categorize_link(self, link: str, file_path: Path) -> str:
        """Categorize a link as internal, external, or asset"""
        if link.startswith(('http://', 'https://')):
            return 'external'
        elif link.startswith(('//', 'mailto:', 'tel:')):
            return 'external'
        elif link.startswith('/'):
            return 'internal'
        elif link.startswith(('./', '../')):
            return 'relative'
        else:
            return 'asset'
    
    def validate_internal_link(self, link: str, file_path: Path) -> bool:
        """Validate internal links"""
        if link.startswith('/'):
            # Absolute path from public directory
            target_path = self.base_dir / 'public' / link.lstrip('/')
        else:
            # Relative path
            target_path = file_path.parent / link
        
        return target_path.exists()
    
    def validate_asset_link(self, link: str, file_path: Path) -> bool:
        """Validate asset links"""
        if link.startswith('/'):
            # Absolute path from public directory
            target_path = self.base_dir / 'public' / link.lstrip('/')
        else:
            # Relative path
            target_path = file_path.parent / link
        
        return target_path.exists()
    
    def validate_external_link(self, link: str) -> bool:
        """Validate external links (basic check)"""
        try:
            # Skip certain external links that might cause issues
            if any(skip in link for skip in ['localhost', '127.0.0.1', '0.0.0.0']):
                return True
            
            # Basic URL validation
            parsed = urllib.parse.urlparse(link)
            if not parsed.scheme or not parsed.netloc:
                return False
            
            # For now, just validate URL format
            # In production, you might want to actually check if the URL is accessible
            return True
            
        except Exception:
            return False
    
    def validate_links_in_file(self, file_path: Path) -> None:
        """Validate all links in a single file"""
        links = []
        
        if file_path.suffix == '.html':
            links = self.extract_links_from_html(file_path)
        elif file_path.suffix == '.md':
            links = self.extract_links_from_markdown(file_path)
        elif file_path.suffix in ['.ts', '.tsx', '.js', '.jsx', '.py']:
            links = self.extract_links_from_code(file_path)
        
        for link in links:
            if not link or link.startswith('#'):
                continue
                
            category = self.categorize_link(link, file_path)
            file_str = str(file_path.relative_to(self.base_dir))
            
            if category == 'internal':
                if self.validate_internal_link(link, file_path):
                    self.valid_links.setdefault(file_str, []).append(link)
                else:
                    self.broken_links.setdefault(file_str, []).append(link)
            
            elif category == 'asset':
                if self.validate_asset_link(link, file_path):
                    self.valid_links.setdefault(file_str, []).append(link)
                else:
                    self.broken_links.setdefault(file_str, []).append(link)
            
            elif category == 'external':
                if self.validate_external_link(link):
                    self.external_links.setdefault(file_str, []).append(link)
                else:
                    self.broken_links.setdefault(file_str, []).append(link)
            
            elif category == 'relative':
                # Skip relative links for now as they're context-dependent
                self.skipped_links.setdefault(file_str, []).append(link)
    
    def validate_all_links(self) -> None:
        """Validate links in all relevant files"""
        files = self.find_files()
        
        print(f"🔍 Validating links in {len(files)} files...")
        
        for file_path in files:
            if 'node_modules' in str(file_path) or '.git' in str(file_path):
                continue
                
            print(f"  📄 {file_path.relative_to(self.base_dir)}")
            self.validate_links_in_file(file_path)
    
    def generate_report(self) -> str:
        """Generate a comprehensive report"""
        report = []
        report.append("# 🔗 Link Validation Report")
        report.append("")
        
        # Summary
        total_broken = sum(len(links) for links in self.broken_links.values())
        total_valid = sum(len(links) for links in self.valid_links.values())
        total_external = sum(len(links) for links in self.external_links.values())
        
        report.append("## 📊 Summary")
        report.append(f"- **Total Files Checked:** {len(self.valid_links) + len(self.broken_links)}")
        report.append(f"- **Valid Links:** {total_valid}")
        report.append(f"- **Broken Links:** {total_broken}")
        report.append(f"- **External Links:** {total_external}")
        report.append("")
        
        # Broken Links
        if self.broken_links:
            report.append("## ❌ Broken Links")
            report.append("")
            for file_path, links in self.broken_links.items():
                report.append(f"### 📄 {file_path}")
                for link in links:
                    report.append(f"- `{link}`")
                report.append("")
        else:
            report.append("## ✅ No Broken Links Found!")
            report.append("")
        
        # Valid Links
        if self.valid_links:
            report.append("## ✅ Valid Links")
            report.append("")
            for file_path, links in self.valid_links.items():
                report.append(f"### 📄 {file_path}")
                for link in links[:10]:  # Show first 10
                    report.append(f"- `{link}`")
                if len(links) > 10:
                    report.append(f"- ... and {len(links) - 10} more")
                report.append("")
        
        # External Links
        if self.external_links:
            report.append("## 🌐 External Links")
            report.append("")
            for file_path, links in self.external_links.items():
                report.append(f"### 📄 {file_path}")
                for link in links[:5]:  # Show first 5
                    report.append(f"- `{link}`")
                if len(links) > 5:
                    report.append(f"- ... and {len(links) - 5} more")
                report.append("")
        
        return "\n".join(report)
    
    def save_report(self, output_file: str = "link_validation_report.md") -> None:
        """Save the report to a file"""
        report = self.generate_report()
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"📝 Report saved to {output_file}")
    
    def print_summary(self) -> None:
        """Print a summary of the validation results"""
        total_broken = sum(len(links) for links in self.broken_links.values())
        total_valid = sum(len(links) for links in self.valid_links.values())
        
        print(f"\n📊 Link Validation Summary:")
        print(f"  ✅ Valid Links: {total_valid}")
        print(f"  ❌ Broken Links: {total_broken}")
        print(f"  📄 Files with Issues: {len(self.broken_links)}")
        
        if self.broken_links:
            print(f"\n🚨 Files with broken links:")
            for file_path, links in self.broken_links.items():
                print(f"  📄 {file_path}: {len(links)} broken links")

def main():
    """Main function"""
    print("🔗 Fantdev Trading Bot - Link Validator")
    print("=" * 50)
    
    validator = LinkValidator()
    validator.validate_all_links()
    
    # Print summary
    validator.print_summary()
    
    # Save report
    validator.save_report()
    
    # Exit with error code if there are broken links
    total_broken = sum(len(links) for links in validator.broken_links.values())
    if total_broken > 0:
        print(f"\n❌ Found {total_broken} broken links. Please fix them.")
        exit(1)
    else:
        print(f"\n✅ All links are valid!")

if __name__ == "__main__":
    main()
