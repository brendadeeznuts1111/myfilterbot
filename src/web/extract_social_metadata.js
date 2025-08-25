#!/usr/bin/env node
/**
 * Social Metadata Extractor
 * Extracts Open Graph, Twitter Card, and fallback meta tags from HTML files
 * Compatible with Node.js for broader compatibility
 */

const fs = require('fs').promises;
const path = require('path');

class SocialMetadataExtractor {
    constructor() {
        this.metadata = {};
    }

    /**
     * Extract metadata from HTML content
     * @param {string} htmlContent - The HTML content to parse
     * @param {string} baseUrl - Base URL for resolving relative URLs
     * @returns {Object} Extracted social metadata
     */
    extractFromHtml(htmlContent, baseUrl = 'https://fantdev.trading') {
        const metadata = {
            openGraph: {},
            twitterCard: {},
            standard: {},
            structuredData: null,
            images: []
        };

        // Extract Open Graph meta tags
        const ogPattern = /<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']+)["']/gi;
        let match;
        while ((match = ogPattern.exec(htmlContent)) !== null) {
            const property = match[1];
            const content = match[2];
            metadata.openGraph[property] = content;
            
            // Collect image URLs
            if (property === 'image' || property.startsWith('image:')) {
                metadata.images.push({
                    type: 'opengraph',
                    url: this.resolveUrl(content, baseUrl),
                    property: `og:${property}`
                });
            }
        }

        // Extract Twitter Card meta tags
        const twitterPattern = /<meta\s+name=["']twitter:([^"']+)["']\s+content=["']([^"']+)["']/gi;
        while ((match = twitterPattern.exec(htmlContent)) !== null) {
            const name = match[1];
            const content = match[2];
            metadata.twitterCard[name] = content;
            
            // Collect Twitter image URLs
            if (name === 'image') {
                metadata.images.push({
                    type: 'twitter',
                    url: this.resolveUrl(content, baseUrl),
                    property: `twitter:${name}`
                });
            }
        }

