#!/usr/bin/env python3
"""
HTML Structure Validator
Checks for common HTML structural issues in the project
"""

import os
import re
from pathlib import Path
from typing import List, Dict, Tuple
import json

class HTMLValidator:
    def __init__(self, project_root="."):
        self.project_root = Path(project_root)
        self.issues = []
        self.file_stats = {}
        
    def validate_all(self):
        """Run all validations"""
        print("🔍 Starting HTML Structure Validation...")
        print("=" * 60)
        
        # Find all HTML files
        html_files = list(self.project_root.glob("**/*.html"))
        template_files = list(self.project_root.glob("templates/*.html"))
        
        all_files = set(html_files + template_files)
        
        print(f"Found {len(all_files)} HTML files to validate\n")
        
        for file_path in all_files:
            if 'node_modules' in str(file_path) or '.git' in str(file_path):
                continue
            self.validate_file(file_path)
        
        self.print_report()
        
    def validate_file(self, file_path: Path):
        """Validate a single HTML file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            rel_path = file_path.relative_to(self.project_root)
            self.file_stats[str(rel_path)] = {
                'size': len(content),
                'lines': content.count('\n') + 1
            }
            
            # Check for duplicate tags
            self.check_duplicate_tags(content, rel_path)
            
            # Check for broken links
            self.check_broken_links(content, rel_path)
            
            # Check for missing closing tags
            self.check_unclosed_tags(content, rel_path)
            
            # Check for malformed attributes
            self.check_malformed_attributes(content, rel_path)
            
            # Check template syntax (for Jinja2)
            if 'templates' in str(file_path):
                self.check_template_syntax(content, rel_path)
                
        except Exception as e:
            self.issues.append({
                'file': str(file_path),
                'type': 'ERROR',
                'message': f"Failed to read file: {e}"
            })
    
    def check_duplicate_tags(self, content: str, file_path: Path):
        """Check for duplicate HTML structure tags"""
        # Check for multiple <html>, <head>, or <body> tags
        html_count = len(re.findall(r'<html[^>]*>', content, re.IGNORECASE))
        head_count = len(re.findall(r'<head[^>]*>', content, re.IGNORECASE))
        body_count = len(re.findall(r'<body[^>]*>', content, re.IGNORECASE))
        
        # Templates might not have these tags (they extend base)
        is_template = 'templates' in str(file_path) and 'base.html' not in str(file_path)
        
        if not is_template:
            if html_count > 1:
                self.issues.append({
                    'file': str(file_path),
                    'type': 'DUPLICATE_TAG',
                    'message': f"Found {html_count} <html> tags (should be 1)"
                })
            
            if head_count > 1:
                self.issues.append({
                    'file': str(file_path),
                    'type': 'DUPLICATE_TAG',
                    'message': f"Found {head_count} <head> tags (should be 1)"
                })
            
            if body_count > 1:
                self.issues.append({
                    'file': str(file_path),
                    'type': 'DUPLICATE_TAG',
                    'message': f"Found {body_count} <body> tags (should be 1)"
                })
    
    def check_broken_links(self, content: str, file_path: Path):
        """Check for potentially broken links"""
        # Extract all href and src attributes
        links = re.findall(r'(?:href|src)=["\']([^"\']+)["\']', content, re.IGNORECASE)
        
        for link in links:
            # Skip external links, template variables, and anchors
            if link.startswith(('http://', 'https://', '#', '{{', '{%')):
                continue
                
            # Check if it's a relative path that might not exist
            if link.startswith('/'):
                # Check common paths
                valid_paths = [
                    '/login', '/dashboard', '/customers', '/groups',
                    '/transactions', '/analytics', '/settings', '/profile',
                    '/help', '/api/', '/static/', '/logout'
                ]
                if not any(link.startswith(path) for path in valid_paths):
                    self.issues.append({
                        'file': str(file_path),
                        'type': 'SUSPICIOUS_LINK',
                        'message': f"Potentially invalid link: {link}"
                    })
    
    def check_unclosed_tags(self, content: str, file_path: Path):
        """Check for unclosed HTML tags"""
        # Simple check for common self-closing tags that shouldn't be
        problematic_patterns = [
            (r'<div[^>]*?/>', 'Self-closing <div> tag'),
            (r'<span[^>]*?/>', 'Self-closing <span> tag'),
            (r'<p[^>]*?/>', 'Self-closing <p> tag'),
        ]
        
        for pattern, description in problematic_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                self.issues.append({
                    'file': str(file_path),
                    'type': 'MALFORMED_TAG',
                    'message': f"{description} found: {matches[0][:50]}..."
                })
    
    def check_malformed_attributes(self, content: str, file_path: Path):
        """Check for malformed HTML attributes"""
        # Check for attributes without quotes
        unquoted = re.findall(r'<[^>]+\s+\w+=(?!["\'])([^\s>]+)', content)
        if unquoted:
            # Filter out template variables
            unquoted = [u for u in unquoted if not u.startswith('{{')]
            if unquoted:
                self.issues.append({
                    'file': str(file_path),
                    'type': 'UNQUOTED_ATTRIBUTE',
                    'message': f"Unquoted attribute values found: {unquoted[:3]}"
                })
    
    def check_template_syntax(self, content: str, file_path: Path):
        """Check Jinja2 template syntax"""
        # Check for unclosed template tags
        opening_tags = len(re.findall(r'{%', content))
        closing_tags = len(re.findall(r'%}', content))
        
        if opening_tags != closing_tags:
            self.issues.append({
                'file': str(file_path),
                'type': 'TEMPLATE_SYNTAX',
                'message': f"Mismatched template tags: {opening_tags} opening, {closing_tags} closing"
            })
        
        # Check for unclosed variable tags
        opening_vars = len(re.findall(r'{{', content))
        closing_vars = len(re.findall(r'}}', content))
        
        if opening_vars != closing_vars:
            self.issues.append({
                'file': str(file_path),
                'type': 'TEMPLATE_SYNTAX',
                'message': f"Mismatched variable tags: {opening_vars} opening, {closing_vars} closing"
            })
    
    def print_report(self):
        """Print validation report"""
        print("\n📊 VALIDATION REPORT")
        print("=" * 60)
        
        if not self.issues:
            print("✅ No structural issues found!")
        else:
            # Group issues by type
            issues_by_type = {}
            for issue in self.issues:
                issue_type = issue['type']
                if issue_type not in issues_by_type:
                    issues_by_type[issue_type] = []
                issues_by_type[issue_type].append(issue)
            
            # Print issues by type
            for issue_type, issues in issues_by_type.items():
                print(f"\n⚠️  {issue_type} ({len(issues)} issues)")
                print("-" * 40)
                for issue in issues[:5]:  # Show first 5 of each type
                    print(f"  📁 {issue['file']}")
                    print(f"     {issue['message']}")
                if len(issues) > 5:
                    print(f"     ... and {len(issues) - 5} more")
        
        # Print file statistics
        print("\n📈 FILE STATISTICS")
        print("=" * 60)
        total_files = len(self.file_stats)
        total_lines = sum(stats['lines'] for stats in self.file_stats.values())
        total_size = sum(stats['size'] for stats in self.file_stats.values())
        
        print(f"Total HTML files: {total_files}")
        print(f"Total lines: {total_lines:,}")
        print(f"Total size: {total_size:,} bytes ({total_size / 1024:.1f} KB)")
        
        # Find largest files
        largest_files = sorted(
            self.file_stats.items(),
            key=lambda x: x[1]['size'],
            reverse=True
        )[:5]
        
        print("\n📦 Largest Files:")
        for file_path, stats in largest_files:
            print(f"  {file_path}: {stats['size']:,} bytes ({stats['lines']} lines)")
        
        # Create summary JSON
        summary = {
            'total_files': total_files,
            'total_issues': len(self.issues),
            'issues_by_type': {
                issue_type: len(issues)
                for issue_type, issues in issues_by_type.items()
            } if self.issues else {},
            'validation_passed': len(self.issues) == 0
        }
        
        # Save summary
        with open('html_validation_report.json', 'w') as f:
            json.dump(summary, f, indent=2)
        
        print("\n💾 Full report saved to: html_validation_report.json")
        
        return len(self.issues) == 0

def main():
    """Run HTML validation"""
    validator = HTMLValidator()
    success = validator.validate_all()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ HTML VALIDATION PASSED")
    else:
        print("⚠️  HTML VALIDATION COMPLETED WITH ISSUES")
        print("Please review and fix the issues listed above")
    print("=" * 60)
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())