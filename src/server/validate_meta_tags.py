#!/usr/bin/env python3
"""
Meta Tag Validator
Validates SEO and social media meta tags across all HTML files
"""

import os
import re
import json
from datetime import datetime
from urllib.parse import urlparse

class MetaTagValidator:
    """Validate meta tags for SEO and social media optimization"""
    
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.passed = []
        
        # Define validation rules
        self.rules = {
            'title': {
                'max_length': 60,
                'min_length': 30,
                'required': True
            },
            'description': {
                'max_length': 160,
                'min_length': 120,
                'required': True
            },
            'og:image': {
                'required': True,
                'width': 1200,
                'height': 630,
                'format': ['jpg', 'jpeg', 'png']
            },
            'twitter:image': {
                'required': True,
                'width': 1200,
                'height': 628
            }
        }
    
    def extract_meta_tags(self, html_content):
        """Extract all meta tags from HTML content"""
        tags = {}
        
        # Extract title
        title_match = re.search(r'<title>([^<]+)</title>', html_content, re.IGNORECASE)
        if title_match:
            tags['title'] = title_match.group(1).strip()
        
        # Extract meta tags
        meta_pattern = r'<meta\s+(?:name|property)=["\']([\w:]+)["\']\s+content=["\'](.[^"\']*)["\']'
        for match in re.finditer(meta_pattern, html_content, re.IGNORECASE):
            tags[match.group(1)] = match.group(2)
        
        # Extract canonical URL
        canonical_match = re.search(r'<link\s+rel=["\']+canonical["\']+\s+href=["\'](.[^"\']+)["\']', html_content, re.IGNORECASE)
        if canonical_match:
            tags['canonical'] = canonical_match.group(1)
        
        # Extract structured data
        json_ld_pattern = r'<script\s+type=["\']+application/ld\+json["\']+>([^<]+)</script>'
        json_ld_match = re.search(json_ld_pattern, html_content, re.IGNORECASE)
        if json_ld_match:
            try:
                tags['structured_data'] = json.loads(json_ld_match.group(1))
            except:
                pass
        
        return tags
    
    def validate_title(self, title):
        """Validate title tag"""
        if not title:
            self.errors.append("❌ Missing title tag")
            return False
        
        length = len(title)
        if length > self.rules['title']['max_length']:
            self.warnings.append(f"⚠️  Title too long ({length} chars, max {self.rules['title']['max_length']})")
        elif length < self.rules['title']['min_length']:
            self.warnings.append(f"⚠️  Title too short ({length} chars, min {self.rules['title']['min_length']})")
        else:
            self.passed.append(f"✅ Title length optimal ({length} chars)")
        
        # Check for brand name
        if 'Fantdev' not in title:
            self.warnings.append("⚠️  Title missing brand name 'Fantdev'")
        
        return True
    
    def validate_description(self, description):
        """Validate meta description"""
        if not description:
            self.errors.append("❌ Missing meta description")
            return False
        
        length = len(description)
        if length > self.rules['description']['max_length']:
            self.warnings.append(f"⚠️  Description too long ({length} chars, max {self.rules['description']['max_length']})")
        elif length < self.rules['description']['min_length']:
            self.warnings.append(f"⚠️  Description too short ({length} chars, min {self.rules['description']['min_length']})")
        else:
            self.passed.append(f"✅ Description length optimal ({length} chars)")
        
        # Check for call to action
        cta_words = ['access', 'manage', 'track', 'monitor', 'view', 'analyze']
        if not any(word in description.lower() for word in cta_words):
            self.warnings.append("⚠️  Description missing action words/CTA")
        
        return True
    
    def validate_open_graph(self, tags):
        """Validate Open Graph tags"""
        og_required = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']
        
        for tag in og_required:
            if tag not in tags:
                self.errors.append(f"❌ Missing required Open Graph tag: {tag}")
            else:
                self.passed.append(f"✅ Open Graph tag present: {tag}")
        
        # Validate image dimensions if present
        if 'og:image:width' in tags and 'og:image:height' in tags:
            width = int(tags.get('og:image:width', 0))
            height = int(tags.get('og:image:height', 0))
            
            if width != 1200 or height != 630:
                self.warnings.append(f"⚠️  OG image dimensions not optimal ({width}x{height}, should be 1200x630)")
            else:
                self.passed.append("✅ OG image dimensions optimal (1200x630)")
    
    def validate_twitter_card(self, tags):
        """Validate Twitter Card tags"""
        twitter_required = ['twitter:card', 'twitter:title', 'twitter:description']
        
        for tag in twitter_required:
            if tag not in tags:
                self.warnings.append(f"⚠️  Missing Twitter Card tag: {tag}")
            else:
                self.passed.append(f"✅ Twitter Card tag present: {tag}")
        
        # Check for large image card
        if tags.get('twitter:card') != 'summary_large_image':
            self.warnings.append("⚠️  Twitter card not set to 'summary_large_image'")
    
    def validate_security_headers(self, tags):
        """Check for security-related meta tags"""
        security_headers = [
            'referrer',
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection'
        ]
        
        for header in security_headers:
            found = False
            for tag_name in tags:
                if header.lower() in tag_name.lower():
                    self.passed.append(f"✅ Security header present: {header}")
                    found = True
                    break
            
            if not found:
                self.warnings.append(f"⚠️  Security header missing: {header}")
    
    def validate_structured_data(self, structured_data):
        """Validate JSON-LD structured data"""
        if not structured_data:
            self.warnings.append("⚠️  No structured data (JSON-LD) found")
            return
        
        self.passed.append("✅ Structured data present")
        
        # Check for required fields
        required_fields = ['@context', '@type', 'name', 'description']
        for field in required_fields:
            if field not in structured_data:
                self.warnings.append(f"⚠️  Structured data missing field: {field}")
    
    def validate_file(self, filepath):
        """Validate a single HTML file"""
        self.errors = []
        self.warnings = []
        self.passed = []
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            return {'error': f"Failed to read file: {e}"}
        
        tags = self.extract_meta_tags(content)
        
        # Run validations
        self.validate_title(tags.get('title'))
        self.validate_description(tags.get('description'))
        self.validate_open_graph(tags)
        self.validate_twitter_card(tags)
        self.validate_security_headers(tags)
        self.validate_structured_data(tags.get('structured_data'))
        
        # Check for canonical URL
        if 'canonical' not in tags:
            self.warnings.append("⚠️  No canonical URL specified")
        else:
            self.passed.append("✅ Canonical URL present")
        
        # Check viewport
        if 'viewport' not in tags:
            self.errors.append("❌ Missing viewport meta tag (required for mobile)")
        else:
            self.passed.append("✅ Viewport meta tag present")
        
        # Check robots
        if 'robots' in tags:
            robots_value = tags['robots'].lower()
            if 'noindex' in robots_value:
                self.warnings.append("⚠️  Page set to noindex (won't appear in search results)")
        
        return {
            'file': os.path.basename(filepath),
            'errors': self.errors,
            'warnings': self.warnings,
            'passed': self.passed,
            'score': self.calculate_score()
        }
    
    def calculate_score(self):
        """Calculate SEO score based on validation results"""
        total_checks = len(self.errors) + len(self.warnings) + len(self.passed)
        if total_checks == 0:
            return 0
        
        # Errors weight: -10, Warnings weight: -2, Passed weight: +5
        score = (len(self.passed) * 5) - (len(self.errors) * 10) - (len(self.warnings) * 2)
        max_score = total_checks * 5
        
        percentage = max(0, min(100, (score / max_score) * 100))
        return round(percentage)
    
    def generate_report(self, results):
        """Generate validation report"""
        report = "# Meta Tag Validation Report\n\n"
        report += f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        
        total_errors = sum(len(r['errors']) for r in results)
        total_warnings = sum(len(r['warnings']) for r in results)
        total_passed = sum(len(r['passed']) for r in results)
        avg_score = sum(r['score'] for r in results) / len(results) if results else 0
        
        # Summary
        report += "## Summary\n\n"
        report += f"- **Files Validated**: {len(results)}\n"
        report += f"- **Total Errors**: {total_errors}\n"
        report += f"- **Total Warnings**: {total_warnings}\n"
        report += f"- **Total Passed**: {total_passed}\n"
        report += f"- **Average Score**: {avg_score:.1f}%\n\n"
        
        # Grade
        if avg_score >= 90:
            grade = "A - Excellent"
        elif avg_score >= 80:
            grade = "B - Good"
        elif avg_score >= 70:
            grade = "C - Needs Improvement"
        elif avg_score >= 60:
            grade = "D - Poor"
        else:
            grade = "F - Critical Issues"
        
        report += f"**Overall Grade**: {grade}\n\n"
        report += "---\n\n"
        
        # Individual file results
        for result in results:
            report += f"## {result['file']}\n\n"
            report += f"**Score**: {result['score']}%\n\n"
            
            if result['errors']:
                report += "### Errors (Must Fix)\n"
                for error in result['errors']:
                    report += f"- {error}\n"
                report += "\n"
            
            if result['warnings']:
                report += "### Warnings (Should Fix)\n"
                for warning in result['warnings']:
                    report += f"- {warning}\n"
                report += "\n"
            
            if result['passed']:
                report += "### Passed Checks\n"
                for passed in result['passed']:
                    report += f"- {passed}\n"
                report += "\n"
            
            report += "---\n\n"
        
        # Recommendations
        report += "## Recommendations\n\n"
        if total_errors > 0:
            report += "1. **Fix all errors immediately** - These are critical for SEO\n"
        if total_warnings > 5:
            report += "2. **Address warnings** - These impact your SEO performance\n"
        report += "3. **Test with tools**:\n"
        report += "   - Google Search Console\n"
        report += "   - Facebook Sharing Debugger\n"
        report += "   - Twitter Card Validator\n"
        report += "4. **Monitor performance** with Google Analytics\n"
        
        return report

