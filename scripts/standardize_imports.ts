#!/usr/bin/env bun
/**
 * Import Standardization Script
 * Standardizes import patterns across TypeScript and Python files
 */

import { Glob } from 'bun';
import { join } from 'path';

interface ImportStandardizationResult {
  file: string;
  changes: string[];
  status: 'fixed' | 'no-changes' | 'error';
}

class ImportStandardizer {
  private results: ImportStandardizationResult[] = [];

  async standardizeTypeScriptImports(): Promise<void> {
    console.log('🔧 Standardizing TypeScript imports...');
    
    const tsFiles = new Glob('**/*.{ts,tsx}');
    for await (const filePath of tsFiles.scan('.')) {
      if (this.shouldSkipFile(filePath)) continue;
      
      try {
        await this.processTypeScriptFile(filePath);
      } catch (error) {
        this.results.push({
          file: filePath,
          changes: [],
          status: 'error'
        });
        console.error(`❌ Error processing ${filePath}:`, error);
      }
    }
  }

  private shouldSkipFile(filePath: string): boolean {
    return filePath.includes('node_modules') || 
           filePath.includes('dist') || 
           filePath.includes('backup') ||
           filePath.includes('coverage') ||
           filePath.includes('.git');
  }

  private async processTypeScriptFile(filePath: string): Promise<void> {
    const file = Bun.file(filePath);
    const content = await file.text();
    const originalContent = content;
    
    let modifiedContent = content;
    const changes: string[] = [];

    // 1. Standardize import grouping and ordering
    modifiedContent = this.standardizeImportOrder(modifiedContent, changes);
    
    // 2. Convert relative imports to use path aliases where appropriate
    modifiedContent = this.convertToPathAliases(modifiedContent, filePath, changes);
    
    // 3. Ensure consistent import syntax
    modifiedContent = this.standardizeImportSyntax(modifiedContent, changes);
    
    // 4. Remove unused imports (basic detection)
    modifiedContent = this.removeObviousUnusedImports(modifiedContent, changes);

    if (modifiedContent !== originalContent) {
      await Bun.write(filePath, modifiedContent);
      this.results.push({
        file: filePath,
        changes,
        status: 'fixed'
      });
      console.log(`✅ Fixed imports in ${filePath}`);
    } else {
      this.results.push({
        file: filePath,
        changes: [],
        status: 'no-changes'
      });
    }
  }

  private standardizeImportOrder(content: string, changes: string[]): string {
    const lines = content.split('\n');
    const imports: string[] = [];
    const nonImports: string[] = [];
    let inImportSection = true;

    for (const line of lines) {
      if (line.trim().startsWith('import ') || line.trim().startsWith('export ')) {
        if (inImportSection) {
          imports.push(line);
        } else {
          nonImports.push(line);
        }
      } else if (line.trim() === '') {
        if (inImportSection && imports.length > 0) {
          imports.push(line);
        } else {
          nonImports.push(line);
        }
      } else {
        inImportSection = false;
        nonImports.push(line);
      }
    }

    if (imports.length === 0) return content;

    // Sort imports by type
    const sortedImports = this.sortImports(imports);
    
    if (JSON.stringify(imports) !== JSON.stringify(sortedImports)) {
      changes.push('Reordered imports by type (React, external, internal, relative)');
    }

    return [...sortedImports, '', ...nonImports].join('\n');
  }

  private sortImports(imports: string[]): string[] {
    const reactImports: string[] = [];
    const externalImports: string[] = [];
    const internalImports: string[] = [];
    const relativeImports: string[] = [];
    const emptyLines: string[] = [];

    for (const imp of imports) {
      if (imp.trim() === '') {
        emptyLines.push(imp);
      } else if (imp.includes("'react'") || imp.includes('"react"')) {
        reactImports.push(imp);
      } else if (imp.includes("'@/") || imp.includes('"@/') || 
                 imp.includes("'@config") || imp.includes('"@config') ||
                 imp.includes("'@bot") || imp.includes('"@bot') ||
                 imp.includes("'@server") || imp.includes('"@server') ||
                 imp.includes("'@web") || imp.includes('"@web')) {
        internalImports.push(imp);
      } else if (imp.includes("'./") || imp.includes('"./') || 
                 imp.includes("'../") || imp.includes('"../')) {
        relativeImports.push(imp);
      } else {
        externalImports.push(imp);
      }
    }

    const result: string[] = [];
    if (reactImports.length > 0) {
      result.push(...reactImports.sort());
      if (externalImports.length > 0 || internalImports.length > 0 || relativeImports.length > 0) {
        result.push('');
      }
    }
    if (externalImports.length > 0) {
      result.push(...externalImports.sort());
      if (internalImports.length > 0 || relativeImports.length > 0) {
        result.push('');
      }
    }
    if (internalImports.length > 0) {
      result.push(...internalImports.sort());
      if (relativeImports.length > 0) {
        result.push('');
      }
    }
    if (relativeImports.length > 0) {
      result.push(...relativeImports.sort());
    }

    return result;
  }