        // Extract standard meta tags
        const standardMetaPattern = /<meta\s+name=["'](description|keywords|author|title)["']\s+content=["']([^"']+)["']/gi;
        while ((match = standardMetaPattern.exec(htmlContent)) !== null) {
            metadata.standard[match[1]] = match[2];
        }

        // Extract title tag
        const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
            metadata.standard.title = titleMatch[1];
        }

        // Extract canonical URL
        const canonicalMatch = htmlContent.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
        if (canonicalMatch) {
            metadata.standard.canonical = canonicalMatch[1];
        }

        // Extract structured data (JSON-LD)
        const jsonLdPattern = /<script\s+type=["']application\/ld\+json["']>([^<]+)<\/script>/gi;
        const jsonLdMatches = [];
        while ((match = jsonLdPattern.exec(htmlContent)) !== null) {
            try {
                const jsonData = JSON.parse(match[1]);
                jsonLdMatches.push(jsonData);
                
                // Extract images from structured data
                if (jsonData.image) {
                    metadata.images.push({
                        type: 'structured_data',
                        url: this.resolveUrl(jsonData.image, baseUrl),
                        property: 'schema.org:image'
                    });
                }
                if (jsonData.screenshot) {
                    metadata.images.push({
                        type: 'structured_data',
                        url: this.resolveUrl(jsonData.screenshot, baseUrl),
                        property: 'schema.org:screenshot'
                    });
                }
            } catch (e) {
                console.error('Failed to parse JSON-LD:', e.message);
            }
        }
        if (jsonLdMatches.length > 0) {
            metadata.structuredData = jsonLdMatches;
        }

        // Extract favicon and apple-touch-icon
        const faviconMatch = htmlContent.match(/<link\s+rel=["']icon["'][^>]+href=["']([^"']+)["']/i);
        if (faviconMatch) {
            metadata.images.push({
                type: 'favicon',
                url: this.resolveUrl(faviconMatch[1], baseUrl),
                property: 'favicon'
            });
        }

        const appleTouchMatch = htmlContent.match(/<link\s+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i);
        if (appleTouchMatch) {
            metadata.images.push({
                type: 'apple-touch-icon',
                url: this.resolveUrl(appleTouchMatch[1], baseUrl),
                property: 'apple-touch-icon'
            });
        }

        return metadata;
    }

    /**
     * Resolve relative URLs to absolute
     * @param {string} url - URL to resolve
     * @param {string} baseUrl - Base URL
     * @returns {string} Absolute URL
     */
    resolveUrl(url, baseUrl) {
        if (!url) return url;
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        if (url.startsWith('//')) {
            return 'https:' + url;
        }
        if (url.startsWith('/')) {
            const base = new URL(baseUrl);
            return `${base.protocol}//${base.host}${url}`;
        }
        return new URL(url, baseUrl).href;
    }

    /**
     * Create a summary of the extracted metadata
     * @param {Object} metadata - Extracted metadata
     * @returns {Object} Summary object
     */
    createSummary(metadata) {
        return {
            title: metadata.openGraph.title || metadata.twitterCard.title || metadata.standard.title,
            description: metadata.openGraph.description || metadata.twitterCard.description || metadata.standard.description,
            image: metadata.openGraph.image || metadata.twitterCard.image || (metadata.images[0] && metadata.images[0].url),
            url: metadata.openGraph.url || metadata.standard.canonical,
            siteName: metadata.openGraph.site_name || metadata.openGraph['site_name'],
            type: metadata.openGraph.type,
            author: metadata.standard.author,
            keywords: metadata.standard.keywords,
            twitterSite: metadata.twitterCard.site,
            imageCount: metadata.images.length,
            hasStructuredData: !!metadata.structuredData
        };
    }

    /**
     * Process a single HTML file
     * @param {string} filePath - Path to HTML file
     * @returns {Object} Extracted metadata and summary
     */
    async processFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const metadata = this.extractFromHtml(content);
            const summary = this.createSummary(metadata);
            
            return {
                file: path.basename(filePath),
                path: filePath,
                metadata,
                summary
            };
        } catch (error) {
            console.error(`Error processing ${filePath}:`, error.message);
            return null;
        }
    }

    /**
     * Generate a report of all social metadata
     * @param {Array} results - Array of processed file results
     * @returns {string} Formatted report
     */
    generateReport(results) {
        let report = '# Social Metadata Extraction Report\n\n';
        report += `Generated: ${new Date().toISOString()}\n\n`;
        report += '---\n\n';

        for (const result of results) {
            if (!result) continue;

            report += `## ${result.file}\n\n`;
            report += '### Summary\n';
            report += `- **Title**: ${result.summary.title || 'Not set'}\n`;
            report += `- **Description**: ${result.summary.description || 'Not set'}\n`;
            report += `- **Main Image**: ${result.summary.image || 'Not set'}\n`;
            report += `- **URL**: ${result.summary.url || 'Not set'}\n`;
            report += `- **Site Name**: ${result.summary.siteName || 'Not set'}\n`;
            report += `- **Type**: ${result.summary.type || 'Not set'}\n`;
            report += `- **Author**: ${result.summary.author || 'Not set'}\n`;
            report += `- **Twitter Site**: ${result.summary.twitterSite || 'Not set'}\n`;
            report += `- **Total Images Found**: ${result.summary.imageCount}\n`;
            report += `- **Has Structured Data**: ${result.summary.hasStructuredData ? 'Yes' : 'No'}\n\n`;

            if (Object.keys(result.metadata.openGraph).length > 0) {
                report += '### Open Graph Tags\n';
                report += '```json\n';
                report += JSON.stringify(result.metadata.openGraph, null, 2);
                report += '\n```\n\n';
            }

            if (Object.keys(result.metadata.twitterCard).length > 0) {
                report += '### Twitter Card Tags\n';
                report += '```json\n';
                report += JSON.stringify(result.metadata.twitterCard, null, 2);
                report += '\n```\n\n';
            }

            if (result.metadata.images.length > 0) {
                report += '### All Images\n';
                for (const img of result.metadata.images) {
                    report += `- **${img.type}** (${img.property}): ${img.url}\n`;
                }
                report += '\n';
            }

            if (result.metadata.structuredData) {
                report += '### Structured Data (JSON-LD)\n';
                report += '```json\n';
                report += JSON.stringify(result.metadata.structuredData, null, 2);
                report += '\n```\n\n';
            }

            report += '---\n\n';
        }

        return report;
    }
}

// Main execution
async function main() {
    const extractor = new SocialMetadataExtractor();
    
    // Define HTML files to process
    const htmlFiles = [
        'enhanced_customer_portal_integrated.html',
        'admin_portal_enhanced.html',
        'admin_dashboard_fixed.html',
        'index.html'
    ];

    console.log('🔍 Extracting social metadata from HTML files...\n');

    const results = [];
    for (const file of htmlFiles) {
        const filePath = path.join(__dirname, file);
        
        // Check if file exists
        try {
            await fs.access(filePath);
            console.log(`Processing: ${file}`);
            const result = await extractor.processFile(filePath);
            if (result) {
                results.push(result);
                console.log(`✅ Extracted metadata from ${file}`);
                console.log(`   - Title: ${result.summary.title}`);
                console.log(`   - Images found: ${result.summary.imageCount}`);
            }
        } catch (error) {
            console.log(`⚠️  Skipping ${file} (file not found)`);
        }
    }

    // Generate and save report
    if (results.length > 0) {
        const report = extractor.generateReport(results);
        const reportPath = path.join(__dirname, 'social_metadata_report.md');
        await fs.writeFile(reportPath, report);
        console.log(`\n📄 Report saved to: ${reportPath}`);

        // Also save JSON format for programmatic use
        const jsonPath = path.join(__dirname, 'social_metadata.json');
        await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
        console.log(`📊 JSON data saved to: ${jsonPath}`);

        // Print summary
        console.log('\n📊 Summary:');
        console.log(`- Files processed: ${results.length}`);
        console.log(`- Total images found: ${results.reduce((sum, r) => sum + r.summary.imageCount, 0)}`);
        console.log(`- Files with structured data: ${results.filter(r => r.summary.hasStructuredData).length}`);
    } else {
        console.log('\n❌ No files were processed successfully.');
    }
}

// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}

// Export for use as module
module.exports = { SocialMetadataExtractor };