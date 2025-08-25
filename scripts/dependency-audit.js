#!/usr/bin/env bun
/**
 * Dependency Audit Script
 * Finds unused dependencies and dead code
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

/**
 * Recursively collects source files under the given directory.
 *
 * Traverses `dir` synchronously, skipping directories whose names include
 * `node_modules`, `.git`, or `dist`, and returns paths for files with
 * extensions `.ts`, `.tsx`, `.js`, or `.jsx`.
 *
 * @param {string} dir - Directory path to scan.
 * @param {string[]} [fileList=[]] - Accumulator for found file paths; used for recursion.
 * @returns {string[]} Array of matching file paths.
 */
function getAllFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        getAllFiles(filePath, fileList);
      }
    } else if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(file))) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

/**
 * Return whether a dependency appears to be referenced in the given files.
 *
 * Scans each file's contents for common import/require/usage patterns that mention `depName` (e.g. `from "dep"`, `require("dep")`, or inline `import` occurrences). Files should be provided as an array of file paths; the function returns true on the first match and false if no matches are found.
 *
 * @param {string} depName - The package name to search for.
 * @param {string[]} files - Array of file paths to scan.
 * @return {boolean} True if any file contains a matching import/require usage of `depName`, otherwise false.
 */
function isDependencyUsed(depName, files) {
  const importPatterns = [
    `from ['"]${depName}`,
    `require\\(['"]${depName}`,
    `import\\s+${depName}`,
    `import.*${depName}`
  ];
  
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    for (const pattern of importPatterns) {
      if (new RegExp(pattern).test(content)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Audit project dependencies and scan source files for common dead-code patterns.
 *
 * Reads package.json to collect dependencies (including devDependencies), gathers project files
 * (src, tests, scripts, and existing config files), and determines which dependencies are likely unused
 * by searching for import/require patterns. Skips common tooling and `@types/*` packages. Prints a summary
 * of used vs. potentially unused dependencies and a suggested `bun remove` command for removals.
 *
 * Additionally scans source files for several dead-code patterns (unused exports, console calls, TODOs,
 * commented-out code, empty catch blocks, unused variables) and reports per-file findings and totals.
 *
 * @returns {Promise<void>} Resolves when the audit and reporting complete.
 */
async function auditDependencies() {
  console.log('🔍 Starting Dependency Audit...\n');
  
  // Read package.json
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  // Get all source files
  const sourceFiles = getAllFiles('src');
  const testFiles = getAllFiles('tests');
  const scriptFiles = getAllFiles('scripts');
  const configFiles = [
    'eslint.config.js',
    'bunfig.toml',
    'tsconfig.json',
    'tailwind.config.js',
    'vite.config.js'
  ].filter(f => {
    try {
      statSync(f);
      return true;
    } catch {
      return false;
    }
  });
  
  const allFiles = [...sourceFiles, ...testFiles, ...scriptFiles, ...configFiles];
  
  console.log(`📁 Analyzing ${allFiles.length} files...\n`);
  
  const unusedDeps = [];
  const usedDeps = [];
  
  // Check each dependency
  for (const [dep, version] of Object.entries(allDeps)) {
    // Skip type definitions and build tools
    if (dep.startsWith('@types/') || 
        dep === 'typescript' || 
        dep === 'bun-types' ||
        dep === 'husky' ||
        dep === 'prettier' ||
        dep === 'eslint') {
      usedDeps.push(dep);
      continue;
    }
    
    const isUsed = isDependencyUsed(dep, allFiles);
    
    if (isUsed) {
      usedDeps.push(dep);
    } else {
      unusedDeps.push({ name: dep, version });
    }
  }
  
  // Report results
  console.log('📊 Audit Results:\n');
  console.log(`✅ Used Dependencies: ${usedDeps.length}`);
  console.log(`❌ Potentially Unused: ${unusedDeps.length}\n`);
  
  if (unusedDeps.length > 0) {
    console.log('🗑️  Potentially Unused Dependencies:');
    for (const dep of unusedDeps) {
      console.log(`   - ${dep.name} (${dep.version})`);
    }
    
    console.log('\n💡 To remove unused dependencies:');
    console.log(`   bun remove ${unusedDeps.map(d => d.name).join(' ')}`);
  }
  
  // Find dead code patterns
  console.log('\n🔍 Checking for Dead Code Patterns...\n');
  
  const deadCodePatterns = {
    'Unused exports': /export\s+(?:function|const|class)\s+(\w+)/g,
    'Console logs': /console\.(log|error|warn|debug)/g,
    'TODO comments': /\/\/\s*TODO|\/\*\s*TODO/gi,
    'Commented code': /^\s*\/\/.+[{};]$/gm,
    'Empty catch blocks': /catch\s*\([^)]*\)\s*{\s*}/g,
    'Unused variables': /(?:const|let|var)\s+(\w+)\s*=.*;\s*$/gm
  };
  
  const deadCodeReport = {};
  
  for (const file of sourceFiles) {
    const content = readFileSync(file, 'utf-8');
    const issues = [];
    
    for (const [pattern, regex] of Object.entries(deadCodePatterns)) {
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        issues.push({
          type: pattern,
          count: matches.length
        });
      }
    }
    
    if (issues.length > 0) {
      deadCodeReport[file] = issues;
    }
  }
  
  // Report dead code
  const filesWithIssues = Object.keys(deadCodeReport).length;
  if (filesWithIssues > 0) {
    console.log(`⚠️  Found potential dead code in ${filesWithIssues} files:\n`);
    
    let totalIssues = 0;
    for (const [file, issues] of Object.entries(deadCodeReport).slice(0, 10)) {
      console.log(`   ${file.replace(process.cwd(), '.')}`);
      for (const issue of issues) {
        console.log(`     - ${issue.type}: ${issue.count} instances`);
        totalIssues += issue.count;
      }
    }
    
    console.log(`\n   Total: ${totalIssues} potential issues`);
  }
  
  console.log('\n✨ Audit Complete!');
}

// Run audit
auditDependencies().catch(console.error);