  private convertToPathAliases(content: string, filePath: string, changes: string[]): string {
    // Convert common relative imports to path aliases
    const pathMappings = [
      { from: /from ['"]\.\.\/\.\.\/config\//g, to: "from '@config/" },
      { from: /from ['"]\.\.\/\.\.\/bot\//g, to: "from '@bot/" },
      { from: /from ['"]\.\.\/\.\.\/server\//g, to: "from '@server/" },
      { from: /from ['"]\.\.\/\.\.\/web\//g, to: "from '@web/" },
      { from: /from ['"]\.\.\/\.\.\/shared\//g, to: "from '@shared/" },
      { from: /from ['"]\.\.\/\.\.\/api\//g, to: "from '@api/" },
      { from: /from ['"]\.\.\/\.\.\/components\//g, to: "from '@components/" },
    ];

    let modified = content;
    for (const mapping of pathMappings) {
      const before = modified;
      modified = modified.replace(mapping.from, mapping.to);
      if (modified !== before) {
        changes.push(`Converted relative imports to path aliases`);
      }
    }

    return modified;
  }

  private standardizeImportSyntax(content: string, changes: string[]): string {
    let modified = content;
    
    // Ensure consistent quote style (prefer single quotes)
    const doubleQuoteImports = /import\s+.*from\s+"([^"]+)"/g;
    if (doubleQuoteImports.test(content)) {
      modified = modified.replace(doubleQuoteImports, (match, path) => {
        return match.replace(`"${path}"`, `'${path}'`);
      });
      changes.push('Standardized import quotes to single quotes');
    }

    return modified;
  }

  private removeObviousUnusedImports(content: string, changes: string[]): string {
    // This is a basic implementation - for production, use a proper AST parser
    const lines = content.split('\n');
    const filteredLines: string[] = [];
    let removedCount = 0;

    for (const line of lines) {
      if (line.trim().startsWith('import ') && line.includes(' from ')) {
        // Extract imported names
        const importMatch = line.match(/import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from/);
        if (importMatch) {
          const importedNames = importMatch[1] ? 
            importMatch[1].split(',').map(name => name.trim()) : 
            [importMatch[2] || importMatch[3]];
          
          // Check if any imported name is used in the file
          const isUsed = importedNames.some(name => {
            const cleanName = name.replace(/\s+as\s+\w+/, '').trim();
            return content.includes(cleanName) && 
                   content.split('\n').slice(1).some(l => l.includes(cleanName));
          });

          if (isUsed) {
            filteredLines.push(line);
          } else {
            removedCount++;
          }
        } else {
          filteredLines.push(line);
        }
      } else {
        filteredLines.push(line);
      }
    }

    if (removedCount > 0) {
      changes.push(`Removed ${removedCount} unused imports`);
    }

    return filteredLines.join('\n');
  }

  async generateReport(): Promise<void> {
    console.log('\n📊 Import Standardization Report');
    console.log('================================');
    
    const fixed = this.results.filter(r => r.status === 'fixed');
    const noChanges = this.results.filter(r => r.status === 'no-changes');
    const errors = this.results.filter(r => r.status === 'error');

    console.log(`✅ Fixed: ${fixed.length} files`);
    console.log(`⏭️  No changes: ${noChanges.length} files`);
    console.log(`❌ Errors: ${errors.length} files`);

    if (fixed.length > 0) {
      console.log('\n🔧 Files with changes:');
      for (const result of fixed) {
        console.log(`  ${result.file}`);
        for (const change of result.changes) {
          console.log(`    - ${change}`);
        }
      }
    }

    if (errors.length > 0) {
      console.log('\n❌ Files with errors:');
      for (const result of errors) {
        console.log(`  ${result.file}`);
      }
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting import standardization...\n');
  
  const standardizer = new ImportStandardizer();
  
  try {
    await standardizer.standardizeTypeScriptImports();
    await standardizer.generateReport();
    
    console.log('\n✅ Import standardization complete!');
  } catch (error) {
    console.error('❌ Import standardization failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