def main():
    """Main execution"""
    print("🔍 Meta Tag Validator for Fantdev Trading Bot")
    print("=" * 60)
    
    validator = MetaTagValidator()
    
    # HTML files to validate
    html_files = [
        'enhanced_customer_portal_integrated.html',
        'admin_portal_enhanced.html',
        'admin_dashboard_fixed.html',
        'index.html'
    ]
    
    results = []
    
    print("\n📋 Validating HTML files...\n")
    
    for filename in html_files:
        if os.path.exists(filename):
            print(f"Validating: {filename}")
            result = validator.validate_file(filename)
            results.append(result)
            
            # Print quick summary
            print(f"  Score: {result['score']}%")
            print(f"  Errors: {len(result['errors'])}, Warnings: {len(result['warnings'])}, Passed: {len(result['passed'])}")
        else:
            print(f"⚠️  Skipping {filename} (not found)")
    
    if results:
        # Generate and save report
        report = validator.generate_report(results)
        
        report_file = 'meta_validation_report.md'
        with open(report_file, 'w') as f:
            f.write(report)
        
        print(f"\n📄 Report saved to: {report_file}")
        
        # Print summary
        avg_score = sum(r['score'] for r in results) / len(results)
        print(f"\n✨ Overall SEO Score: {avg_score:.1f}%")
        
        if avg_score >= 90:
            print("🎉 Excellent SEO optimization!")
        elif avg_score >= 80:
            print("👍 Good SEO, minor improvements needed")
        elif avg_score >= 70:
            print("⚠️  SEO needs improvement")
        else:
            print("❌ Critical SEO issues detected")

if __name__ == "__main__":
    main()